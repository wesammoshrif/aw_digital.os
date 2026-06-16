/**
 * POST /api/import
 *
 * Nimmt JSON-Export der bestehenden HTML-CRM entgegen und legt Leads
 * idempotent (deduped per company+phone) im neuen Schema an.
 */

import { NextRequest, NextResponse } from "next/server";
import { mapHtmlExport } from "@/lib/import/html-crm";
import { getSessionUser } from "@/lib/auth/session";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth, serverError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

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
    // Größenbegrenzung gegen übergroße Payloads (~5 MB).
    if (body.length > 5_000_000) {
      return NextResponse.json(
        { ok: false, error: "Import-Datei zu groß (max 5 MB)." },
        { status: 413 },
      );
    }
    const user = (await getSessionUser())!;
    const ownerId = user.id;
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
    return serverError("import POST", err);
  }
}
