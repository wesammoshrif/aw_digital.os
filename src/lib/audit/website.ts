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
  painScore: number; // 0–100, niedriger = besser für uns als Verkäufer
  hookText: string;
  flags: string[];
}

const PAGESPEED_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runAudit(
  rawUrl: string,
  apiKey?: string,
): Promise<AuditResult> {
  const websiteUrl = normalize(rawUrl);

  // ── 1. PageSpeed mobile + desktop (parallel) ──────────────────
  const [mobile, desktop, html] = await Promise.all([
    fetchPagespeed(websiteUrl, "mobile", apiKey).catch(() => null),
    fetchPagespeed(websiteUrl, "desktop", apiKey).catch(() => null),
    fetchHtml(websiteUrl).catch(() => null),
  ]);

  const mobileScore = mobile?.score ?? null;
  const desktopScore = desktop?.score ?? null;
  const lcpMs = mobile?.lcpMs ?? null;
  const clsScore = mobile?.cls ?? null;

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

  // ── 3. Pain-Score & Flags ─────────────────────────────────────
  const flags: string[] = [];
  let pain = 100;

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

  // ── 4. Auto-Hook ──────────────────────────────────────────────
  const hookText = buildHook({
    flags,
    mobileScore,
    lcpMs,
    copyrightYear,
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
    painScore: pain,
    hookText,
    flags,
  };
}

// ─── PageSpeed Insights ──────────────────────────────────────────

async function fetchPagespeed(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey?: string,
): Promise<{ score: number; lcpMs: number; cls: number }> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (apiKey) params.append("key", apiKey);

  const res = await fetch(`${PAGESPEED_URL}?${params}`, {
    headers: { "User-Agent": "aw-digital-os/0.1" },
  });
  if (!res.ok) throw new Error(`PageSpeed ${strategy} ${res.status}`);

  const data = (await res.json()) as {
    lighthouseResult?: {
      categories?: { performance?: { score?: number } };
      audits?: Record<string, { numericValue?: number; score?: number }>;
    };
  };

  const perf = data.lighthouseResult?.categories?.performance?.score ?? 0;
  const lcp = data.lighthouseResult?.audits?.["largest-contentful-paint"]
    ?.numericValue;
  const cls =
    data.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue;

  return {
    score: Math.round(perf * 100),
    lcpMs: Math.round(lcp ?? 0),
    cls: Number((cls ?? 0).toFixed(3)),
  };
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
}): string {
  const { flags, mobileScore, lcpMs, copyrightYear } = input;

  if (flags.includes("no_https")) {
    return "Mir ist aufgefallen, dass Ihre Website noch ohne SSL läuft — Google warnt Besucher inzwischen aktiv vor solchen Seiten.";
  }
  if (flags.includes("fetch_failed")) {
    return "Ich wollte mir kurz Ihre Website anschauen, aber sie war für mich nicht erreichbar — wenn das bei Kunden auch passiert, ist das ein Thema. Hätten Sie 90 Sekunden?";
  }
  if (flags.includes("no_impressum")) {
    return "Mir ist aufgefallen, dass auf Ihrer Website das Impressum fehlt — das ist in Deutschland abmahnfähig.";
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
  return "Ich habe Ihre Website kurz analysiert — hätten Sie 90 Sekunden für die zwei größten Fundstücke?";
}

function normalize(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
