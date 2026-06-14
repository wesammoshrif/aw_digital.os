/**
 * scrape-kleinanzeigen.ts — Lead-Scraper für kleinanzeigen.de
 * ════════════════════════════════════════════════════════════════════════
 *
 *  ⚠️  RECHTLICHE LEITPLANKEN — BITTE ERST LESEN  ⚠️
 *  ------------------------------------------------------------------------
 *  Recherche-Stand (Research-Agent, 2026): kleinanzeigen.de ist ein hartes
 *  Ziel und der Kaltakquise-Teil ist rechtlich heikel. Dieses Skript hält sich
 *  bewusst an die seriöse Linie und ist KEIN Freibrief:
 *
 *   1. NUR gewerbliche Anbieter (isCommercial === true) werden gespeichert.
 *      Private Anzeigen werden hart verworfen.
 *   2. Telefonnummern NUR aus dem öffentlichen Gewerbe-Impressum / Anzeigentext.
 *      Der "Nummer anzeigen"/Login-Button wird NIEMALS ausgelöst
 *      (= Umgehung von Schutzmaßnahmen → AGB-Verstoß, rote Linie).
 *   3. Rate-Limit: max. 1 Request/Sekunde mit Jitter. robots.txt beachten.
 *   4. DSGVO: Quelle + Zeitpunkt je Lead werden dokumentiert (scrapedAt/adUrl),
 *      Löschkonzept und Art.-14-Info sind Sache des Betreibers.
 *
 *  UWG §7 / BVerwG 6 C 3.23: Telefon-Kaltakquise nur bei belastbarer
 *  mutmaßlicher Einwilligung — bloßer Branchenbezug reicht NICHT. Vor
 *  produktivem Einsatz anwaltlich freigeben lassen. Briefkontakt ist sicherer.
 *
 *  ------------------------------------------------------------------------
 *  TECHNIK
 *  - Playwright (DataDome-Schutz → reines fetch reicht nicht).
 *    Installation:  npm i -D playwright  &&  npx playwright install chromium
 *  - Niedrige Frequenz, realistische Header. Bei scharfem Schutz ggf.
 *    residential-Proxy nötig (PROXY env).
 *  - DOM-Selektoren sind gegen die Live-Seite zu verifizieren (mit
 *    SELECTOR_* markiert) — kleinanzeigen.de ändert Klassen regelmäßig.
 *
 *  AUFRUF (Beispiele):
 *    npx tsx scripts/scrape-kleinanzeigen.ts --category dienstleistungen \
 *      --cat-code c430 --loc l3491 --radius 20 --plz 30159 --pages 3 \
 *      --out leads-ka.json
 *
 *    PROXY=http://user:pass@host:port npx tsx scripts/scrape-kleinanzeigen.ts ...
 *
 *  Ausgabe: JSON-Array im KaLeadRaw-Format (kompatibel zum OsmLeadRaw-Format
 *  des Projekts) + Konsolen-Zusammenfassung.
 */

import { writeFile } from "node:fs/promises";
import {
  extractPhone,
  extractEmail,
  extractWebsite,
  classifyPhoneType,
} from "../src/lib/finder/extractContacts";

// ── Datenschema (analog OsmLeadRaw, erweitert um Anzeigen-Metadaten) ──────
interface KaLeadRaw {
  source: "kleinanzeigen";
  adId: string;
  company: string | null;
  city: string | null;
  postalCode: string | null;
  street: string | null;
  phone: string | null; // E.164-nah, normalisiert
  phoneType: "mobile" | "landline" | null;
  email: string | null;
  website: string | null;
  isCommercial: boolean; // NUR true wird gespeichert
  category: string;
  title: string;
  adUrl: string;
  scrapedAt: string; // ISO — DSGVO-Doku
}

// ── CLI-Args ──────────────────────────────────────────────────────────────
function arg(name: string, fallback = ""): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const CONFIG = {
  category: arg("category", "dienstleistungen"),
  catCode: arg("cat-code", "c430"), // Kategorie-ID, z.B. c430 Dienstleistungen
  locCode: arg("loc", ""), // Location-ID lNNNN (NICHT die PLZ)
  radius: arg("radius", "20"), // Umkreis km
  plz: arg("plz", ""), // Orts-Slug/PLZ im Pfad
  pages: parseInt(arg("pages", "2"), 10),
  out: arg("out", "leads-kleinanzeigen.json"),
  commercialOnly: true, // HARTE Vorgabe — nicht abschaltbar via CLI
};

