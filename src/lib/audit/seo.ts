/**
 * Deterministischer On-Page-SEO-Check
 * ─────────────────────────────────────────────────────────────
 * Rein regelbasiert (Regex/Parsing) — KEINE KI, kein externer Call außer
 * den optionalen robots.txt/sitemap.xml-Prüfungen, die der Aufrufer übergibt.
 * Liefert pro Kriterium pass/warn/fail + Gewicht und daraus einen 0–100-Score.
 *
 * On-Demand nutzbar: runSeoChecks(html, extras) — das Audit ruft es auf, es
 * kann aber auch isoliert pro Lead/URL ausgeführt werden.
 */

export type SeoStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoStatus;
  detail: string;
  weight: number; // Einfluss auf den Score (1 = normal, 2 = wichtig)
}

export interface SeoReport {
  score: number; // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

export interface SeoExtras {
  url: string;
  hasHttps: boolean;
  /** Ergebnis der /robots.txt-Prüfung (null = nicht geprüft). */
  robotsTxt: { reachable: boolean; blocksAll: boolean; sitemapRef: boolean } | null;
  /** /sitemap.xml erreichbar (null = nicht geprüft). */
  sitemapReachable: boolean | null;
}

// ── kleine, deterministische HTML-Helfer ────────────────────────────
function stripBlocks(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1] : null;
}

function metaContent(html: string, key: string, kind: "name" | "property"): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*\\b${kind}\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  return tag ? attr(tag, "content") : null;
}

