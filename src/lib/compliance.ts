/**
 * Compliance-Helfer (DNC + Erstkontakt-Rechtsgrundlage).
 *
 * Hintergrund: BVerwG 6 C 3.23 (29.01.2025) — Kaltakquise bei Betrieben aus
 * öffentlich gescrapten Quellen ist heikel. Sichere Linie: Erstkontakt per
 * BRIEF, Telefon erst nach dokumentierter Einwilligung. Diese Helfer kapseln
 * die Regeln, damit Server (Queue-Filter, Routen) und Client (Banner, Button)
 * identisch entscheiden.
 */

// Felder, die wir für die Entscheidung brauchen (Teilmenge von Lead).
export type ComplianceLead = {
  dnc?: boolean | null;
  source?: string | null;
  firstContactChannel?: string | null;
  consentDocumented?: boolean | null;
};

// Öffentlich gescrapte/zugekaufte Quellen ohne Einwilligung → Telefon kritisch.
const SCRAPED_SOURCES = new Set([
  "osm",
  "google_places",
  "handelsregister",
  "google_news",
  "innung",
  "hwk",
  "kommune",
]);

// Quellen mit (mutmaßlicher) Einwilligung / Eigeninitiative → Telefon i. O.
// inbound_form, referral, manual zählen NICHT als kritisches Scraping.

/** Harter Do-Not-Call? Dann nie wieder anrufen, aus jeder Queue raus. */
export function isDnc(lead: ComplianceLead): boolean {
  return lead.dnc === true;
}

/**
 * Fehlt für diesen Lead die Rechtsgrundlage fürs TELEFON?
 * true = Erstkontakt sollte per Brief erfolgen (öffentlich gescrapt, keine
 * dokumentierte Einwilligung, Erstkontakt nicht ausdrücklich auf Telefon
 * gesetzt). Steuert Warn-Banner + Entschärfung des Anruf-Buttons.
 */
export function needsConsentFirst(lead: ComplianceLead): boolean {
  if (lead.consentDocumented) return false; // Einwilligung liegt vor → ok
  if (lead.firstContactChannel === "telefon") return false; // bewusst freigegeben
  return SCRAPED_SOURCES.has(lead.source ?? "");
}

/** Darf dieser Lead aktuell angerufen werden? (DNC + Rechtsgrundlage) */
export function canCall(lead: ComplianceLead): boolean {
  return !isDnc(lead) && !needsConsentFirst(lead);
}
