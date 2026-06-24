/**
 * Website-Audit Worker
 * ─────────────────────────────────────────────────────────────
 * Berechnet Pain-Score (0–100, je niedriger = mehr Hebel zum Verkauf)
 * für eine Handwerker-Website. Quellen:
 *
 *   1. Google PageSpeed Insights API (kostenlos, Key empfohlen)
 *   2. Roher HTTP-HEAD/GET-Check (gratis): HTTPS, Viewport, Impressum,
 *      Booking-CTA, Footer-Jahr, WordPress-Version, Mailto-Link
 *
 * Output: strukturiertes AuditResult + automatischer Cold-Call-Hook.
 */

import { detectBuilderSubdomain } from "@/lib/finder/builderSubdomain";
import { runSeoChecks, type SeoReport } from "./seo";
import { getTradeCard, fillTradeHook } from "@/lib/souffleur/tradePlaybook";

export interface AuditResult {
  websiteUrl: string;
  mobileScore: number | null;
  desktopScore: number | null;
  lcpMs: number | null;
  clsScore: number | null;
  hasHttps: boolean;
  hasImpressum: boolean;
  hasViewport: boolean;
  hasBookingCta: boolean;
  hasMailto: boolean;
  copyrightYear: number | null;
  techStack: string[];
  // Volle Lighthouse-Kategorien (mobil) — 0–100 oder null ohne Messung.
  lighthouse: LighthouseScores | null;
  // Deterministischer On-Page-SEO-Report (regelbasiert, kein KI).
  seo: SeoReport;
  painScore: number; // 0–100, niedriger = besser für uns als Verkäufer
  hookText: string;
  flags: string[];
}