function textContent(html: string): string {
  return stripBlocks(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── der Check ────────────────────────────────────────────────────────
export function runSeoChecks(html: string | null, extras: SeoExtras): SeoReport {
  const checks: SeoCheck[] = [];
  const add = (
    id: string,
    label: string,
    status: SeoStatus,
    detail: string,
    weight = 1,
  ) => checks.push({ id, label, status, detail, weight });

  if (!html) {
    add("reachable", "Seite erreichbar", "fail", "HTML konnte nicht geladen werden.", 3);
    return finalize(checks);
  }

  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html;

  // 1) Title
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  if (!title) add("title", "Title-Tag", "fail", "Kein <title> vorhanden.", 2);
  else if (title.length < 30)
    add("title", "Title-Tag", "warn", `Nur ${title.length} Zeichen — zu kurz (Ziel 30–65).`, 2);
  else if (title.length > 65)
    add("title", "Title-Tag", "warn", `${title.length} Zeichen — wird in Google abgeschnitten.`, 2);
  else add("title", "Title-Tag", "pass", `${title.length} Zeichen, gut.`, 2);

  // 2) Meta-Description
  const desc = metaContent(head, "description", "name") ?? "";
  if (!desc) add("meta_description", "Meta-Description", "fail", "Keine Meta-Description.", 2);
  else if (desc.length < 70)
    add("meta_description", "Meta-Description", "warn", `Nur ${desc.length} Zeichen — zu kurz (Ziel 70–160).`, 2);
  else if (desc.length > 160)
    add("meta_description", "Meta-Description", "warn", `${desc.length} Zeichen — wird abgeschnitten.`, 2);
  else add("meta_description", "Meta-Description", "pass", `${desc.length} Zeichen, gut.`, 2);

  // 3) H1
  const h1s = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
  if (h1s.length === 0) add("h1", "H1-Überschrift", "fail", "Keine H1 vorhanden.", 2);
  else if (h1s.length > 1)
    add("h1", "H1-Überschrift", "warn", `${h1s.length} H1-Tags — genau eine ist ideal.`, 2);
  else add("h1", "H1-Überschrift", "pass", "Genau eine H1.", 2);

  // 4) Viewport (mobil)
  const viewport = /<meta\b[^>]*\bname\s*=\s*["']?viewport/i.test(head);
  add("viewport", "Mobil-Viewport", viewport ? "pass" : "fail",
    viewport ? "Viewport-Meta gesetzt." : "Kein Viewport — nicht mobil optimiert.", 2);

  // 5) Canonical
  const canonical = /<link\b[^>]*\brel\s*=\s*["']canonical["']/i.test(head);
  add("canonical", "Canonical-URL", canonical ? "pass" : "warn",
    canonical ? "Canonical gesetzt." : "Kein rel=canonical — Duplicate-Content-Risiko.");

  // 6) Robots-Meta (noindex?)
  const robotsMeta = (metaContent(head, "robots", "name") ?? "").toLowerCase();
  if (/noindex|none/.test(robotsMeta))
    add("robots_meta", "Indexierbar", "fail", `robots-Meta = "${robotsMeta}" → Seite wird NICHT indexiert!`, 3);
  else add("robots_meta", "Indexierbar", "pass", "Kein noindex.", 3);

  // 7) lang-Attribut
  const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1];
  add("lang", "Sprach-Attribut", lang ? "pass" : "warn",
    lang ? `lang="${lang}".` : "Kein lang-Attribut am <html>.");

  // 8) Open Graph (Social-Preview)
  const ogTitle = metaContent(head, "og:title", "property");
  const ogDesc = metaContent(head, "og:description", "property");
  const ogImg = metaContent(head, "og:image", "property");
  const ogCount = [ogTitle, ogDesc, ogImg].filter(Boolean).length;
  if (ogCount === 3) add("open_graph", "Open Graph", "pass", "og:title/description/image vorhanden.");
  else if (ogCount === 0) add("open_graph", "Open Graph", "fail", "Keine OG-Tags — schlechte Vorschau beim Teilen.");
  else add("open_graph", "Open Graph", "warn", `Nur ${ogCount}/3 OG-Tags (title/description/image).`);

  // 9) Structured Data (JSON-LD) + LocalBusiness
  const ldBlocks = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const ldText = ldBlocks.join(" ");
  const hasLocalBusiness = /"@type"\s*:\s*["'][^"']*(LocalBusiness|Organization|HomeAndConstructionBusiness|Plumber|Electrician|RoofingContractor|GeneralContractor|Locksmith)/i.test(ldText);
  if (hasLocalBusiness)
    add("structured_data", "Structured Data", "pass", "JSON-LD mit LocalBusiness/Organization.", 2);
  else if (ldBlocks.length > 0)
    add("structured_data", "Structured Data", "warn", "JSON-LD vorhanden, aber kein LocalBusiness-Typ.", 2);
  else
    add("structured_data", "Structured Data", "fail", "Kein JSON-LD — kein Rich-Snippet/Local-Pack-Vorteil.", 2);

  // 10) Bild-Alt-Texte
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  if (imgs.length === 0) add("img_alt", "Bild-Alt-Texte", "pass", "Keine <img> auf der Seite.");
  else {
    const withAlt = imgs.filter((t) => /\balt\s*=\s*["']/i.test(t)).length;
    const ratio = withAlt / imgs.length;
    if (ratio >= 0.9) add("img_alt", "Bild-Alt-Texte", "pass", `${withAlt}/${imgs.length} Bilder mit alt.`);
    else if (ratio >= 0.6) add("img_alt", "Bild-Alt-Texte", "warn", `Nur ${withAlt}/${imgs.length} Bilder mit alt.`);
    else add("img_alt", "Bild-Alt-Texte", "fail", `Nur ${withAlt}/${imgs.length} Bilder mit alt-Text.`);
  }

  // 11) Heading-Struktur (H2 vorhanden / kein Level-Sprung)
  const hasH2 = /<h2\b/i.test(html);
  const hasH3 = /<h3\b/i.test(html);
  if (hasH2) add("headings", "Überschriften-Struktur", "pass", "H2-Ebene vorhanden.");
  else if (hasH3 && !hasH2) add("headings", "Überschriften-Struktur", "warn", "H3 ohne H2 — Ebene übersprungen.");
  else add("headings", "Überschriften-Struktur", "warn", "Keine H2 — flache Struktur.");

  // 12) Favicon
  const favicon = /<link\b[^>]*\brel\s*=\s*["'][^"']*icon[^"']*["']/i.test(head);
  add("favicon", "Favicon", favicon ? "pass" : "warn",
    favicon ? "Favicon verlinkt." : "Kein Favicon im <head>.");

  // 13) Wortanzahl (Thin Content)
  const words = textContent(html).split(/\s+/).filter(Boolean).length;
  if (words >= 600) add("content", "Textumfang", "pass", `${words} Wörter.`);
  else if (words >= 250) add("content", "Textumfang", "warn", `Nur ${words} Wörter — dünner Inhalt.`);
  else add("content", "Textumfang", "fail", `Nur ${words} Wörter — sehr dünner Inhalt.`);

  // 14) Telefon/NAP (lokales Signal)
  const hasTel = /href\s*=\s*["']tel:/i.test(html) || /(?:\+49|0)[\s\d()/-]{6,}\d/.test(textContent(html));
  add("nap_phone", "Telefon/Kontakt", hasTel ? "pass" : "warn",
    hasTel ? "Telefonnummer auffindbar." : "Keine Telefonnummer gefunden.");

  // 15) HTTPS
  add("https", "HTTPS", extras.hasHttps ? "pass" : "fail",
    extras.hasHttps ? "Verschlüsselt." : "Kein HTTPS — Google warnt Besucher.", 2);

  // 16) robots.txt
  if (extras.robotsTxt) {
    if (!extras.robotsTxt.reachable)
      add("robots_txt", "robots.txt", "warn", "Keine robots.txt gefunden.");
    else if (extras.robotsTxt.blocksAll)
      add("robots_txt", "robots.txt", "fail", "robots.txt blockt die ganze Seite (Disallow: /)!", 2);
    else add("robots_txt", "robots.txt", "pass", "robots.txt vorhanden, crawlbar.");
  }

  // 17) Sitemap
  if (extras.sitemapReachable !== null || extras.robotsTxt) {
    const sitemap = extras.sitemapReachable || extras.robotsTxt?.sitemapRef;
    add("sitemap", "XML-Sitemap", sitemap ? "pass" : "warn",
      sitemap ? "Sitemap erreichbar/verlinkt." : "Keine sitemap.xml gefunden.");
  }

  return finalize(checks);
}

function finalize(checks: SeoCheck[]): SeoReport {
  const factor: Record<SeoStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0) || 1;
  const got = checks.reduce((s, c) => s + c.weight * factor[c.status], 0);
  const score = Math.round((got / totalWeight) * 100);
  const grade: SeoReport["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  return {
    score,
    grade,
    checks,
    passCount: checks.filter((c) => c.status === "pass").length,
    warnCount: checks.filter((c) => c.status === "warn").length,
    failCount: checks.filter((c) => c.status === "fail").length,
  };
}
