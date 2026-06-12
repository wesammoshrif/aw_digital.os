/**
 * OSM Overpass Scraper
 * ─────────────────────────────────────────────────────────────
 * Liest Handwerksbetriebe aus OpenStreetMap via Overpass API.
 * Komplett kostenlos, ODbL-Lizenz (Quellenangabe nötig).
 *
 * Tags: craft=roofer|painter|electrician|plumber|carpenter|tiler|
 *       mason|hvac|builder
 * Felder: phone, website, email, addr:*, opening_hours, contact:*
 *
 * Realistisch: 50–600 Treffer pro deutscher Stadt.
 * Telefonnummer-Quote ~30–40%, Website-Quote ~25%.
 */

export const TRADE_MAP: Record<string, string[]> = {
  dachdecker: ["roofer"],
  maler: ["painter"],
  elektriker: ["electrician"],
  shk: ["plumber", "hvac"],
  tischler: ["carpenter", "joiner"],
  fliesenleger: ["tiler"],
  maurer: ["mason"],
  bauunternehmer: ["builder"],
  galabau: ["gardener", "landscaper"],
};

export interface OsmLeadRaw {
  osmId: string;
  osmType: "node" | "way" | "relation";
  company: string;
  trade: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  lat: number;
  lon: number;
  openingHours: string | null;
  raw: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Build Overpass QL query for a trade × bounding box.
 * @param crafts e.g. ["roofer", "carpenter"]
 * @param area  Either ISO city name ("Hannover") or {bbox: [s,w,n,e]}.
 */
export function buildOverpassQuery(
  crafts: string[],
  area: { areaName?: string; bbox?: [number, number, number, number] },
): string {
  const craftFilter = crafts.map((c) => `["craft"="${c}"]`).join("|");
  const tagAlt = crafts.map((c) => `nwr["craft"="${c}"]`).join(";\n  ");

  if (area.bbox) {
    const [s, w, n, e] = area.bbox;
    return `
[out:json][timeout:60];
(
  ${crafts.map((c) => `nwr["craft"="${c}"](${s},${w},${n},${e});`).join("\n  ")}
);
out center tags;
`.trim();
  }

  if (area.areaName) {
    return `
[out:json][timeout:90];
area["name"="${area.areaName}"]["admin_level"~"6|7|8"]->.searchArea;
(
  ${crafts.map((c) => `nwr["craft"="${c}"](area.searchArea);`).join("\n  ")}
);
out center tags;
`.trim();
  }

  throw new Error("OSM query needs areaName or bbox");
}

/**
 * Fetch raw leads from Overpass, with endpoint failover.
 */
export async function fetchOsmLeads(
  query: string,
  opts: { tradeLabel?: string } = {},
): Promise<OsmLeadRaw[]> {
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "aw-digital-os/0.1 (B2B handwerk research)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        lastError = new Error(`Overpass ${endpoint} returned ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        elements: Array<{
          type: string;
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      return data.elements
        .filter((el) => el.tags && el.tags.name)
        .map((el): OsmLeadRaw => {
          const tags = el.tags ?? {};
          const center = el.center ?? { lat: el.lat ?? 0, lon: el.lon ?? 0 };

          return {
            osmId: `${el.type}/${el.id}`,
            osmType: el.type as OsmLeadRaw["osmType"],
            company: tags.name ?? "Unbekannt",
            trade: opts.tradeLabel ?? tags.craft ?? null,
            phone: normalizePhone(tags.phone ?? tags["contact:phone"]),
            website: normalizeUrl(tags.website ?? tags["contact:website"]),
            email: tags.email ?? tags["contact:email"] ?? null,
            street: joinAddr(tags["addr:street"], tags["addr:housenumber"]),
            city: tags["addr:city"] ?? null,
            postalCode: tags["addr:postcode"] ?? null,
            lat: center.lat,
            lon: center.lon,
            openingHours: tags.opening_hours ?? null,
            raw: tags,
          };
        });
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All Overpass endpoints failed: ${String(lastError)}`);
}

function joinAddr(
  street: string | undefined,
  number: string | undefined,
): string | null {
  if (!street) return null;
  return number ? `${street} ${number}` : street;
}

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  // 0049… → +49… (vor dem 0-Check prüfen, sonst wird +49049… draus)
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("0")) return `+49${cleaned.slice(1)}`;
  return cleaned;
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * High-level helper: scrape one trade for one city.
 */
export async function scrapeTrade(
  tradeKey: keyof typeof TRADE_MAP,
  city: string,
): Promise<OsmLeadRaw[]> {
  const crafts = TRADE_MAP[tradeKey];
  if (!crafts) throw new Error(`Unknown trade: ${tradeKey}`);

  const query = buildOverpassQuery(crafts, { areaName: city });
  return fetchOsmLeads(query, { tradeLabel: tradeKey });
}
