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

/**
 * Gewerk → OSM-Tag-Selektoren.
 *
 * Selektoren im Format `key=value`. Ohne `=` wird `craft=` angenommen
 * (Abwärtskompatibilität). So lassen sich neben `craft=` auch `shop=`,
 * `healthcare=`, `amenity=` und `office=` abfragen — nötig für Nicht-Handwerk
 * (KFZ, Physio, Friseur …).
 *
 * Reihenfolge grob nach Kaufwilligkeit (Research: höchster Auftragswert +
 * größte Web-Lücke + Erreichbarkeit zuerst). Unbekannte Tag-Werte liefern bei
 * Overpass einfach 0 Treffer — kein Fehler.
 */
export const TRADE_MAP: Record<string, string[]> = {
  // ── Top-Prioritäten (hoher Auftragswert × Web-Lücke) ──
  dachdecker: ["craft=roofer"],
  shk: ["craft=plumber", "craft=hvac"],
  galabau: ["craft=gardener", "craft=landscape_gardener"],
  fensterbauer: ["craft=window_construction"],
  kfz: ["shop=car_repair"],
  // ── Kern-Handwerk ──
  elektriker: ["craft=electrician"],
  maler: ["craft=painter"],
  fliesenleger: ["craft=tiler"],
  tischler: ["craft=carpenter", "craft=joiner", "craft=cabinet_maker"],
  zimmerer: ["craft=carpenter"],
  maurer: ["craft=mason"],
  bauunternehmer: ["craft=builder"],
  metallbau: ["craft=metal_construction", "craft=blacksmith", "craft=locksmith"],
  geruestbau: ["craft=scaffolder"],
  stuckateur: ["craft=plasterer"],
  trockenbau: ["craft=plasterer"],
  bodenleger: ["craft=floorer", "craft=parquet_layer"],
  schornsteinfeger: ["craft=chimney_sweeper"],
  estrichleger: ["craft=floorer"],
  // ── Dienstleister mit hoher telefonischer Erreichbarkeit ──
  physio: ["healthcare=physiotherapist", "amenity=physiotherapist"],
  friseur: ["shop=hairdresser"],
  kosmetik: ["shop=beauty"],
  fahrschule: ["amenity=driving_school"],
  gebaeudereinigung: ["craft=cleaning", "shop=cleaning"],
  schaedlingsbekaempfung: ["craft=pest_control"],
};

/** Deutsche Anzeige-Labels je Gewerk-Key (für UI-Chips). */
export const TRADE_LABELS: Record<string, string> = {
  dachdecker: "Dachdecker",
  shk: "SHK (Sanitär/Heizung)",
  galabau: "Garten- & Landschaftsbau",
  fensterbauer: "Fensterbauer",
  kfz: "KFZ-Werkstatt",
  elektriker: "Elektriker",
  maler: "Maler",
  fliesenleger: "Fliesenleger",
  tischler: "Tischler/Schreiner",
  zimmerer: "Zimmerer",
  maurer: "Maurer",
  bauunternehmer: "Bauunternehmer",
  metallbau: "Metallbau/Schlosser",
  geruestbau: "Gerüstbau",
  stuckateur: "Stuckateur",
  trockenbau: "Trockenbau",
  bodenleger: "Bodenleger",
  schornsteinfeger: "Schornsteinfeger",
  estrichleger: "Estrichleger",
  physio: "Physiotherapie",
  friseur: "Friseur",
  kosmetik: "Kosmetik/Nagelstudio",
  fahrschule: "Fahrschule",
  gebaeudereinigung: "Gebäudereinigung",
  schaedlingsbekaempfung: "Schädlingsbekämpfung",
};

/** OSM-Selektor `key=value` zerlegen; ohne `=` gilt `craft=`. */
function parseSelector(sel: string): { key: string; value: string } {
  const i = sel.indexOf("=");
  if (i === -1) return { key: "craft", value: sel };
  return { key: sel.slice(0, i), value: sel.slice(i + 1) };
}

/**
 * Klassifiziert eine (normalisierte) deutsche Rufnummer als Mobil/Festnetz.
 * Mobil = +49 15x / 16x / 17x. Alles andere (Ortsvorwahl) = Festnetz.
 */
export function classifyPhone(
  phone: string | null | undefined,
): "mobile" | "landline" | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  // Auf nationales Format bringen: +49…/0049… → 0…
  let nat = d;
  if (nat.startsWith("49")) nat = "0" + nat.slice(2);
  if (!nat.startsWith("0")) nat = "0" + nat;
  return /^01[567]/.test(nat) ? "mobile" : "landline";
}

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
  const sels = crafts.map(parseSelector);

  if (area.bbox) {
    const [s, w, n, e] = area.bbox;
    return `
[out:json][timeout:60];
(
  ${sels.map(({ key, value }) => `nwr["${key}"="${value}"](${s},${w},${n},${e});`).join("\n  ")}
);
out center tags;
`.trim();
  }

  if (area.areaName) {
    return `
[out:json][timeout:90];
area["name"="${area.areaName}"]["admin_level"~"6|7|8"]->.searchArea;
(
  ${sels.map(({ key, value }) => `nwr["${key}"="${value}"](area.searchArea);`).join("\n  ")}
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
