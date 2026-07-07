/**
 * POST /api/leads — Manuelles Anlegen aus dem Neu-Formular.
 * Ohne DATABASE_URL: 503 mit klarer Meldung, damit der Client den User informiert.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { leadCreateSchema } from "@/lib/validation";
import { parseTrade } from "@/lib/enrich";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const parsed = await parseJson(req, leadCreateSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!body.company.trim()) {
    return NextResponse.json(
      { ok: false, error: "Firma ist Pflicht." },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        mock: true,
        error:
          "Lead-Anlage braucht eine verbundene Datenbank. Bitte Supabase einrichten.",
      },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { leads } = await import("@/db/schema");

    const [row] = await db
      .insert(leads)
      .values({
        ownerId: user.id,
        company: body.company.trim(),
        trade:
          body.trade?.trim() ||
          parseTrade(body.company, body.website) ||
          null,
        city: body.city?.trim() || null,
        postalCode: body.postalCode?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        website: body.website?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "new",
        source: "manual",
        nextStep: "Erstanruf",
        nextStepAt: new Date(),
      })
      .returning({ id: leads.id });

    if (!row) {
      return NextResponse.json({ ok: false, error: "Insert ohne Ergebnis" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return serverError("leads POST", err);
  }
}
