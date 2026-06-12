/**
 * POST /api/projects — Manuelles Anlegen aus dem Neu-Formular.
 * Ohne DATABASE_URL (Mock-Modus): 503 mit klarer Meldung.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { OWNER_ID } from "@/lib/utils";

interface NewProjectInput {
  name?: string;
  leadId?: string;
  status?: string;
  description?: string;
  deadline?: string;
}

export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as NewProjectInput;
  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Projektname ist Pflicht." },
      { status: 400 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { projects } = await import("@/db/schema");
    const ownerId = process.env.OWNER_ID ?? OWNER_ID;

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
        ownerId,
        leadId,
        name: body.name.trim(),
        status: (body.status?.trim() ||
          "planning") as (typeof projects.status.enumValues)[number],
        description: body.description?.trim() || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
      })
      .returning({ id: projects.id });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
