/**
 * POST /api/souffleur/suggest
 *
 * Echtzeit-„Dirigent" via Claude Haiku — STREAMING: gibt den Satz, den der
 * Berater jetzt wörtlich sagen soll, Wort für Wort als reinen Text-Stream zurück
 * (fühlt sich live an, statt 1,8 s am Stück zu warten).
 *
 * Kontext = voller rundenbasierter Dialog (Berater + Kunde im Wechsel). Die
 * Gesprächswärme (Phase) wird im Frontend lokal geschätzt; hier nur als Hint.
 *
 * Nur aktiv mit ANTHROPIC_API_KEY — sonst JSON-Hinweis (der lokale Matcher
 * trägt den MVP ohne Key).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GOLDEN_RULES,
  NEIN_GRADIENTEN,
  classifyNein,
  type NeinTyp,
} from "@/lib/souffleur/strategies";
import { isPhase, phaseGuidance, type Phase } from "@/lib/souffleur/phases";
import { profileToHints } from "@/lib/souffleur/profile";
import { requireAuth, parseJson } from "@/lib/api";
import { souffleurSuggestSchema } from "@/lib/validation";

const SYSTEM = `Du bist der Live-Dirigent für ein Kalt-Akquise-Telefonat in Deutschland.
Ein UNERFAHRENER Solo-Berater verkauft Premium-Websites (~2.000 €) + Wartung an Handwerksbetriebe und liest WÖRTLICH ab, was du schreibst. Er hat KEINE Verkaufserfahrung — dein Satz muss so gut sein, dass er ihn nur vorlesen muss und souverän klingt.

DEINE AUSGABE: NUR der EINE Satz, den der Berater JETZT sagt. Kein Vorwort, keine Erklärung, KEINE Anführungszeichen, KEINE Regieanweisung. MAX 25 Wörter.

WIE DER SATZ KLINGT:
- Gesprochenes, natürliches Deutsch — wie ein Mensch redet, NICHT wie vorgelesen. Kurze Sätze.
- „Sie"/„Ihr Betrieb" im Fokus, „wir" statt „ich". Kein Floskel-/Werbe-Deutsch.
- Ende möglichst mit einer FRAGE, damit der Kunde redet (der Kunde soll mehr sprechen als der Berater).

GESPRÄCHS-LOGIK (immer):
- Ziel ist NUR der nächste Schritt: ein konkreter TERMIN. NIEMALS am Telefon verkaufen oder den Preis ausdiskutieren.
- Einwand? ERST anerkennen („Verstehe."), DANN kurz drehen, DANN eine Frage. Nie rechtfertigen, nie streiten.
- Nach SPÄTESTENS 2 Einwänden nicht weiter bohren: höflich Tür offen lassen + Wiedervorlage anbieten („Dann melde ich mich in vier Wochen nochmal — passt das?").
- Zeigt der Kunde Interesse/Wärme → SOFORT auf den Termin schließen mit einer ALTERNATIVFRAGE (zwei feste Zeiten): „Passt Ihnen Donnerstag 10 Uhr besser oder Freitag 14 Uhr?" — nicht „ob", sondern „wann".
- Hängt das Gespräch → gib den einfachsten nächsten Satz, der es am Leben hält.

GOLDENE REGELN (immer einhalten):
${GOLDEN_RULES.map((r) => `- ${r}`).join("\n")}`;

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

  // ── Kontext zusammenbauen ──────────────────────────────────────
  const tradeBlock = body.tradeContext
    ? `\nBranchen-Kontext:\n${body.tradeContext}\n`
    : "";
  const neinTyp =
    (body.neinTyp as NeinTyp | null) ?? classifyNein(body.transcript ?? "");
  const neinBlock = neinTyp
    ? `\nNein-Typ erkannt: ${neinTyp} → ${NEIN_GRADIENTEN.find((g) => g.typ === neinTyp)?.behandlung ?? ""}\n`
    : "";
  const phaseHint: Phase = isPhase(body.phase) ? body.phase : "kalt";
  const phaseBlock = `\nGesprächswärme: ${phaseHint} → ${phaseGuidance(phaseHint)}\n`;
  const repNote = body.repName
    ? `\nName des Beraters (in [Name] einsetzen): ${body.repName}\n`
    : "";
  // Cold-Calling-Profil: Stil-Vorgaben des Beraters (Freundlichkeit/Tempo/Anrede).
  const profileBlock = body.profile ? `\n${profileToHints(body.profile)}\n` : "";

  // Voller Dialog-Verlauf (Berater + Kunde im Wechsel).
  const turns = Array.isArray(body.turns) ? body.turns.slice(-8) : [];
  const dialog =
    turns.length > 0
      ? turns
          .map((t) => `${t.speaker === "advisor" ? "Berater" : "Kunde"}: ${t.text}`)
          .join("\n")
      : `Kunde: ${(body.transcript ?? "").slice(-700)}`;

  const userPrompt = `Betrieb: ${body.company ?? "Handwerksbetrieb"}
Gewerk: ${body.trade ?? "unbekannt"}
Audit-Aufhänger: ${body.hook ?? "—"}${tradeBlock}${neinBlock}${phaseBlock}${repNote}${profileBlock}
Gesprächsverlauf (Berater = du selbst, Kunde = Gegenüber):
${dialog}

Der Kunde hat gerade ausgeredet. Schreibe NUR den nächsten Satz für den Berater:`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });

    const mstream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      // System-Prompt cachen (greift ab ~langem Prompt) → günstigere Folge-Calls.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of mstream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (e) {
          console.error("[souffleur/suggest] stream:", e);
        } finally {
          controller.close();
        }
      },
      cancel() {
        try {
          mstream.abort();
        } catch {
          /* ignore */
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[souffleur/suggest]", err);
    return NextResponse.json(
      { ok: false, message: "KI-Souffleur momentan nicht verfügbar." },
      { status: 200 },
    );
  }
}
