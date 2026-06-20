/**
 * POST /api/souffleur/suggest
 *
 * Echtzeit-„Dirigent" via Claude Haiku: gibt dem Berater den EXAKTEN Satz vor,
 * den er jetzt wörtlich sagen soll — UND bestimmt die Gesprächswärme (Phase).
 * Nutzt das Gesprächs-Gedächtnis (letzte Kundenaussagen) + Branchen-Kontext +
 * Nein-Typ + Phasen-Hint, damit der Tipp zur Lage passt statt generisch zu sein.
 *
 * Nur aktiv mit ANTHROPIC_API_KEY — sonst freundlicher 200-Hinweis (der lokale
 * Matcher trägt den MVP ohne Key).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GOLDEN_RULES,
  NEIN_GRADIENTEN,
  classifyNein,
  type NeinTyp,
} from "@/lib/souffleur/strategies";
import { PHASES, isPhase, phaseGuidance, type Phase } from "@/lib/souffleur/phases";
import { requireAuth, parseJson } from "@/lib/api";
import { souffleurSuggestSchema } from "@/lib/validation";

const PHASE_MENU = PHASES.map((p) => `${p.key} (${p.tagline})`).join(" → ");

const SYSTEM = `Du bist der Live-Dirigent für ein Verkaufs-Telefonat (Kalt-Akquise in Deutschland).
Ein Solo-Berater verkauft Premium-Websites (~2.000 €) + Wartung an Handwerksbetriebe und liest WÖRTLICH ab, was du vorgibst.

Deine Aufgabe pro Antwort:
1) "line": Der EINE Satz, den der Berater JETZT sagen soll — natürlich, konkret, auf Augenhöhe, kein Floskel-Deutsch, keine Anführungszeichen, MAX 30 Wörter.
2) "phase": Die aktuelle Gesprächswärme: ${PHASE_MENU}.
3) "why": Max 6 Wörter, warum genau dieser Satz jetzt (für den Berater).

Ziel jedes Anrufs ist der nächste Schritt (ein konkreter Termin), nicht der Verkauf.

GOLDENE REGELN (immer einhalten):
${GOLDEN_RULES.map((r) => `- ${r}`).join("\n")}

Antworte AUSSCHLIESSLICH als valides JSON: {"line": "...", "phase": "kalt|lau|warm|heiss", "why": "..."}.`;

// GET: Verfügbarkeits-Check für den Readiness-Chip
export async function GET(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  return NextResponse.json({ ok: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message:
        "KI-Souffleur inaktiv — ANTHROPIC_API_KEY in .env.local setzen, dann diktiert Haiku live mit.",
    });
  }

  const parsed = await parseJson(req, souffleurSuggestSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });

    const tradeBlock = body.tradeContext
      ? `\nBranchen-Kontext:\n${body.tradeContext}\n`
      : "";

    // Nein-Gradient (Client kann vorgeben, sonst aus Transkript).
    const neinTyp =
      (body.neinTyp as NeinTyp | null) ?? classifyNein(body.transcript ?? "");
    const neinBlock = neinTyp
      ? `\nNein-Typ erkannt: ${neinTyp} → ${NEIN_GRADIENTEN.find((g) => g.typ === neinTyp)?.behandlung ?? ""}\n`
      : "";

    // Phasen-Hint + die Spielanweisung für genau diese Wärme.
    const phaseHint: Phase = isPhase(body.phase) ? body.phase : "kalt";
    const phaseBlock = `\nVermutete Gesprächswärme: ${phaseHint} → ${phaseGuidance(phaseHint)}\n`;
    const timeBlock =
      typeof body.elapsedSec === "number"
        ? `\nGesprächsdauer: ${Math.floor(body.elapsedSec / 60)}:${String(body.elapsedSec % 60).padStart(2, "0")} min\n`
        : "";

    // Voller Dialog-Verlauf (Berater + Kunde im Wechsel) — so versteht die KI den
    // GESPRÄCHS-Bogen und antwortet auf den letzten Kunden-Redezug, nicht auf einen
    // Wortfetzen. Fallback auf history/transcript für Alt-Clients.
    const turns = Array.isArray(body.turns) ? body.turns.slice(-8) : [];
    const dialog =
      turns.length > 0
        ? turns
            .map((t) => `${t.speaker === "advisor" ? "Berater" : "Kunde"}: ${t.text}`)
            .join("\n")
        : Array.isArray(body.history) && body.history.length > 0
          ? body.history.slice(-4).map((h) => `Kunde: ${h}`).join("\n")
          : `Kunde: ${(body.transcript ?? "").slice(-700)}`;

    const repNote = body.repName
      ? `\nName des Beraters (in [Name] einsetzen): ${body.repName}\n`
      : "";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      // System-Prompt cachen (5-Min-ephemeral) → schnellere + günstigere Folge-Calls.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Betrieb: ${body.company ?? "Handwerksbetrieb"}
Gewerk: ${body.trade ?? "unbekannt"}
Audit-Aufhänger: ${body.hook ?? "—"}${tradeBlock}${neinBlock}${phaseBlock}${timeBlock}${repNote}
Gesprächsverlauf (Berater = du selbst, Kunde = Gegenüber):
${dialog}

Der Kunde hat gerade ausgeredet. Gib NUR das JSON {"line","phase","why"} mit dem nächsten Satz, den der Berater jetzt sagen soll:`,
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
    const jsonStr =
      start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    let line = "";
    let phase: Phase = phaseHint;
    let why: string | null = null;
    try {
      const j = JSON.parse(jsonStr) as {
        line?: unknown;
        phase?: unknown;
        why?: unknown;
      };
      if (typeof j.line === "string") line = j.line.trim();
      if (isPhase(j.phase)) phase = j.phase;
      if (typeof j.why === "string") why = j.why.trim().slice(0, 80);
    } catch {
      // Kein valides JSON → die Rohantwort als Satz nehmen (besser als nichts).
      line = cleaned.replace(/^["']|["']$/g, "").trim();
    }

    if (!line) {
      line = "Erzählen Sie mir kurz, wie Kunden Sie aktuell finden.";
    }

    return NextResponse.json({ ok: true, line, phase, why });
  } catch (err) {
    console.error("[souffleur/suggest]", err);
    return NextResponse.json(
      { ok: false, message: "KI-Souffleur momentan nicht verfügbar." },
      { status: 200 },
    );
  }
}
