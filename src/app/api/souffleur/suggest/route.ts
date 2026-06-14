/**
 * POST /api/souffleur/suggest
 *
 * Echtzeit-Souffleur-Verfeinerung via Claude Haiku.
 * Nur aktiv, wenn ANTHROPIC_API_KEY gesetzt ist — sonst freundlicher
 * 200-Hinweis (der lokale Matcher trägt den MVP ohne Key).
 *
 * Latenz-optimiert: kleines max_tokens, knapper Prompt, ein Satz.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GOLDEN_RULES,
  NEIN_GRADIENTEN,
  classifyNein,
  type NeinTyp,
} from "@/lib/souffleur/strategies";

const SYSTEM = `Du bist ein Echtzeit-Verkaufs-Souffleur für Kalt-Akquise in Deutschland.
Ein Solo-Berater verkauft Premium-Websites (~2.000 €) + Wartung an Handwerksbetriebe.
Du bekommst das letzte Transkript des Gesprächs und ggf. branchenspezifischen Kontext.
Nutze die Brancheninfos, um den Tipp passend zum Gewerk zu formulieren.
Gib GENAU EINEN Satz zurück, den der Berater JETZT sagen soll — natürlich, konkret,
auf Augenhöhe, kein Floskel-Deutsch, keine Anführungszeichen, keine Erklärung.
Maximal 30 Wörter. Ziel jedes Anrufs: der nächste Schritt (Termin), nicht der Verkauf.

GOLDENE REGELN (immer einhalten):
${GOLDEN_RULES.map((r) => `- ${r}`).join("\n")}`;

// GET: Verfügbarkeits-Check für den Readiness-Chip
export async function GET() {
  return NextResponse.json({ ok: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message:
        "KI-Souffleur inaktiv — ANTHROPIC_API_KEY in .env.local setzen, dann tippt Haiku live mit.",
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    transcript?: string;
    hook?: string | null;
    company?: string;
    trade?: string | null;
    tradeContext?: string | null;
    neinTyp?: NeinTyp | null;
    phase?: string | null;
  };

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });

    const tradeBlock = body.tradeContext
      ? `\nBranchen-Kontext:\n${body.tradeContext}\n`
      : "";

    // Nein-Gradient erkennen (Client kann vorgeben, sonst aus Transkript).
    const neinTyp = body.neinTyp ?? classifyNein(body.transcript);
    const neinBlock = neinTyp
      ? `\nNein-Typ erkannt: ${neinTyp} → ${NEIN_GRADIENTEN.find((g) => g.typ === neinTyp)?.behandlung ?? ""}\n`
      : "";
    const phaseBlock = body.phase ? `\nGesprächsphase: ${body.phase}\n` : "";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Betrieb: ${body.company ?? "Handwerksbetrieb"}
Gewerk: ${body.trade ?? "unbekannt"}
Audit-Aufhänger: ${body.hook ?? "—"}${tradeBlock}${neinBlock}${phaseBlock}
Letztes Transkript: "${body.transcript ?? ""}"

Der nächste Satz, den ich sagen soll:`,
        },
      ],
    });

    const line =
      msg.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join(" ")
        .trim() || "Erzählen Sie mir kurz, wie Kunden Sie aktuell finden.";

    return NextResponse.json({ ok: true, line });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `KI-Fehler: ${String(err)}` },
      { status: 200 },
    );
  }
}
