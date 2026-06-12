/**
 * Leads-Finder-Quelle: Kleinanzeigen.de — STUB.
 *
 * Kleinanzeigen bietet KEINE offizielle API, und direktes Scrapen verstößt
 * gegen die AGB (zudem Anti-Bot-Schutz). Anbindung erst über einen legalen
 * Scraping-/Datendienst sinnvoll. Bis dahin meldet der Adapter ehrlich
 * "unavailable" — kein Fake, keine erfundenen Daten.
 */
import type { SourceResult } from "../types";

export async function findKleinanzeigen(): Promise<SourceResult> {
  return {
    source: "kleinanzeigen",
    status: "unavailable",
    count: 0,
    message:
      "Kleinanzeigen hat keine offizielle API. Anbindung über einen legalen Scraping-Dienst noch offen.",
    leads: [],
  };
}
