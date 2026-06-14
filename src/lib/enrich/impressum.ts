/**
 * Lead-Anreicherung aus der Website (Impressum/Kontakt-Parse)
 * ─────────────────────────────────────────────────────────────
 * Holt Startseite + typische Rechtsseiten (/impressum, /kontakt) und
 * extrahiert per Regex E-Mail, Telefon und – wenn klar erkennbar – den
 * Inhaber-/Geschäftsführer-Namen.
 *
 * Grundprinzip: DEFENSIV. Bei jedem Fehler/Timeout → alle Felder null,
 * NIE werfen. Diese Funktion läuft inline im Scrape-Pfad und darf den
 * Scrape niemals crashen oder ausbremsen.
 */

import { extractEmail, extractPhone } from "@/lib/finder/extractContacts";

const FETCH_TIMEOUT_MS = 6_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AW-Digital-Enrich/0.1; +https://awdigital.de/impressum)";

// Reihenfolge = Priorität. Startseite zuerst (oft schon mailto/Tel im Footer),
// danach die Rechts-/Kontaktseiten, auf denen Impressumsdaten liegen.
const SUBPATHS = ["", "/impressum", "/impressum/", "/kontakt", "/kontakt/"];

export interface EnrichResult {
  email: string | null;
  phone: string | null;
  contactName: string | null;
}

export async function enrichFromWebsite(
  websiteUrl: string,
): Promise<EnrichResult> {
  const empty: EnrichResult = { email: null, phone: null, contactName: null };

  let origin: string;
  try {
    origin = new URL(normalizeUrl(websiteUrl)).origin;
  } catch {
    return empty;
  }

  const result: EnrichResult = { email: null, phone: null, contactName: null };

  for (const path of SUBPATHS) {
    // Sobald wir alle drei Felder haben → fertig, keine weiteren Requests.
    if (result.email && result.phone && result.contactName) break;

    const html = await fetchHtml(`${origin}${path}`);
    if (!html) continue;

    if (!result.email) result.email = extractEmail(html);
    if (!result.phone) result.phone = extractPhone(html);
    if (!result.contactName) result.contactName = extractContactName(html);
  }

  return result;
}

// ─── HTML fetch (defensiv, mit Timeout) ──────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Extraktoren ─────────────────────────────────────────────────

function extractContactName(html: string): string | null {
  const text = stripTags(html);
  // Nur klare Muster: "Inhaber: X", "Geschäftsführer: X", "vertreten durch X".
  const patterns = [
    /\bInhaber(?:in)?\s*:?\s*([A-ZÄÖÜ][\p{L}.'-]+(?:\s+[A-ZÄÖÜ][\p{L}.'-]+){1,3})/u,
    /\bGesch[äa]ftsf[üu]hrer(?:in)?\s*:?\s*([A-ZÄÖÜ][\p{L}.'-]+(?:\s+[A-ZÄÖÜ][\p{L}.'-]+){1,3})/u,
    /\bvertreten durch\s*:?\s*([A-ZÄÖÜ][\p{L}.'-]+(?:\s+[A-ZÄÖÜ][\p{L}.'-]+){1,3})/u,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const name = m[1].trim();
      // Sanity: 2–4 Wörter, kein offensichtlicher Müll.
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && name.length <= 60) {
        return name;
      }
    }
  }
  return null;
}

function stripTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
