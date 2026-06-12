/**
 * POST /api/import
 *
 * Nimmt JSON-Export der bestehenden HTML-CRM entgegen und legt Leads
 * idempotent (deduped per company+phone) im neuen Schema an.
 */

import { NextRequest, NextResponse } from "next/server";
import { mapHtmlExport } from "@/lib/import/html-crm";
import { OWNER_ID } from "@/lib/utils";
import { and, eq, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        error: "Import braucht DATABASE_URL (Supabase) — Demo-Modus kann nicht persistieren.",
      },
      { status: 503 },
    );
  }
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");

  try {
    const body = await req.text();
    const ownerId = req.headers.get("x-owner-id") ?? OWNER_ID;
    const mapped = mapHtmlExport(body, ownerId);

    let inserted = 0;
    let skipped = 0;

    for (const lead of mapped) {
      const existing = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.ownerId, ownerId),
            eq(leads.company, lead.company),
            // Dedup auch über Telefon, sonst werden gleichnamige Betriebe
            // (Müller GmbH Hannover vs. Müller GmbH Celle) verworfen.
            lead.phone ? eq(leads.phone, lead.phone) : isNull(leads.phone),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await db.insert(leads).values(lead);
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      total: mapped.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 400 },
    );
  }
}