const PAGESPEED_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runAudit(
  rawUrl: string,
  apiKey?: string,
  meta?: { trade?: string | null; city?: string | null; contactName?: string | null },
): Promise<AuditResult> {
  const websiteUrl = normalize(rawUrl);

  // ── 1. PageSpeed mobile + desktop + HTML + Site-Dateien (parallel) ─
  const [mobile, desktop, html, siteFiles] = await Promise.all([
    fetchPagespeed(websiteUrl, "mobile", apiKey).catch(() => null),
    fetchPagespeed(websiteUrl, "desktop", apiKey).catch(() => null),
    fetchHtml(websiteUrl).catch(() => null),
    fetchSiteFiles(websiteUrl).catch(() => null),
  ]);

  const mobileScore = mobile?.score ?? null;
  const desktopScore = desktop?.score ?? null;
  const lcpMs = mobile?.lcpMs ?? null;
  const clsScore = mobile?.cls ?? null;
  const lighthouse: LighthouseScores | null = mobile
    ? {
        performance: mobile.performance,
        accessibility: mobile.accessibility,
        bestPractices: mobile.bestPractices,
        seo: mobile.seo,
      }
    : null;

  // ── 2. HTML-basierte Checks ───────────────────────────────────
  const hasHttps = websiteUrl.startsWith("https://");
  const htmlAvailable = html !== null;
  const lowerHtml = html?.toLowerCase() ?? "";
  const hasImpressum = /impressum|imprint/.test(lowerHtml);
  // Attribut-reihenfolge-tolerant: name=viewport irgendwo im <meta>-Tag
  const hasViewport = /<meta\b[^>]*\bname=["']?viewport["']?/i.test(html ?? "");
  const hasBookingCta =
    /(termin|booking|calendly|cal\.com|jetzt buchen|anfragen)/i.test(lowerHtml);
  const hasMailto = /mailto:/i.test(lowerHtml);
  const copyrightYear = extractFooterYear(html);
  const techStack = detectTechStack(html);
  const builderSubdomain = detectBuilderSubdomain(websiteUrl);

  // ── 3. Pain-Score & Flags ─────────────────────────────────────
  const flags: string[] = [];
  let pain = 100;

  // Gratis-Baukasten-Adresse = sehr starkes Verkaufssignal.
  if (builderSubdomain) {
    pain -= 20;
    flags.push(`builder_subdomain:${builderSubdomain}`);
  }

  if (mobileScore !== null) {
    if (mobileScore < 50) {
      pain -= 25;
      flags.push(`mobile_score_low:${mobileScore}`);
    } else if (mobileScore < 70) {
      pain -= 15;
    }
  }

  if (lcpMs !== null && lcpMs > 4000) {
    pain -= 10;
    flags.push(`lcp_slow:${(lcpMs / 1000).toFixed(1)}s`);
  }

  if (!hasHttps) {
    pain -= 15;
    flags.push("no_https");
  }
  // HTML-abhängige Flags nur setzen, wenn HTML wirklich geladen wurde —
  // sonst meldet der Auto-Hook "Impressum fehlt", obwohl wir es nie gesehen haben.
  if (htmlAvailable) {
    if (!hasImpressum) {
      pain -= 15;
      flags.push("no_impressum");
    }
    if (!hasViewport) {
      pain -= 10;
      flags.push("no_viewport");
    }
    if (!hasBookingCta) {
      pain -= 8;
      flags.push("no_booking_cta");
    }
  } else {
    pain -= 10;
    flags.push("fetch_failed");
  }
  if (copyrightYear !== null && copyrightYear < 2023) {
    pain -= 10;
    flags.push(`old_copyright:${copyrightYear}`);
  }
  if (techStack.includes("WordPress (outdated)")) {
    pain -= 7;
    flags.push("wordpress_outdated");
  }

  pain = Math.max(0, Math.min(100, pain));

  // ── 3b. Deterministischer SEO-Report (regelbasiert) ───────────
  const seo = runSeoChecks(html, {
    url: websiteUrl,
    hasHttps,
    robotsTxt: siteFiles?.robotsTxt ?? null,
    sitemapReachable: siteFiles?.sitemapReachable ?? null,
  });

  // ── 4. Auto-Hook ──────────────────────────────────────────────
  // Konkreter SEO-Fallback: der schwerwiegendste SEO-Fail als Aufhänger,
  // falls kein stärkeres Signal (Baukasten/HTTPS/langsam …) greift.
  const topSeoFail = seo.checks.find(
    (c) => c.status === "fail" && !["https", "robots_meta", "reachable"].includes(c.id),
  );
  const seoFallback = topSeoFail
    ? `Mir ist an Ihrer Website etwas aufgefallen: ${topSeoFail.detail} Bei Google kostet Sie das Anfragen — hätten Sie 60 Sekunden?`
    : null;

  const hookText = buildHook({
    flags,
    mobileScore,
    lcpMs,
    copyrightYear,
    trade: meta?.trade,
    city: meta?.city,
    contactName: meta?.contactName,
    seoFallback,
  });

  return {
    websiteUrl,
    mobileScore,
    desktopScore,
    lcpMs,
    clsScore,
    hasHttps,
    hasImpressum,
    hasViewport,
    hasBookingCta,
    hasMailto,
    copyrightYear,
    techStack,
    lighthouse,
    seo,
    painScore: pain,
    hookText,
    flags,
  };
}

// ─── PageSpeed Insights / Lighthouse ─────────────────────────────

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

interface PagespeedResult extends LighthouseScores {
  // Rückwärtskompatibel: score == performance (für die DB-Spalten/alte UI).
  score: number;
  lcpMs: number;
  cls: number;
  fcpMs: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
}

/** category.score von Lighthouse ist 0–1 oder null → 0–100 oder null. */
function pct(score: number | null | undefined): number | null {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

async function fetchPagespeed(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey?: string,
): Promise<PagespeedResult> {
  // Alle vier Lighthouse-Kategorien in EINEM Lauf abfragen.
  const params = new URLSearchParams({ url, strategy });
  for (const c of ["performance", "accessibility", "best-practices", "seo"]) {
    params.append("category", c);
  }
  if (apiKey) params.append("key", apiKey);

  const res = await fetch(`${PAGESPEED_URL}?${params}`, {
    headers: { "User-Agent": "aw-digital-os/0.1" },
  });
  if (!res.ok) throw new Error(`PageSpeed ${strategy} ${res.status}`);

  const data = (await res.json()) as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<string, { numericValue?: number; score?: number }>;
    };
  };

  const cats = data.lighthouseResult?.categories ?? {};
  const audits = data.lighthouseResult?.audits ?? {};
  const num = (id: string) => {
    const v = audits[id]?.numericValue;
    return typeof v === "number" ? Math.round(v) : null;
  };

  const performance = pct(cats["performance"]?.score);

  return {
    performance,
    accessibility: pct(cats["accessibility"]?.score),
    bestPractices: pct(cats["best-practices"]?.score),
    seo: pct(cats["seo"]?.score),
    score: performance ?? 0,
    lcpMs: num("largest-contentful-paint") ?? 0,
    cls: Number(
      (audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3),
    ),
    fcpMs: num("first-contentful-paint"),
    tbtMs: num("total-blocking-time"),
    speedIndexMs: num("speed-index"),
  };
}

