/**
 * GET /api/leads/[id]/export — DSGVO-Auskunft & Datenübertragbarkeit
 * (Art. 15/20). Liefert alle zu einem Lead gespeicherten Daten als JSON-Download
 * (Lead + Aktivitäten, Anrufe, Termine, Audits, Belege). Owner-gescoped.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "Export braucht eine verbundene Datenbank." },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { leads, activities, calls, appointments, audits, invoices } =
      await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const [lead] = await db
      .select()
      .from(leads)
      .where(
        user.role === "admin"
          ? eq(leads.id, id)
          : and(eq(leads.id, id), eq(leads.ownerId, user.id)),
      )
      .limit(1);

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: "Lead nicht gefunden." },
        { status: 404 },
      );
    }

    const [acts, callRows, appts, auditRows, invoiceRows] = await Promise.all([
      db.select().from(activities).where(eq(activities.leadId, id)),
      db.select().from(calls).where(eq(calls.leadId, id)),
      db.select().from(appointments).where(eq(appointments.leadId, id)),
      db.select().from(audits).where(eq(audits.leadId, id)),
      db.select().from(invoices).where(eq(invoices.leadId, id)),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      lead,
      activities: acts,
      calls: callRows,
      appointments: appts,
      audits: auditRows,
      invoices: invoiceRows,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lead-${id}-export.json"`,
      },
    });
  } catch (err) {
    return serverError("leads/[id] export", err);
  }
}