const BASE = "https://www.kleinanzeigen.de";

// Telefon/E-Mail/Website kommen aus dem geteilten Util (extractContacts) —
// dieselbe Logik wie in den Finder-Adaptern. Hier nur noch KA-spezifisches.
function extractPostal(text: string): string | null {
  const m = text.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

// ── Rate-Limiting (≤ 1 req/s mit Jitter) ──────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function polite(): Promise<void> {
  await sleep(800 + Math.floor(Math.random() * 700)); // 0,8–1,5 s
}

// ── URL-Bau (siehe Research-Brief §1) ─────────────────────────────────────
function buildSearchUrl(page: number): string {
  // Schema: /s-{kategorie}/{plz}/seite:N/{catCode}{locCode}r{radius}
  const seg =
    `${CONFIG.catCode}` +
    (CONFIG.locCode ? CONFIG.locCode : "") +
    (CONFIG.radius ? `r${CONFIG.radius}` : "");
  const place = CONFIG.plz ? `/${CONFIG.plz}` : "";
  const pageSeg = page > 1 ? `/seite:${page}` : "";
  return `${BASE}/s-${CONFIG.category}${place}${pageSeg}/${seg}`;
}

// ── DOM-Selektoren (gegen Live-Seite verifizieren!) ───────────────────────
const SELECTOR_LIST_ITEM = "article.aditem";
const SELECTOR_LIST_LINK = "a.ellipsis";
const SELECTOR_COMMERCIAL_BADGE = ".badge-hint-pro-small-srp, .badge-pro"; // Gewerbe-Kennzeichnung
const SELECTOR_DETAIL_TEXT = "#viewad-description-text";
const SELECTOR_DETAIL_IMPRINT = "#viewad-imprint, .imprint, #imprint";
const SELECTOR_DETAIL_LOCALITY = "#viewad-locality";
const SELECTOR_DETAIL_TITLE = "#viewad-title";