// ─── robots.txt + sitemap.xml (deterministisch) ──────────────────

async function fetchSiteFiles(websiteUrl: string): Promise<{
  robotsTxt: { reachable: boolean; blocksAll: boolean; sitemapRef: boolean };
  sitemapReachable: boolean;
}> {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return {
      robotsTxt: { reachable: false, blocksAll: false, sitemapRef: false },
      sitemapReachable: false,
    };
  }

  const get = async (path: string): Promise<string | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(origin + path, {
        headers: { "User-Agent": "AW-Digital-Audit/0.1" },
        signal: ctrl.signal,
      });
      return res.ok ? await res.text() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const [robots, sitemap] = await Promise.all([
    get("/robots.txt"),
    get("/sitemap.xml"),
  ]);

  const robotsTxt = {
    reachable: robots !== null,
    blocksAll:
      robots !== null &&
      /user-agent:\s*\*/i.test(robots) &&
      /^\s*disallow:\s*\/\s*$/im.test(robots),
    sitemapRef: robots !== null && /^\s*sitemap:\s*\S+/im.test(robots),
  };
  const sitemapReachable =
    sitemap !== null && /<(urlset|sitemapindex)\b/i.test(sitemap);

  return { robotsTxt, sitemapReachable };
}

// ─── HTML fetch + lightweight parsers ────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AW-Digital-Audit/0.1; +https://awdigital.de/audit)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTML ${res.status}`);
  return res.text();
}

function extractFooterYear(html: string | null): number | null {
  if (!html) return null;
  // Nur den echten <footer>-Bereich auswerten, falls vorhanden — sonst matcht
  // ein „© Adobe Stock 2018" in Bild-Credits und liefert ein falsches Jahr.
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  const scope = footerMatch ? footerMatch[0] : html;
  // Bei "© 2009 - 2026" das HÖCHSTE Jahr nehmen, nicht das erste.
  const contexts = scope.match(/(?:©|&copy;|copyright)[^<]{0,80}/gi) ?? [];
  const years: number[] = [];
  for (const ctx of contexts) {
    // Stock-/Foto-Credits ausschließen — sagen nichts über die Aktualität.
    if (/stock|getty|adobe|unsplash|shutterstock|istock|pexels|foto:|photo:|bild:/i.test(ctx))
      continue;
    for (const m of ctx.matchAll(/\b(?:19|20)\d{2}\b/g)) {
      years.push(parseInt(m[0], 10));
    }
  }
  return years.length ? Math.max(...years) : null;
}

