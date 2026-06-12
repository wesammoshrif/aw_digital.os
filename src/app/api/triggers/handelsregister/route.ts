/**
 * GET /api/triggers/handelsregister
 *
 * Holt aktuelle Handelsregister-Neueintragungen, filtert auf Handwerk
 * und speichert Treffer als Trigger-Events.
 *
 * Lässt sich später via Inngest oder Supabase pg_cron stündlich/täglich
 * triggern.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllNeugruendungen } from "@/lib/scrapers/handelsregister";
import { OWNER_ID } from "@/lib/utils";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ownerId = req.headers.get("x-owner-id") ?? OWNER_ID;

  try {
    const events = await fetchAllNeugruendungen();

    // Ohne DB: Events einfach zurückgeben (Trigger-Feed soll auch im Demo testbar sein).
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        ok: true,
        mock: true,
        total: events.length,
        inserted: 0,
        skipped: 0,
        events,
      });
    }

    const { db } = await import("@/db");
    const { triggerEvents } = await import("@/db/schema");
    let inserted = 0;
    let skipped = 0;

    for (const ev of events) {
      const existing = await db
        .select({ id: triggerEvents.id })
        .from(triggerEvents)
        .where(
          and(
            eq(triggerEvents.ownerId, ownerId),
            eq(triggerEvents.source, "handelsregister"),
            eq(triggerEvents.title, ev.companyName),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(triggerEvents).values({
        ownerId,
        type: "handelsregister_new",
        source: "handelsregister",
        title: ev.companyName,
        description: `${ev.registerCourt} · ${ev.hrType} · ${ev.state}`,
        url: ev.url,
        matchedKeyword: ev.matchedKeyword,
        occurredAt: ev.publishedAt,
        payload: { trade: ev.trade, raw: ev.raw },
      });
      inserted++;
    }

    return NextResponse.json({ ok: true, total: events.length, inserted, skipped });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
