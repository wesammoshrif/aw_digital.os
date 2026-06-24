/**
 * Quellen-Adapter: Google Places API v1 (Text Search).
 *
 * Nutzt die NEUE Places API (places.googleapis.com/v1), die Telefon, Website,
 * Rating usw. in EINEM Request liefert — kein separater Details-Call nötig.
 *
 * Defensive: wirft nie. Ein fehlgeschlagenes Gewerk killt die anderen nicht
 * (Promise.allSettled). Bei Gesamtfehler → status "error".
 */

import type { FinderLead, SourceResult } from "@/lib/finder/types";
import { classifyPhone } from "@/lib/scrapers/osm";
import { detectBuilderSubdomain } from "@/lib/finder/builderSubdomain";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.addressComponents",
].join(",");

/** Form der relevanten Felder eines place aus der v1-Antwort (defensiv, alles optional). */
interface GooglePlace {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
}

interface SearchTextResponse {
  places?: GooglePlace[];
}

/**
 * Normalisiert eine deutsche Telefonnummer grob ins +49-Format.
 * - "00…" → "+…"
 * - führende "0" → "+49…"
 * - Leerzeichen, Klammern, Bindestriche, Slashes raus
 * Gibt null zurück, wenn nichts Brauchbares übrig bleibt.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Plus merken, dann alle Nicht-Ziffern entfernen.
  const hadPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  if (hadPlus) {
    return `+${digits}`;
  }
  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    return `+49${digits.slice(1)}`;
  }
  // Keine erkennbare Vorwahl-Konvention — nummer roh mit + voranstellen ist riskant,
  // also unverändert (nur Ziffern) zurückgeben.
  return digits;
}

/** Sucht eine Adress-Komponente nach Typ. */
function pickComponent(
  components: GooglePlace["addressComponents"],
  type: string,
): string | null {
  if (!components) return null;
  for (const c of components) {
    if (c.types && c.types.includes(type)) {
      return c.longText ?? c.shortText ?? null;
    }
  }
  return null;
}

/**
 * Versucht Straße/PLZ/Ort aus addressComponents zu ziehen,
 * fällt sonst auf grobes Parsen von formattedAddress zurück.
 */
function parseAddress(place: GooglePlace): {
  street: string | null;
  postalCode: string | null;
  city: string | null;
} {
  const route = pickComponent(place.addressComponents, "route");
  const streetNumber = pickComponent(place.addressComponents, "street_number");
  let street: string | null = null;
  if (route) {
    street = streetNumber ? `${route} ${streetNumber}` : route;
  }
  let postalCode = pickComponent(place.addressComponents, "postal_code");
  let city =
    pickComponent(place.addressComponents, "locality") ??
    pickComponent(place.addressComponents, "postal_town");

  // Fallback: formattedAddress grob parsen, z.B.
  // "Musterstraße 1, 30159 Hannover, Deutschland"
  if ((!street || !postalCode || !city) && place.formattedAddress) {
    const parts = place.formattedAddress
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (!street && parts.length >= 1) {
      // Erster Teil ist meist die Straße + Hausnummer.
      const first = parts[0];
      // Nur übernehmen, wenn es nicht selbst wie "PLZ Ort" aussieht.
      if (!/^\d{5}\s/.test(first)) {
        street = first;
      }
    }

    for (const part of parts) {
      const m = part.match(/^(\d{5})\s+(.+)$/);
      if (m) {
        if (!postalCode) postalCode = m[1];
        if (!city) city = m[2];
        break;
      }
    }
  }

  return {
    street: street ?? null,
    postalCode: postalCode ?? null,
    city: city ?? null,
  };
}

/** Mappt einen einzelnen place auf einen FinderLead. */
function mapPlace(place: GooglePlace, trade: string): FinderLead {
  const { street, postalCode, city } = parseAddress(place);
  const phone = normalizePhone(
    place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
  );
  return {
    source: "google_places",
    company: place.displayName?.text ?? "Unbekannt",
    trade,
    phone,
    phoneType: classifyPhone(phone),
    website: place.websiteUri ?? null,
    builderPlatform: detectBuilderSubdomain(place.websiteUri ?? null),
    email: null, // Google liefert keine E-Mail.
    street,
    city,
    postalCode,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingsTotal:
      typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    externalId: place.id ?? null,
  };
}

/** Führt einen Text-Search-Request für genau ein Gewerk aus. */
async function searchTrade(
  key: string,
  city: string,
  trade: string,
): Promise<FinderLead[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${trade} ${city}`,
      regionCode: "DE",
      languageCode: "de",
      maxResultCount: 20,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google Places HTTP ${res.status} für "${trade}"`);
  }

  const data = (await res.json()) as SearchTextResponse;
  const places = Array.isArray(data.places) ? data.places : [];
  return places.map((p) => mapPlace(p, trade));
}

/**
 * Sucht Handwerker-Leads über die Google Places API v1.
 *
 * @param city   Stadt, z.B. "Hannover"
 * @param trades Liste deutscher Gewerk-Schlüssel, z.B. ["dachdecker", "maler"]
 */
export async function findGooglePlaces(
  city: string,
  trades: string[],
): Promise<SourceResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return {
      source: "google_places",
      status: "no-key",
      count: 0,
      message: "GOOGLE_PLACES_API_KEY in .env.local fehlt.",
      leads: [],
    };
  }

  try {
    const settled = await Promise.allSettled(
      (trades ?? []).map((trade) => searchTrade(key, city, trade)),
    );

    const all: FinderLead[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        all.push(...result.value);
      }
      // Abgelehnte Gewerke werden still ignoriert, damit ein einzelner
      // Fehler die übrigen Treffer nicht verwirft.
    }

    // Dedup per externalId (place.id ist eindeutig).
    const seen = new Set<string>();
    const leads: FinderLead[] = [];
    for (const lead of all) {
      if (lead.externalId) {
        if (seen.has(lead.externalId)) continue;
        seen.add(lead.externalId);
      }
      leads.push(lead);
    }

    return {
      source: "google_places",
      status: "ok",
      count: leads.length,
      leads,
    };
  } catch (err) {
    return {
      source: "google_places",
      status: "error",
      count: 0,
      message: String(err).slice(0, 200),
      leads: [],
    };
  }
}
