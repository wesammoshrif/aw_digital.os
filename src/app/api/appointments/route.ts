/**
 * POST /api/appointments — speichert einen vereinbarten Termin.
 *
 * Body: { leadId, startsAt (ISO), title? }
 * Schreibt eine appointments-Row inkl. reminderAt (24h vorher), damit der
 * Cron-Tick die Termin-Erinnerung versenden kann. Mock-Modus = No-Op ok:true.
 */
import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { createAppointment } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    leadId?: string;
    startsAt?: string;
    title?: string;
  };

  if (!body.leadId?.trim() || !body.startsAt) {
    return NextResponse.json(
      { ok: false, error: "leadId und startsAt sind Pflicht." },
      { status: 400 },
    );
  }
  const startsAt = new Date(body.startsAt);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges Datum." },
      { status: 400 },
    );
  }

  if (isMockMode) return NextResponse.json({ ok: true, mock: true });

  try {
    const row = await createAppointment({
      leadId: body.leadId.trim(),
      startsAt,
      title: body.title?.trim() || undefined,
    });
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Termin konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
