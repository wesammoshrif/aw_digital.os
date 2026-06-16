/**
 * POST /api/projects — Manuelles Anlegen aus dem Neu-Formular.
 * Ohne DATABASE_URL (Mock-Modus): 503 mit klarer Meldung.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { OWNER_ID } from "@/lib/utils";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { projectCreateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  if (isMockMode) {
    return NextResponse.json(
      {
        ok: false,
        mock: true,
        message: "Demo-Modus: ohne DATABASE_URL wird nicht gespeichert.",
      },
      { status: 503 },
    );
  }

  const parsed = await parseJson(req, projectCreateSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!body.name.trim()) {
    return NextResponse.json(
      { ok: false, error: "Projektname ist Pflicht." },
      { status: 400 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { projects } = await import("@/db/schema");

    const leadId = body.leadId?.trim();
    if (!leadId) {
      return NextResponse.json(
        { ok: false, error: "Lead-Zuordnung (Lead-ID) ist Pflicht." },
        { status: 400 },
      );
    }

    const [row] = await db
      .insert(projects)
      .values({
        ownerId: OWNER_ID,
        leadId,
        name: body.name.trim(),
        status: (body.status?.trim() ||
          "planning") as (typeof projects.status.enumValues)[number],
        description: body.description?.trim() || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
      })
      .returning({ id: projects.id });

    if (!row) {
      return NextResponse.json({ ok: false, error: "Insert ohne Ergebnis" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return serverError("projects POST", err);
  }
}
