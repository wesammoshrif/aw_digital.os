/**
 * POST /api/souffleur/summary
 *
 * Post-Call-Zusammenfassung via Claude Haiku.
 * Nur aktiv, wenn ANTHROPIC_API_KEY gesetzt ist — sonst freundlicher
 * 200-Hinweis. Liefert kompaktes JSON: Stichpunkte, Sentiment, nächster Schritt.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, parseJson } from "@/lib/api";
import { souffleurSummarySchema } from "@/lib/validation";

const SYSTEM =
  "Du fasst ein Verkaufs-Telefonat für die Akquise-CRM eines Webdesigners zusammen. Antworte NUR als valides JSON.";

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message: "KI inaktiv — ANTHROPIC_API_KEY fehlt.",
    });
  }

  const parsed = await parseJson(req, souffleurSummarySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!body.transcript?.trim()) {
    return NextResponse.json({ ok: false, message: "Kein Transkript." });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Betrieb: ${body.company ?? "Handwerksbetrieb"}
Gewerk: ${body.trade ?? "unbekannt"}
Transkript:
"${body.transcript}"

Gib NUR dieses JSON zurück:
{
  "summary": ["max 3 kurze Stichpunkte"],
  "sentiment": "positive|neutral|negative",
  "nextStep": "ein konkreter nächster Schritt"
}`,
        },
      ],
    });

    const raw = msg.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join(" ")
      .trim();

    const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonStr = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    let json: unknown;
    try {
      json = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ ok: false, message: "Parse-Fehler" });
    }

    return NextResponse.json({ ok: true, ...(json as Record<string, unknown>) });
  } catch (err) {
    console.error("[souffleur/summary]", err);
    return NextResponse.json(
      { ok: false, message: "KI momentan nicht verfügbar." },
      { status: 200 },
    );
  }
}
