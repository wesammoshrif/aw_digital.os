/**
 * Zentraler Leads-Finder — gemeinsame Typen.
 *
 * Mehrere Quellen-Adapter (OSM, Google Places, Kleinanzeigen, Branchenbuch)
 * liefern alle dasselbe `FinderLead`-Format. Der Orchestrator (index.ts)
 * führt sie zusammen, entdoppelt und gibt eine einheitliche Antwort zurück.
 */

export type FinderSourceId =
  | "osm"
  | "google_places"
  | "handelsregister"
  | "kleinanzeigen"
  | "branchenbuch";

export interface FinderLead {
  source: FinderSourceId;
  company: string;
  trade: string | null;
  phone: string | null;
  phoneType: "mobile" | "landline" | null; // 015x/016x/017x → mobile
  website: string | null;
  // Gesetzt, wenn die Website auf einer Gratis-Baukasten-Subdomain läuft
  // (z.B. „Jimdo", „Wix (Gratis)") → starkes Webdesign-Verkaufssignal.
  builderPlatform: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  rating: number | null; // 0–5 (Google)
  userRatingsTotal: number | null;
  externalId: string | null; // osmId / place_id
}

export type SourceStatus = "ok" | "no-key" | "unavailable" | "error";

export interface SourceResult {
  source: FinderSourceId;
  status: SourceStatus;
  count: number;
  message?: string;
  leads: FinderLead[];
}

export interface FinderQuery {
  city: string;
  trades: string[];
  sources: FinderSourceId[];
}

export interface FinderResponse {
  ok: boolean;
  leads: FinderLead[];
  sources: Array<Omit<SourceResult, "leads">>;
  total: number;
}

export const SOURCE_LABELS: Record<FinderSourceId, string> = {
  osm: "OpenStreetMap",
  google_places: "Google Maps",
  handelsregister: "Neugründungen (Handelsregister)",
  kleinanzeigen: "Kleinanzeigen",
  branchenbuch: "Branchenbücher",
};