async function main() {
  console.log("─".repeat(72));
  console.log("kleinanzeigen.de Lead-Scraper — NUR Gewerbe-Impressum, kein Login-Bypass");
  console.log(`Kategorie: ${CONFIG.category} (${CONFIG.catCode})  Umkreis: ${CONFIG.radius}km  Seiten: ${CONFIG.pages}`);
  console.log("─".repeat(72));

  // Playwright lazy laden — Skript bricht nicht, wenn nicht installiert.
  // Non-literaler Specifier: tsc löst das Modul NICHT auf (kein TS2307,
  // playwright bleibt optionale Dev-Dependency).
  let chromium: any;
  try {
    const pkg = "playwright";
    const pw = await import(pkg);
    chromium = pw.chromium;
  } catch {
    console.error(
      "\n✗ playwright fehlt. Installieren mit:\n    npm i -D playwright && npx playwright install chromium\n",
    );
    process.exit(1);
  }

  const proxy = process.env.PROXY
    ? { server: process.env.PROXY }
    : undefined;

  const browser = await chromium.launch({ headless: true, proxy });
  const ctx = await browser.newContext({
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });
  const page = await ctx.newPage();

  const leads: KaLeadRaw[] = [];
  const seen = new Set<string>();
  let droppedPrivate = 0;

  try {
    for (let p = 1; p <= CONFIG.pages; p++) {
      const url = buildSearchUrl(p);
      console.log(`\n[Seite ${p}] ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Consent-Banner einmal bestätigen (privacy-freundlich: nur Notwendige).
      await page
        .click("#gdpr-banner-accept, button[data-testid='gdpr-banner-accept']", {
          timeout: 3000,
        })
        .catch(() => {});

      // CAPTCHA-/Block-Signal? Dann sauber abbrechen statt aggressiv retrien.
      const blocked = await page
        .locator("text=/captcha|nicht möglich|ungewöhnliche Aktivität/i")
        .count()
        .catch(() => 0);
      if (blocked > 0) {
        console.warn("  ⚠ Bot-Schutz ausgelöst — Abbruch. Proxy/niedrigere Frequenz nötig.");
        break;
      }

      const items = await page.locator(SELECTOR_LIST_ITEM).all();
      console.log(`  ${items.length} Anzeigen gefunden.`);

      // Detail-Links + Gewerbe-Flag aus der Liste sammeln.
      const targets: Array<{ href: string; isCommercial: boolean }> = [];
      for (const it of items) {
        const href = await it
          .locator(SELECTOR_LIST_LINK)
          .first()
          .getAttribute("href")
          .catch(() => null);
        if (!href) continue;
        const isCommercial =
          (await it.locator(SELECTOR_COMMERCIAL_BADGE).count().catch(() => 0)) >
          0;
        targets.push({
          href: href.startsWith("http") ? href : `${BASE}${href}`,
          isCommercial,
        });
      }

      for (const t of targets) {
        // ── HARTE Leitplanke 1: nur Gewerbe ──
        if (CONFIG.commercialOnly && !t.isCommercial) {
          droppedPrivate++;
          continue;
        }

        await polite();
        await page
          .goto(t.href, { waitUntil: "domcontentloaded", timeout: 30000 })
          .catch(() => {});

        const adId = t.href.match(/\/(\d+)-\d+-\d+$|\/(\d+)$/)?.[1] ?? t.href;
        if (seen.has(adId)) continue;
        seen.add(adId);

        const title =
          (await text(page, SELECTOR_DETAIL_TITLE)) ?? "(ohne Titel)";
        const desc = (await text(page, SELECTOR_DETAIL_TEXT)) ?? "";
        // ── HARTE Leitplanke 2: Nummer NUR aus öffentlichem Impressum/Text,
        //    niemals den Login-/"Nummer anzeigen"-Button auslösen. ──
        const imprint = (await text(page, SELECTOR_DETAIL_IMPRINT)) ?? "";
        const locality = (await text(page, SELECTOR_DETAIL_LOCALITY)) ?? "";
        const haystack = `${imprint}\n${desc}`;

        const phone = extractPhone(haystack);
        const lead: KaLeadRaw = {
          source: "kleinanzeigen",
          adId,
          company: extractCompany(imprint) ?? null,
          city: locality.replace(/\d{5}/, "").trim() || null,
          postalCode: extractPostal(locality) ?? extractPostal(imprint),
          street: extractStreet(imprint),
          phone,
          phoneType: classifyPhoneType(phone),
          email: extractEmail(imprint),
          website: extractWebsite(imprint),
          isCommercial: t.isCommercial,
          category: CONFIG.category,
          title: title.trim(),
          adUrl: t.href,
          scrapedAt: new Date().toISOString(),
        };
        leads.push(lead);
        process.stdout.write(
          `    + ${lead.company ?? lead.title.slice(0, 40)} ${lead.phone ?? "(keine Tel.)"}\n`,
        );
      }

      await polite();
    }
  } finally {
    await browser.close();
  }

  const withPhone = leads.filter((l) => l.phone).length;
  const mobile = leads.filter((l) => l.phoneType === "mobile").length;

  await writeFile(CONFIG.out, JSON.stringify(leads, null, 2), "utf-8");

  console.log("\n" + "─".repeat(72));
  console.log(`Fertig. ${leads.length} Gewerbe-Leads → ${CONFIG.out}`);
  console.log(`  davon mit Telefon: ${withPhone}  (Mobil: ${mobile})`);
  console.log(`  private Anzeigen verworfen: ${droppedPrivate}`);
  console.log("─".repeat(72));
  console.log(
    "Hinweis: Telefon-Kaltakquise dieser Leads nur mit anwaltlicher Freigabe (UWG §7).",
  );
}

// ── kleine DOM-Helfer ──────────────────────────────────────────────────────
async function text(page: any, selector: string): Promise<string | null> {
  return page
    .locator(selector)
    .first()
    .innerText({ timeout: 2500 })
    .then((t: string) => t.trim())
    .catch(() => null);
}

function extractCompany(imprint: string): string | null {
  // Erste nicht-leere Zeile des Impressums ist meist der Firmenname.
  const line = imprint
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 2 && !/impressum/i.test(l));
  return line ?? null;
}

function extractStreet(imprint: string): string | null {
  const m = imprint.match(/([A-ZÄÖÜ][a-zäöüß.\- ]+\s\d+[a-z]?)/);
  return m ? m[1].trim() : null;
}

main().catch((err) => {
  console.error("Fehler:", err);
  process.exit(1);
});
