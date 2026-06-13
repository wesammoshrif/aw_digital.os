/**
 * Leads-Finder-Quelle: Kleinanzeigen.de — Offline-Skript-Pfad.
 *
 * Kleinanzeigen hat keine offizielle API und aktiven Bot-Schutz (DataDome).
 * Live-Scraping aus der Web-App ist daher nicht eingebaut. Stattdessen gibt es
 * ein eigenständiges, rechtlich abgesichertes Skript:
 *
 *     scripts/scrape-kleinanzeigen.ts   (Playwright, nur Gewerbe-Impressum)
 *
 * Ablauf: Skript offline laufen lassen → erzeugte JSON über den normalen
 * Import übernehmen. Dieser Adapter meldet darum ehrlich "unavailable" und
 * erfindet keine Daten.
 */
import type { SourceResult } from "../types";

export async function findKleinanzeigen(): Promise<SourceResult> {
  return {
    source: "kleinanzeigen",
    status: "unavailable",
    count: 0,
    message:
      "Kein Live-Scraping (Bot-Schutz). Offline via scripts/scrape-kleinanzeigen.ts → JSON importieren.",
    leads: [],
  };
}
