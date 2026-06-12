/**
 * PATCH /api/leads/[id]
 *
 * Quick-Update einzelner Felder (Status, Versuche, nächster Schritt,
 * Wiedervorlage-Datum, Notiz-Anhang).
 * Funktioniert sofort: ohne DATABASE_URL als No-Op (optimistic UI bleibt
 * stehen), mit Supabase persistiert es via Drizzle.
 */

import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: string;
    attempts?: number;
    nextStep?: string;
    nextStepAt?: string;
    note?: string;
    locked?: boolean;
  };

  // Kein DB verbunden → optimistic UI im Client genügt.
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true, id, ...body });
  }

  try {
    const { db } = await import("@/db");
    const { leads } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) patch.status = body.status;
    if (typeof body.attempts === "number") patch.attempts = body.attempts;
    if (body.nextStep) patch.nextStep = body.nextStep;
    if (body.nextStepAt) {
      const d = new Date(body.nextStepAt);
      if (!isNaN(d.getTime())) patch.nextStepAt = d;
    }
    if (typeof body.locked === "boolean") patch.locked = body.locked;
    if (body.note?.trim()) {
      // Notiz anhängen statt überschreiben
      const [row] = await db
        .select({ notes: leads.notes })
        .from(leads)
        .where(eq(leads.id, id));
      const stamp = new Date().toLocaleDateString("de-DE");
      const entry = `[${stamp}] ${body.note.trim()}`;
      patch.notes = row?.notes ? `${row.notes}\n${entry}` : entry;
    }

    await db.update(leads).set(patch).where(eq(leads.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