function detectTechStack(html: string | null): string[] {
  if (!html) return [];
  const stack: string[] = [];

  if (/wp-content|wordpress/i.test(html)) {
    const ver = html.match(/wordpress\s*([\d.]+)/i)?.[1];
    if (ver) {
      const [major, minor] = ver.split(".").map(Number);
      const outdated = major < 6 || (major === 6 && minor < 4);
      stack.push(outdated ? "WordPress (outdated)" : `WordPress ${ver}`);
    } else {
      stack.push("WordPress");
    }
  }
  if (/wix\.com|x-wix/i.test(html)) stack.push("Wix");
  if (/squarespace/i.test(html)) stack.push("Squarespace");
  if (/jimdo/i.test(html)) stack.push("Jimdo");
  if (/typo3/i.test(html)) stack.push("TYPO3");
  if (/joomla/i.test(html)) stack.push("Joomla");
  if (/next\/_next|__next_data__/i.test(html)) stack.push("Next.js");
  if (/_astro\//i.test(html)) stack.push("Astro");

  return stack;
}

// ─── Cold-Call-Hook generator ────────────────────────────────────

function buildHook(input: {
  flags: string[];
  mobileScore: number | null;
  lcpMs: number | null;
  copyrightYear: number | null;
  trade?: string | null;
  city?: string | null;
  contactName?: string | null;
  seoFallback?: string | null;
}): string {
  const {
    flags,
    mobileScore,
    lcpMs,
    copyrightYear,
    trade,
    city,
    contactName,
    seoFallback,
  } = input;

  const builder = flags
    .find((f) => f.startsWith("builder_subdomain:"))
    ?.slice("builder_subdomain:".length);
  if (builder) {
    return `Ihre Website läuft auf einer Gratis-Adresse von ${builder} — das sieht jeder Kunde sofort an der Internetadresse und wirkt schnell unseriös. Mit einer eigenen Domain gewinnen Sie da direkt Vertrauen.`;
  }
  if (flags.includes("no_https")) {
    return "Mir ist aufgefallen, dass Ihre Website noch ohne SSL läuft — Google warnt Besucher inzwischen aktiv vor solchen Seiten.";
  }
  if (flags.includes("fetch_failed")) {
    return "Ich wollte mir kurz Ihre Website anschauen, aber sie war für mich nicht erreichbar — wenn das bei Kunden auch passiert, ist das ein Thema. Hätten Sie 90 Sekunden?";
  }
  if (flags.includes("no_impressum")) {
    return "Mir ist aufgefallen, dass auf Ihrer Website das Impressum fehlt — das ist in Deutschland abmahnfähig.";
  }

  // ── Branchen-/ortsscharfer Hook (statt generischem Tech-Satz) ──
  // Nutzt die gewerksspezifischen auditHooks NUR bei echtem Datensignal
  // (langsam / nicht mobil) — die Stadt wird eingesetzt.
  const card = trade ? getTradeCard(trade) : null;
  if (card) {
    const fill = (s: string) => fillTradeHook(s, contactName, city);
    if (lcpMs !== null && lcpMs > 4500) return fill(card.auditHooks.slow);
    if (flags.includes("no_viewport")) return fill(card.auditHooks.noMobile);
    if (mobileScore !== null && mobileScore < 50)
      return fill(card.auditHooks.slow);
  }

  if (lcpMs && lcpMs > 5000) {
    return `Ihre Website lädt auf dem Handy ${(lcpMs / 1000).toFixed(1)} Sekunden — drei Viertel Ihrer Besucher springen vorher ab.`;
  }
  if (mobileScore !== null && mobileScore < 50) {
    return `Ihre Website hat einen Google-Mobile-Score von ${mobileScore}/100 — bei der Hälfte Ihrer potentiellen Kunden ranken Sie damit nicht.`;
  }
  if (copyrightYear && copyrightYear < 2022) {
    return `Im Footer Ihrer Website steht noch ${copyrightYear} — wirkt nach außen, als wäre der Betrieb nicht mehr aktiv.`;
  }
  if (flags.includes("no_booking_cta")) {
    return "Auf Ihrer Website gibt es keinen direkten Termin-Button — jeder Anruf, den Sie verpassen, geht zur Konkurrenz.";
  }
  return (
    seoFallback ??
    "Ich habe Ihre Website kurz analysiert — hätten Sie 90 Sekunden für die zwei größten Fundstücke?"
  );
}

function normalize(url: string): string {
  const trimmed = url.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Ungültige URL");
  }
  // SSRF-Schutz: nur http/https, keine internen/Loopback/Link-Local/Private-IP-
  // Ziele und keine schemalosen internen Hostnamen (ohne Punkt = keine TLD).
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Nur http/https erlaubt");
  }
  const host = parsed.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("[") || // IPv6-Literale (ULA/link-local) konservativ blocken
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    !host.includes("."); // interner Kurz-Hostname ohne Domain
  if (blocked) {
    throw new Error("Interne/private Adressen sind nicht erlaubt");
  }
  return withScheme;
}
