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
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { appointmentSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const parsed = await parseJson(req, appointmentSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
    return serverError("appointments POST", err);
  }
}
