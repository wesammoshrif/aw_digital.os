/**
 * POST /api/calls — Speichert einen abgeschlossenen Anruf.
 *
 * Im Mock-Modus (ohne DATABASE_URL) ein No-Op mit ok:true, damit der Client
 * nicht scheitert. Mit DB: Insert in die calls-Tabelle.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { OWNER_ID } from "@/lib/utils";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { callCreateSchema } from "@/lib/validation";

const DISPO_VALUES = [
  "no_answer",
  "voicemail",
  "busy",
  "interested",
  "appointment",
  "callback",
  "not_interested",
  "wrong_number",
] as const;

type Dispo = (typeof DISPO_VALUES)[number];

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const parsed = await parseJson(req, callCreateSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  // Mock-Guard: kein DB-Zugriff, aber freundliches ok für den Client.
  if (isMockMode) {
    return NextResponse.json({ ok: true, mock: true });
  }

  try {
    const { db } = await import("@/db");
    const { calls } = await import("@/db/schema");

    const dispo =
      body.dispo && DISPO_VALUES.includes(body.dispo as Dispo)
        ? (body.dispo as Dispo)
        : undefined;

    await db.insert(calls).values({
      ownerId: OWNER_ID,
      leadId: body.leadId.trim(),
      ...(dispo ? { dispo } : {}),
      durationSec: body.durationSec ?? null,
      transcript: body.transcript ?? null,
      summary: body.summary ?? null,
      sentiment: body.sentiment ?? null,
      externalCallId: body.externalCallId ?? null,
      externalProvider: "easybell",
      startedAt: new Date(),
      endedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("calls POST", err);
  }
}
