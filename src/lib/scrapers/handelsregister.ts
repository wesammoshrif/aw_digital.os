/**
 * Handelsregister-Bekanntmachungen Scraper (Trigger-Feed)
 * ─────────────────────────────────────────────────────────────
 * handelsregisterbekanntmachungen.de veröffentlicht alle Neueintragungen
 * der deutschen Handelsregister — frei zugänglich, RSS pro Bundesland.
 *
 * Ziel: Handwerks-Neugründungen täglich filtern und als „warmer
 * Trigger-Lead" (Hook: „Glückwunsch zur Eintragung…") in die App ziehen.
 *
 * Conversion: ~3–5× höher als Cold Call.
 */

import { XMLParser } from "fast-xml-parser";

export interface HandelsregisterEvent {
  id: string;
  state: string;
  registerCourt: string;
  companyName: string;
  hrType: "HRA" | "HRB" | "GnR" | "PR" | "VR" | "unknown";
  publishedAt: Date;
  url: string;
  raw: string;
  matchedKeyword?: string;
}

const FEEDS: Record<string, string> = {
  bayern: "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=9",
  nrw: "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=5",
  bw: "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=8",
  niedersachsen:
    "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=3",
  hessen:
    "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=6",
  berlin:
    "https://www.handelsregisterbekanntmachungen.de/skripte/rss.php?land=11",
};

/**
 * Keywords, die typische Handwerksbetriebe in Firmennamen tragen.
 * Liefert keyword + Gewerks-Label für die Lead-Anreicherung.
 */
export const HANDWERK_KEYWORDS: Array<{ regex: RegExp; trade: string }> = [
  { regex: /\bdachdecker(ei|meister)?\b/i, trade: "dachdecker" },
  { regex: /\bmaler(\b|meister|betrieb)/i, trade: "maler" },
  { regex: /\belektro(installation|technik|meister|betrieb)?\b/i, trade: "elektriker" },
  { regex: /\b(sanitär|heizung|klempner|installateur|shk)\b/i, trade: "shk" },
  { regex: /\btischlerei?\b/i, trade: "tischler" },
  { regex: /\b(schreiner|schreinerei)\b/i, trade: "tischler" },
  { regex: /\bfliesenleger(ei)?\b/i, trade: "fliesenleger" },
  { regex: /\bmaurer(ei|meister)?\b/i, trade: "maurer" },
  { regex: /\b(bau(unternehmung|gesellschaft|gmbh|firma)|bauleistungen)\b/i, trade: "bauunternehmer" },
  { regex: /\b(garten|landschaftsbau|galabau)\b/i, trade: "galabau" },
  { regex: /\b(hausmeisterservice|gebäudereinigung|reinigungs)\b/i, trade: "hausmeister" },
  { regex: /\b(solar|photovoltaik|wärmepumpe)\b/i, trade: "solar" },
];

export async function fetchHandelsregisterFeed(
  state: keyof typeof FEEDS,
): Promise<HandelsregisterEvent[]> {
  const url = FEEDS[state];
  if (!url) throw new Error(`Unknown state: ${state}`);

  const res = await fetch(url, {
    headers: { "User-Agent": "aw-digital-os/0.1" },
  });
  if (!res.ok) throw new Error(`Handelsregister feed ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml) as {
    rss?: {
      channel?: {
        item?: Array<{
          title?: string;
          link?: string;
          description?: string;
          pubDate?: string;
          guid?: string | { "#text": string };
        }>;
      };
    };
  };

  const items = parsed.rss?.channel?.item ?? [];

  return items.map((item): HandelsregisterEvent => {
    const title = String(item.title ?? "").trim();
    const link = String(item.link ?? "").trim();
    const desc = String(item.description ?? "").trim();
    const guid =
      typeof item.guid === "string" ? item.guid : (item.guid?.["#text"] ?? link);
    const pubDate = item.pubDate
      ? new Date(item.pubDate)
      : new Date();

    // title looks like: "Amtsgericht München HRB 123456: Acme GmbH Neueintragung"
    const courtMatch = title.match(/(Amtsgericht\s+\S+)/i);
    const hrMatch = title.match(/\b(HRA|HRB|GnR|PR|VR)\s*\d+/i);
    const nameMatch = title.match(/:\s*(.+?)(?:\s+Neueintragung|$)/i);

    return {
      id: String(guid),
      state,
      registerCourt: courtMatch?.[1] ?? "",
      companyName: nameMatch?.[1]?.trim() ?? title,
      hrType: (hrMatch?.[1] as HandelsregisterEvent["hrType"]) ?? "unknown",
      publishedAt: pubDate,
      url: link,
      raw: `${title}\n${desc}`,
    };
  });
}

/**
 * Filter Handelsregister-Events auf Handwerksbetriebe.
 */
export function filterHandwerk(
  events: HandelsregisterEvent[],
): Array<HandelsregisterEvent & { trade: string }> {
  const matched: Array<HandelsregisterEvent & { trade: string }> = [];

  for (const ev of events) {
    const text = `${ev.companyName} ${ev.raw}`;
    for (const kw of HANDWERK_KEYWORDS) {
      if (kw.regex.test(text)) {
        matched.push({
          ...ev,
          trade: kw.trade,
          matchedKeyword: kw.regex.source,
        });
        break;
      }
    }
  }

  return matched;
}

/**
 * Convenience: fetch all states + filter trades.
 */
export async function fetchAllNeugruendungen(): Promise<
  Array<HandelsregisterEvent & { trade: string }>
> {
  const states = Object.keys(FEEDS) as Array<keyof typeof FEEDS>;
  const all = await Promise.allSettled(
    states.map((s) => fetchHandelsregisterFeed(s)),
  );
  const events = all
    .filter((r): r is PromiseFulfilledResult<HandelsregisterEvent[]> =>
      r.status === "fulfilled",
    )
    .flatMap((r) => r.value);
  return filterHandwerk(events);
}
