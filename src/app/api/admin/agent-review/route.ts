/**
 * Phase 8 — KI-Mitarbeiter-Bewertung (VERTRAULICH, nur Admins).
 *
 * POST /api/admin/agent-review  Body: { agentId, periodDays? }
 *   → sammelt Kennzahlen, lässt Claude (oder rechnerisch) eine Bewertung
 *     erzeugen und speichert sie in agent_reviews (RLS = is_admin()).
 *
 * GET /api/admin/agent-review?agentId=…  → vergangene Bewertungen.
 *
 * Doppeltes Gate: requireAuth (Session + Freigabe + Same-Origin) UND
 * me.role === "admin". agent_reviews ist für Agents komplett unsichtbar.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, parseJson, serverError } from "@/lib/api";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db/rls";
import { isMockMode } from "@/lib/mode";
import { agentReviewSchema } from "@/lib/validation";
import {
  computeAgentMetrics,
  generateAgentReview,
  deterministicReview,
} from "@/lib/reviews/agentReview";

type Gate = { denied: NextResponse } | { denied: null; me: SessionUser };

async function adminGate(req: NextRequest): Promise<Gate> {
  const denied = await requireAuth(req);
  if (denied) return { denied };
  const me = (await getSessionUser())!;
  if (me.role !== "admin") {
    return { denied: NextResponse.json({ ok: false, error: "Nur Admins." }, { status: 403 }) };
  }
  return { denied: null, me };
}

export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (gate.denied) return gate.denied;
  const me = gate.me;

  if (isMockMode) {
    return NextResponse.json({
      ok: false,
      message: "Mitarbeiter-Bewertungen brauchen die Datenbank (Demo-Modus inaktiv).",
    });
  }

  const parsed = await parseJson(req, agentReviewSchema);
  if (parsed.response) return parsed.response;
  const { agentId, periodDays = 30 } = parsed.data;

  try {
    const { db } = await import("@/db");
    const { profiles, agentReviews } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [profile] = await db
      .select({ id: profiles.id, name: profiles.name, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, agentId))
      .limit(1);
    if (!profile) {
      return NextResponse.json({ ok: false, error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    }

    const metrics = await computeAgentMetrics(agentId, periodDays);

    const key = process.env.ANTHROPIC_API_KEY;
    let draft;
    if (key) {
      try {
        draft = await generateAgentReview({ name: profile.name, metrics, apiKey: key });
      } catch (aiErr) {
        // KI nicht verfügbar (Key/Modell) → rechnerische Bewertung statt Fehler.
        console.error("[admin/agent-review] KI fehlgeschlagen, nutze Fallback:", aiErr);
        draft = deterministicReview(metrics);
      }
    } else {
      draft = deterministicReview(metrics);
    }

    // Speichern über withRls(me): is_admin()=true erfüllt die WITH-CHECK-Policy.
    const [saved] = await withRls(me, (tx) =>
      tx
        .insert(agentReviews)
        .values({
          agentId,
          periodStart: new Date(metrics.since),
          periodEnd: new Date(),
          rating: draft.rating,
          strengths: draft.strengths,
          weaknesses: draft.weaknesses,
          failurePoints: draft.failurePoints,
          summary: draft.summary,
          coaching: draft.coaching,
          callsAnalyzed: metrics.calls.total,
        })
        .returning(),
    );

    // metrics NICHT zurückgeben: recentCalls enthält PII-Transkripte, die der
    // Client nicht braucht (die Seite zeigt nur aggregierte KPIs + die Bewertung).
    return NextResponse.json({
      ok: true,
      review: saved,
      generatedBy: draft.generatedBy,
    });
  } catch (err) {
    return serverError("admin/agent-review:POST", err);
  }
}

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (gate.denied) return gate.denied;
  const me = gate.me;

  if (isMockMode) {
    return NextResponse.json({ ok: true, reviews: [] });
  }

  const rawId = req.nextUrl.searchParams.get("agentId");
  const parsedId = z.string().uuid().safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json(
      { ok: false, error: "Ungültige agentId." },
      { status: 400 },
    );
  }
  const agentId = parsedId.data;

  try {
    const { agentReviews } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");

    const reviews = await withRls(me, (tx) =>
      tx
        .select()
        .from(agentReviews)
        .where(eq(agentReviews.agentId, agentId))
        .orderBy(desc(agentReviews.createdAt)),
    );

    return NextResponse.json({ ok: true, reviews });
  } catch (err) {
    return serverError("admin/agent-review:GET", err);
  }
}
