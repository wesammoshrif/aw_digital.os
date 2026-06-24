/**
 * POST /api/calls — Speichert einen abgeschlossenen Anruf.
 *
 * Im Mock-Modus (ohne DATABASE_URL) ein No-Op mit ok:true, damit der Client
 * nicht scheitert. Mit DB: Insert in die calls-Tabelle.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { getSessionUser } from "@/lib/auth/session";
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
  const user = (await getSessionUser())!;

  const parsed = await parseJson(req, callCreateSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  // Mock-Guard: kein DB-Zugriff, aber freundliches ok für den Client.
  if (isMockMode) {
    return NextResponse.json({ ok: true, mock: true });
  }

  const leadId = body.leadId.trim();
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(leadId)) {
    return NextResponse.json({ ok: false, error: "Ungültige Lead-ID" }, { status: 400 });
  }

  try {
    const { db } = await import("@/db");
    const { calls, leads } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    // IDOR-Schutz: Anruf nur an einen Lead hängen, der dem User gehört
    // (Admin an alle). Insert läuft über Superuser-db (umgeht RLS).
    const scope =
      user.role === "admin"
        ? eq(leads.id, leadId)
        : and(eq(leads.id, leadId), eq(leads.ownerId, user.id));
    const [owned] = await db.select({ id: leads.id }).from(leads).where(scope).limit(1);
    if (!owned) {
      return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
    }

    const dispo =
      body.dispo && DISPO_VALUES.includes(body.dispo as Dispo)
        ? (body.dispo as Dispo)
        : undefined;

    await db.insert(calls).values({
      ownerId: user.id,
      leadId,
      ...(dispo ? { dispo } : {}),
      durationSec: body.durationSec ?? null,
      transcript: body.transcript ?? null,
      summary: body.summary ?? null,
      sentiment: body.sentiment ?? null,
      externalCallId: body.externalCallId ?? null,
      externalProvider: "easybell",
      // startedAt aus der real gemessenen Dauer ableiten (statt = endedAt),
      // sonst ist endedAt - startedAt ≈ 0 und widerspricht durationSec.
      startedAt: new Date(Date.now() - (body.durationSec ?? 0) * 1000),
      endedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("calls POST", err);
  }
}
