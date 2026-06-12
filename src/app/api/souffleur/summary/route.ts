/**
 * POST /api/souffleur/summary
 *
 * Post-Call-Zusammenfassung via Claude Haiku.
 * Nur aktiv, wenn ANTHROPIC_API_KEY gesetzt ist — sonst freundlicher
 * 200-Hinweis. Liefert kompaktes JSON: Stichpunkte, Sentiment, nächster Schritt.
 */

import { NextRequest, NextResponse } from "next/server";

const SYSTEM =
  "Du fasst ein Verkaufs-Telefonat für die Akquise-CRM eines Webdesigners zusammen. Antworte NUR als valides JSON.";

interface SummaryInput {
  transcript?: string;
  company?: string;
  trade?: string | null;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message: "KI inaktiv — ANTHROPIC_API_KEY fehlt.",
    });
  }

  const body = (await req.json()) as SummaryInput;

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

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, message: "Parse-Fehler" });
    }

    return NextResponse.json({ ok: true, ...(json as Record<string, unknown>) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `KI-Fehler: ${String(err)}` },
      { status: 200 },
    );
  }
}
