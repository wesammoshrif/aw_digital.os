/**
 * Leads-Finder-Quelle: OpenStreetMap (wrappt den bestehenden Overpass-Scraper).
 */
import { scrapeTrade, TRADE_MAP, classifyPhone } from "@/lib/scrapers/osm";
import { detectBuilderSubdomain } from "../builderSubdomain";
import type { FinderLead, SourceResult } from "../types";

export async function findOsm(
  city: string,
  trades: string[],
): Promise<SourceResult> {
  const valid = trades.filter((t) => t in TRADE_MAP);
  if (valid.length === 0) {
    return { source: "osm", status: "ok", count: 0, leads: [] };
  }

  const settled = await Promise.allSettled(
    valid.map((t) => scrapeTrade(t as keyof typeof TRADE_MAP, city)),
  );

  const leads: FinderLead[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const o of r.value) {
      leads.push({
        source: "osm",
        company: o.company,
        trade: o.trade,
        phone: o.phone,
        phoneType: classifyPhone(o.phone),
        website: o.website,
        builderPlatform: detectBuilderSubdomain(o.website),
        email: o.email,
        street: o.street,
        city: o.city,
        postalCode: o.postalCode,
        rating: null,
        userRatingsTotal: null,
        externalId: o.osmId,
      });
    }
  }

  const allFailed = settled.every((r) => r.status === "rejected");
  if (allFailed) {
    return {
      source: "osm",
      status: "error",
      count: 0,
      message: "Overpass-Endpunkte nicht erreichbar.",
      leads: [],
    };
  }
  return { source: "osm", status: "ok", count: leads.length, leads };
}
