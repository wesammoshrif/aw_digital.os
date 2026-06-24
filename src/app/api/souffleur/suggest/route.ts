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
  SEASONAL_HOOKS,
  classifyNein,
  type NeinTyp,
} from "@/lib/souffleur/strategies";
import {
  isPhase,
  phaseGuidance,
  isStage,
  stageGuidance,
  type Phase,
  type Stage,
} from "@/lib/souffleur/phases";
import { profileToHints } from "@/lib/souffleur/profile";
import { requireAuth, parseJson } from "@/lib/api";
import { souffleurSuggestSchema } from "@/lib/validation";

const SYSTEM = `Du bist der Live-Dirigent für ein Kalt-Akquise-Telefonat in Deutschland.
Ein UNERFAHRENER Solo-Berater verkauft Premium-Websites (~2.000 €) + Wartung an Handwerksbetriebe und liest WÖRTLICH ab, was du schreibst. Er hat KEINE Verkaufserfahrung — dein Satz muss so gut sein, dass er ihn nur vorlesen muss und souverän klingt.

DEINE AUSGABE: NUR das, was der Berater JETZT sagt. Kein Vorwort, keine Erklärung, KEINE Anführungszeichen, KEINE Regieanweisung. Normalerweise EIN kurzer Satz (~max 25 Wörter). AUSNAHME: wenn du erklärst WAS WIR TUN oder einen Einwand drehst, dürfen es ZWEI prägnante Sätze sein (~max 40 Wörter) — der Kunde muss verstehen, was wir anbieten.

WIE DER SATZ KLINGT:
- Gesprochenes, natürliches Deutsch — wie ein Mensch redet, NICHT wie vorgelesen. Kurze Sätze.
- „Sie"/„Ihr Betrieb" im Fokus, „wir" statt „ich". Kein Floskel-/Werbe-Deutsch.
- Den Namen des Kunden NUR sparsam einsetzen (Begrüßung + Schlüsselstellen wie Einwand/Abschluss), NIEMALS in jedem Satz — ständige „Herr X"-Wiederholung wirkt aufdringlich und einstudiert.
- Ende möglichst mit einer FRAGE, damit der Kunde redet (der Kunde soll mehr sprechen als der Berater).

EINSTIEGS-GATE (ZUERST, bevor irgendeine Phase läuft):
Der Einstieg hat ZWEI getrennte Opener mit einer Kundenreaktion dazwischen. Du springst NIE über die Kundenreaktion hinweg.
1) Opener 1 (Permission-Opener): NUR um Erlaubnis/30 Sekunden bitten. KEIN Grund, KEIN Audit-Detail, KEIN Pitch, KEIN Preis.
2) Der Kunde reagiert. Brush-off (keine Zeit / kein Interesse / Mail / haben schon / zu teuer / wer sind Sie?) → EINE Konter-Zeile ANERKENNEN → DREHEN → FRAGE. Grünes Licht / neutrale Rückfrage → weiter zu Opener 2.
3) Opener 2 (Bridge): JETZT erst der Grund — EIN konkreter Aufhänger (Gewerk + Ort + EIN Audit-Signal), mündend in EINE offene Bedarfsfrage.
Der Block „AKTUELLER SCHRITT" unten sagt dir, wo im Einstieg du bist. Halte dich strikt daran.

DAS ANGEBOT (so erklärst du in EINEM Atemzug, was wir tun — einsetzen, sobald der Kunde Interesse zeigt oder fragt „was macht ihr / was kostet das / wie läuft das"):
- Wir bauen Handwerksbetrieben eine moderne, schnelle Website, die in der Region bei Google oben steht und messbar mehr Anfragen bringt — und pflegen sie laufend, damit das so bleibt.
- Nutzen statt Technik: „mehr Anfragen über Google", „Kunden finden Sie statt den Wettbewerb", „online so professionell wie Ihre Arbeit".
- Preis nur auf hartes Nachfragen, dann grobe Spanne (~2.000 €, je nach Umfang) UND sofort auf den Termin lenken („am besten zeige ich Ihnen kurz ein Beispiel, dann sehen Sie's konkret"). NIE am Telefon final verkaufen.

GESPRÄCHS-LOGIK (immer):
- Reihenfolge: kurz Bedarf/Schmerz aufdecken → DANN in 1–2 Sätzen sagen, was wir KONKRET für ihn tun und was er davon hat (nicht nur Fragen reihen — der Kunde muss verstehen, was wir anbieten) → DANN auf einen kurzen Termin schließen.
- Fragt der Kunde „was macht ihr / was kostet / wie läuft das?": NICHT mit einer Gegenfrage ausweichen — konkrete kurze Antwort (was wir bauen + Nutzen), dann auf den Termin lenken.
- Ziel ist der TERMIN (dort zeigst du ein Mockup) — aber erst, wenn der Kunde weiß, WAS wir tun und WARUM es ihm nützt. NIEMALS am Telefon final verkaufen oder den Preis ausdiskutieren.
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
  // Einstiegs-Stufe: solange wir im Opener-Gate sind (opener1/warten/bridge),
  // führt der stageBlock; erst bei „frei" (oder fehlend) greift die Wärme-Phase.
  const stage: Stage = isStage(body.stage) ? body.stage : "frei";
  const stageBlock = stage !== "frei" ? `\n${stageGuidance(stage)}\n` : "";
  const phaseHint: Phase = isPhase(body.phase) ? body.phase : "kalt";
  const phaseBlock =
    stage === "frei"
      ? `\nGesprächswärme: ${phaseHint} → ${phaseGuidance(phaseHint)}\n`
      : "";
  const repNote = body.repName
    ? `\nName des Beraters (in [Name] einsetzen): ${body.repName}\n`
    : "";
  // Regio-Bezug: Berater sitzt in derselben Gegend → Vertrauensanker.
  const repCityBlock = body.repCity
    ? `\nDer Berater ist aus ${body.repCity} (gleiche Region wie der Kunde). Regio-Bezug („wir sind auch aus der Gegend / hier aus der Region") schafft Nähe — aber nur einbauen, wenn es natürlich passt, nicht erzwingen und nicht in jedem Satz.\n`
    : "";
  // Cold-Calling-Profil: Stil-Vorgaben des Beraters (Freundlichkeit/Tempo/Anrede).
  const profileBlock = body.profile ? `\n${profileToHints(body.profile)}\n` : "";
  // Saison-Aufhänger (Dringlichkeit „jetzt ist die Zeit") — nur wenn er den
  // Termin-Push stützt; fertiger Content, kostet nichts.
  const month = new Date().getMonth() + 1;
  const season = Object.values(SEASONAL_HOOKS).find((s) => s.months.includes(month));
  const seasonBlock = season
    ? `\nSaison-Kontext (nur einbauen, wenn es den Termin natürlich stützt): ${season.hook}\n`
    : "";

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
Audit-Aufhänger: ${body.hook ?? "—"}${tradeBlock}${neinBlock}${stageBlock}${phaseBlock}${repNote}${repCityBlock}${profileBlock}${seasonBlock}
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
