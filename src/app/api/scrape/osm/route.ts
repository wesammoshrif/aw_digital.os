/**
 * POST /api/scrape/osm
 *
 * Body: { city: string, trades: string[] }
 *
 * Zieht via Overpass eine Handwerks-Liste pro Gewerk × Stadt und
 * schreibt deduped Leads ins CRM.
 * Ohne DATABASE_URL läuft der Scrape und gibt die Roh-Liste zurück
 * (kein Persist) — passend zum UI-Versprechen auf /scrape.
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeTrade, TRADE_MAP, type OsmLeadRaw } from "@/lib/scrapers/osm";
import { OWNER_ID } from "@/lib/utils";
import { isNull, and, eq } from "drizzle-orm";

// Roh-Lead im Mock-Pfad: mutierbar + optionaler contactName aus der
// Impressum-Anreicherung (OsmLeadRaw selbst kennt kein contactName-Feld).
type RawLead = OsmLeadRaw & { contactName?: string | null };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { city?: string; trades?: string[] };
  const city = body.city ?? "Hannover";
  const trades = body.trades ?? ["dachdecker", "maler", "elektriker"];
  const ownerId = req.headers.get("x-owner-id") ?? OWNER_ID;

  // ── Mock-Modus: nur scrapen, kein Persist ─────────────────────────
  if (!process.env.DATABASE_URL) {
    let rawCount = 0;
    const rawLeads: unknown[] = [];
    for (const trade of trades) {
      if (!(trade in TRADE_MAP)) continue;
      try {
        const raws = await scrapeTrade(trade as keyof typeof TRADE_MAP, city);
        rawCount += raws.length;
        rawLeads.push(...raws);
      } catch (err) {
        console.warn(`[scrape/osm] ${trade} fehlgeschlagen:`, err);
      }
    }

    // ── Leichte Anreicherung (nur Mock-Pfad) ──────────────────────────
    // Für die ERSTEN 5 Leads OHNE email/phone, aber MIT website: Impressum/
    // Kontakt parsen (KEIN PageSpeed-Audit inline — das wäre zu langsam).
    // Streng defensiv via Promise.allSettled: darf den Scrape niemals
    // crashen oder bis-Timeout ausbremsen, Roh-Liste wird so oder so zurück-
    // gegeben. enrichFromWebsite wirft selbst nie und hat ~6s Timeout/Request.
    try {
      const { enrichFromWebsite } = await import("@/lib/enrich/impressum");
      const candidates = (rawLeads as RawLead[])
        .filter((l) => l && l.website && !l.email && !l.phone)
        .slice(0, 5);

      await Promise.allSettled(
        candidates.map(async (lead) => {
          const enriched = await enrichFromWebsite(lead.website as string);
          // Nur befüllen, was noch leer ist — bestehende Daten nicht überschreiben.
          if (enriched.email && !lead.email) lead.email = enriched.email;
          if (enriched.phone && !lead.phone) lead.phone = enriched.phone;
          if (enriched.contactName && !lead.contactName)
            lead.contactName = enriched.contactName;
        }),
      );
    } catch (err) {
      console.warn("[scrape/osm] Anreicherung übersprungen:", err);
    }

    return NextResponse.json({
      ok: true,
      mock: true,
      rawCount,
      newCount: 0,
      city,
      trades,
      leads: rawLeads,
    });
  }

  // ── DB-Modus ──────────────────────────────────────────────────────
  const { db } = await import("@/db");
  const { leads, scrapeRuns } = await import("@/db/schema");

  let run: { id: string } | null = null;
  let rawCount = 0;
  let newCount = 0;

  try {
    const [r] = await db
      .insert(scrapeRuns)
      .values({
        ownerId,
        source: "osm",
        region: city,
        trade: trades.join(","),
      })
      .returning({ id: scrapeRuns.id });
    run = r;

    for (const trade of trades) {
      if (!(trade in TRADE_MAP)) continue;
      const raws = await scrapeTrade(trade as keyof typeof TRADE_MAP, city);
      rawCount += raws.length;

      for (const lead of raws) {
        // dedup: company + phone (oder company + leerer phone)
        const existing = await db
          .select({ id: leads.id })
          .from(leads)
          .where(
            and(
              eq(leads.ownerId, ownerId),
              eq(leads.company, lead.company),
              lead.phone ? eq(leads.phone, lead.phone) : isNull(leads.phone),
            ),
          )
          .limit(1);

        if (existing.length > 0) continue;

        await db.insert(leads).values({
          ownerId,
          company: lead.company,
          trade,
          city: lead.city ?? city,
          postalCode: lead.postalCode,
          address: lead.street,
          phone: lead.phone,
          email: lead.email,
          website: lead.website,
          status: "new",
          source: "osm",
          // Sofort fällig — Heute-Queue zeigt frische Scrape-Leads direkt
          nextStep: "Erstanruf",
          nextStepAt: new Date(),
          custom: { osmId: lead.osmId, lat: lead.lat, lon: lead.lon, raw: lead.raw },
        });
        newCount++;
      }
    }

    if (run) {
      await db
        .update(scrapeRuns)
        .set({
          finishedAt: new Date(),
          status: "done",
          rawCount,
          newCount,
        })
        .where(eq(scrapeRuns.id, run.id));
    }

    return NextResponse.json({ ok: true, rawCount, newCount, city, trades });
  } catch (err) {
    if (run) {
      try {
        await db
          .update(scrapeRuns)
          .set({
            finishedAt: new Date(),
            status: "failed",
            errorMessage: String(err),
          })
          .where(eq(scrapeRuns.id, run.id));
      } catch {
        /* swallow — wir wollen den ursprünglichen Fehler als JSON melden */
      }
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
