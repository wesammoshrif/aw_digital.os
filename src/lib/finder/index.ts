/**
 * Zentraler Leads-Finder — Orchestrator.
 *
 * Führt die gewählten Quellen-Adapter parallel aus, mergt die Ergebnisse
 * und entdoppelt sie. Eine einzelne fehlschlagende Quelle reißt die anderen
 * nicht mit (jede Quelle meldet ihren eigenen Status).
 */
import type {
  FinderQuery,
  FinderResponse,
  FinderLead,
  SourceResult,
} from "./types";
import { findOsm } from "./sources/osm";
import { findGooglePlaces } from "./sources/googlePlaces";
import { findHandelsregister } from "./sources/handelsregister";
import { findKleinanzeigen } from "./sources/kleinanzeigen";
import { findBranchenbuch } from "./sources/branchenbuch";

function dedupKey(l: FinderLead): string {
  const co = l.company.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
  // Letzte 9 Ziffern → normalisiert +49 / 0049 / national auf denselben Key
  // (korrekte Cross-Source-Dedup über Telefon).
  const ph = (l.phone ?? "").replace(/\D/g, "").slice(-9);
  // Ohne Telefon: externalId mit rein, sonst kollidieren verschiedene Betriebe
  // mit gleichem Namen in derselben Stadt und ein echter Lead geht verloren.
  return ph
    ? `${co}|${ph}`
    : `${co}|${(l.city ?? "").toLowerCase()}|${l.externalId ?? ""}`;
}

// Bei Duplikaten den reicheren Datensatz behalten (Telefon schlägt kein-Telefon,
// Google-Bewertung als Bonus).
function isRicher(candidate: FinderLead, current: FinderLead): boolean {
  if (candidate.phone && !current.phone) return true;
  if (!candidate.phone && current.phone) return false;
  if (candidate.rating != null && current.rating == null) return true;
  return false;
}

export async function findLeads(q: FinderQuery): Promise<FinderResponse> {
  const tasks: Array<Promise<SourceResult>> = [];
  if (q.sources.includes("osm")) tasks.push(findOsm(q.city, q.trades));
  if (q.sources.includes("google_places"))
    tasks.push(findGooglePlaces(q.city, q.trades));
  if (q.sources.includes("handelsregister"))
    tasks.push(findHandelsregister(q.trades));
  if (q.sources.includes("kleinanzeigen")) tasks.push(findKleinanzeigen());
  if (q.sources.includes("branchenbuch")) tasks.push(findBranchenbuch());

  const settled = await Promise.allSettled(tasks);
  const sourceResults: SourceResult[] = settled.map((s) =>
    s.status === "fulfilled"
      ? s.value
      : {
          source: "osm",
          status: "error",
          count: 0,
          message: "Quelle fehlgeschlagen.",
          leads: [],
        },
  );

  const map = new Map<string, FinderLead>();
  for (const sr of sourceResults) {
    for (const lead of sr.leads) {
      const key = dedupKey(lead);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, lead);
      } else if (isRicher(lead, existing)) {
        map.set(key, lead);
      }
    }
  }

  const leads = [...map.values()].sort((a, b) => {
    // Mit Telefon zuerst, dann nach Bewertung
    if (!!b.phone !== !!a.phone) return a.phone ? -1 : 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return {
    ok: true,
    leads,
    sources: sourceResults.map(({ leads: _leads, ...rest }) => rest),
    total: leads.length,
  };
}
