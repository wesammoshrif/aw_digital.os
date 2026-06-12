/**
 * Leads-Finder-Quelle: Branchenbücher (Gelbe Seiten, 11880, Das Örtliche) — STUB.
 *
 * Diese Verzeichnisse haben meist keine offene API; Scraping ist je nach
 * Anbieter heikel (AGB/Anti-Bot). Vieles davon deckt OSM ohnehin schon ab.
 * Adapter meldet ehrlich "unavailable", bis ein legaler Weg geklärt ist.
 */
import type { SourceResult } from "../types";

export async function findBranchenbuch(): Promise<SourceResult> {
  return {
    source: "branchenbuch",
    status: "unavailable",
    count: 0,
    message:
      "Branchenbücher bieten meist keine API. Legaler Datenweg noch offen — OSM deckt vieles davon ab.",
    leads: [],
  };
}
