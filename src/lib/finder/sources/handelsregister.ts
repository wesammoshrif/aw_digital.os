/**
 * Leads-Finder-Quelle: Handelsregister-Neugründungen.
 *
 * Nutzt den bestehenden RSS-Scraper (handelsregisterbekanntmachungen.de,
 * frei zugänglich, öffentliche Bekanntmachung). Liefert FRISCHE
 * Handwerks-Neugründungen als warmen Trigger-Lead — Hook: „Glückwunsch
 * zur Eintragung…". Conversion deutlich höher als kalter Erstkontakt.
 *
 * Wichtig: Diese Quelle ist NICHT stadtgebunden — sie liefert die aktuellen
 * Neueintragungen aller abgedeckten Bundesländer, gefiltert auf die gewählten
 * Gewerke. Kontaktdaten (Tel/Website) sind im Register NICHT enthalten — die
 * werden anschließend über die Anreicherung / Audit nachgezogen.
 */
import { fetchAllNeugruendungen } from "@/lib/scrapers/handelsregister";
import type { FinderLead, SourceResult } from "../types";

export async function findHandelsregister(
  trades: string[],
): Promise<SourceResult> {
  try {
    const events = await fetchAllNeugruendungen();
    // Auf gewählte Gewerke filtern (leer ⇒ alle Handwerks-Treffer).
    const wanted =
      trades.length > 0
        ? events.filter((e) => trades.includes(e.trade))
        : events;

    const leads: FinderLead[] = wanted.map((e) => ({
      source: "handelsregister",
      company: e.companyName,
      trade: e.trade,
      phone: null,
      phoneType: null,
      website: null,
      builderPlatform: null,
      email: null,
      street: null,
      // Registergericht als grober Ort (z.B. „München" aus „Amtsgericht München").
      city: e.registerCourt.replace(/^Amtsgericht\s+/i, "").trim() || null,
      postalCode: null,
      rating: null,
      userRatingsTotal: null,
      externalId: e.id,
    }));

    return {
      source: "handelsregister",
      status: "ok",
      count: leads.length,
      message:
        leads.length === 0
          ? "Aktuell keine passenden Neugründungen im Feed."
          : undefined,
      leads,
    };
  } catch {
    return {
      source: "handelsregister",
      status: "error",
      count: 0,
      message: "Handelsregister-Feed nicht erreichbar.",
      leads: [],
    };
  }
}
