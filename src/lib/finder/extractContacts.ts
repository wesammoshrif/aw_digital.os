/**
 * Kontaktdaten-Extraktion aus deutschem Freitext
 * ─────────────────────────────────────────────────────────────
 * Geteilter Util für alle Finder-Adapter (Stellenanzeigen/BA, Kleinanzeigen,
 * Impressum-Enrichment …). Zieht Telefon, E-Mail und Website aus unstrukturiertem
 * Text (z.B. `stellenangebotsBeschreibung` der Bundesagentur-API) und normalisiert
 * deutsche Rufnummern.
 *
 * Bewusst PUR: keine Next/DB/React-Imports → in Server-Code, Skripten und Tests
 * gleichermaßen nutzbar. Wirft nie; bei nichts Gefundenem → null.
 */

export type PhoneType = "mobile" | "landline";

export interface Contacts {
  phone: string | null; // normalisiert, +49…
  phoneType: PhoneType | null;
  email: string | null; // lowercase
  website: string | null; // mit https://
}

// ── Telefon ──────────────────────────────────────────────────────────

/**
 * Findet eine deutsche Rufnummer im Text und gibt sie normalisiert zurück.
 * Akzeptiert +49 / 0049 / 0…, optionale (0)-Schreibweise, Trenner (Leerzeichen,
 * /, ., -, Klammern). tel:-Links werden bevorzugt.
 */
const TEL_LINK_RE = /tel:\s*([+\d()\s./-]{6,})/i;
// Kandidaten-Matcher: beginnt mit +49 / 0049 / 0, danach Ziffern + Trenner.
// Die `(0)`-Stammkennziffer wird in normalizePhone entfernt.
const PHONE_CANDIDATE_RE =
  /(?:\+49|0049|0)(?:[\s./()-]|\(0\))*\d(?:[\s./()-]*\d){4,13}/g;
// Datums-/Zeitangaben aussortieren (z.B. „01.07.2024", „15/03/24").
const DATE_LIKE_RE = /^\s*\d{1,2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{2,4}\s*$/;

export function extractPhone(text: string | null | undefined): string | null {
  if (!text) return null;

  const tel = text.match(TEL_LINK_RE);
  if (tel) {
    const n = normalizePhone(tel[1]);
    if (n) return n;
  }

  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    if (DATE_LIKE_RE.test(m[0])) continue;
    const n = normalizePhone(m[0]);
    if (n) return n;
  }
  return null;
}

/**
 * Normalisiert eine Rufnummer auf +49-Format (Leerzeichen/Slashes/Punkte/
 * Klammern entfernt). Gibt null zurück, wenn die Ziffernzahl unplausibel ist.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // „(0)"-Stammkennziffer explizit raus: „+49 (0)171" → „+49 171".
  const cleaned = raw.replace(/\(0\)/g, "");
  let digits = cleaned.replace(/[^\d+]/g, "");
  if (!digits) return null;

  // 00 → + (internationaler Präfix), z.B. 0049… → +49…
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);

  let e164: string;
  if (digits.startsWith("+49")) {
    // Übrig gebliebene Stamm-0 nach der Ländervorwahl entfernen.
    e164 = "+49" + digits.slice(3).replace(/^0+/, "");
  } else if (digits.startsWith("+")) {
    e164 = digits; // andere Länder unverändert lassen
  } else if (digits.startsWith("0")) {
    e164 = "+49" + digits.replace(/^0+/, "");
  } else {
    e164 = "+49" + digits;
  }

  // Plausibilität: deutsche NSN (ohne +49) typ. 7–13 Ziffern.
  const nsn = e164.startsWith("+49") ? e164.slice(3) : e164.replace(/\D/g, "");
  if (nsn.length < 7 || nsn.length > 13) return null;

  return e164;
}

/**
 * Mobil/Festnetz anhand der deutschen Vorwahl: 015x/016x/017x = mobil.
 */
export function classifyPhoneType(
  phone: string | null | undefined,
): PhoneType | null {
  if (!phone) return null;
  let nat = phone.replace(/\D/g, "");
  if (nat.startsWith("49")) nat = "0" + nat.slice(2);
  if (!nat.startsWith("0")) nat = "0" + nat;
  return /^01[567]/.test(nat) ? "mobile" : "landline";
}

// ── E-Mail ───────────────────────────────────────────────────────────

const MAILTO_RE = /mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_NOISE_RE =
  /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|css|js|woff2?)$/i;

function isPlausibleEmail(email: string): boolean {
  if (/@\d+x/i.test(email)) return false; // @2x-Retina-Bildnamen
  if (EMAIL_NOISE_RE.test(email)) return false; // Asset-Endungen
  if (/(sentry|example|domain|your-?email|wixpress|@email\.)/i.test(email))
    return false;
  return true;
}

export function extractEmail(text: string | null | undefined): string | null {
  if (!text) return null;

  const mailto = text.match(MAILTO_RE);
  if (mailto && isPlausibleEmail(mailto[1])) return mailto[1].toLowerCase();

  for (const m of text.matchAll(EMAIL_RE)) {
    if (isPlausibleEmail(m[0])) return m[0].toLowerCase();
  }
  return null;
}

// ── Website ──────────────────────────────────────────────────────────

const URL_RE = /\bhttps?:\/\/[^\s"'<>)\]]+/i;
const WWW_RE = /\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s"'<>)\]]*)?/i;

/** Deutsche/internationale Freemail-Domains → keine Firmen-Website. */
const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "web.de", "gmx.de", "gmx.net", "gmx.at",
  "gmx.ch", "gmx.com", "yahoo.com", "yahoo.de", "ymail.com", "hotmail.com",
  "hotmail.de", "outlook.com", "outlook.de", "live.de", "live.com", "msn.com",
  "t-online.de", "freenet.de", "aol.com", "aol.de", "icloud.com", "me.com",
  "mac.com", "mail.de", "posteo.de", "online.de", "arcor.de", "vodafone.de",
  "kabelmail.de", "kabelbw.de", "protonmail.com", "proton.me", "ewetel.de",
]);

function trimUrl(url: string): string {
  return url.replace(/[).,;:!?"'\]]+$/, "");
}

/**
 * Findet eine Website im Text. Reihenfolge: explizite http(s)-URL → www.-Form →
 * abgeleitet aus einer NICHT-Freemail-E-Mail (info@dach-daris.de → https://dach-daris.de).
 */
export function extractWebsite(
  text: string | null | undefined,
  knownEmail?: string | null,
): string | null {
  if (!text && !knownEmail) return null;

  if (text) {
    const url = text.match(URL_RE)?.[0];
    if (url) return trimUrl(url);

    const www = text.match(WWW_RE)?.[0];
    if (www) return "https://" + trimUrl(www);
  }

  const email = knownEmail ?? extractEmail(text ?? "");
  if (email) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && !FREEMAIL_DOMAINS.has(domain)) {
      return "https://" + domain;
    }
  }
  return null;
}

// ── Komplett ─────────────────────────────────────────────────────────

/**
 * Zieht Telefon (+ Typ), E-Mail und Website in einem Rutsch aus Freitext.
 * Die Website wird – falls keine im Text steht – aus einer Firmen-E-Mail abgeleitet.
 */
export function extractContacts(text: string | null | undefined): Contacts {
  const phone = extractPhone(text);
  const email = extractEmail(text);
  const website = extractWebsite(text, email);
  return {
    phone,
    phoneType: classifyPhoneType(phone),
    email,
    website,
  };
}
