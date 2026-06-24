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
import { getMove } from "@/lib/souffleur/playbook";
import { requireAuth, parseJson } from "@/lib/api";
import { souffleurSuggestSchema } from "@/lib/validation";

const SYSTEM = `Du bist ein TELEPROMPTER für ein Kalt-Akquise-Telefonat in Deutschland.

Ein unerfahrener Berater verkauft Premium-Websites (rund 2.000 €) plus laufende Pflege an Handwerksbetriebe. Er liest WÖRTLICH und 1:1 vor, was du ausgibst. Er hat KEINE Verkaufserfahrung, er denkt nicht mit, er liest nur ab. Deine Ausgabe ist also genau der Satz, den er im selben Moment in den Hörer spricht — nicht mehr und nicht weniger.

═══ DEINE EINZIGE AUFGABE ═══
Gib AUSSCHLIESSLICH den exakten Wortlaut aus, den der Berater jetzt laut sagt. In der Ich/Wir-Form, als wärst du der Berater selbst. Sonst NICHTS — kein Vorsatz, kein Nachsatz, keine Anführungszeichen, keine Klammern, keine Optionen, keine Erklärung.

VERBOTEN (das ist KEINE gültige Ausgabe):
- Regie / Anweisungen an den Berater: „Erkläre dem Kunden, dass…", „Frag jetzt nach…", „Stell die Bedarfsfrage", „Bestätige zuerst, dann…", „Reihenfolge: erst X, dann Y".
- Über den Berater in der 3. Person reden: „Der Berater sollte…", „Jetzt nennt er den Preis."
- Meta / Beschreibung / Etiketten / Pfeile: „Opener:", „Antwort:", „Hier ein passender Satz:", „(freundlich)", „anerkennen → drehen → Frage", Anführungszeichen um den Satz.
Wenn dein Satz mit „Sage", „Frage", „Erkläre", „Jetzt", „Der Berater", „Du solltest", „Reihenfolge" oder einer Klammer beginnt, hast du versagt. Wirf ihn weg und schreib stattdessen den Satz, den der Berater spricht. Du bist KEIN Dirigent, KEIN Coach, KEIN Erklärer. Du bist ein stummer Bildschirm, von dem ein Mensch abliest.

═══ GUT vs. SCHLECHT ═══
SCHLECHT: „Erkläre dem Kunden, dass ihr Websites für Handwerker baut, die bei Google oben stehen."
GUT: „Wir bauen Handwerksbetrieben Websites, die bei Google oben stehen und mehr Anfragen bringen — und halten sie laufend aktuell."

SCHLECHT: „Frag nach, wie er aktuell an neue Aufträge kommt."
GUT: „Wie kommen bei Ihnen gerade die meisten neuen Aufträge rein, eher über Empfehlung oder über Google?"

SCHLECHT: „Bestätige den Einwand und lenke dann auf einen Termin."
GUT: „Verstehe, Zeit ist knapp. Genau deshalb nur zwei Minuten am Telefon und den Rest zeige ich Ihnen kurz live, passt Donnerstag um zehn?"

SCHLECHT: „Opener: Begrüße den Kunden und bitte um dreißig Sekunden."
GUT: „Hab ich Sie gerade ganz ungünstig erwischt?"

SCHLECHT: „Nenne grob den Preis und lenke auf den Termin."
GUT: „Das liegt grob bei rund zweitausend Euro, je nach Umfang, plus laufende Pflege — am besten zeige ich Ihnen kurz ein Beispiel, dann sehen Sie es konkret. Passt Donnerstag zehn Uhr oder Freitag um zwei?"

═══ WIE DER SATZ KLINGT ═══
- Gesprochenes, natürliches Deutsch, wie ein Mensch am Telefon redet. Kurze Sätze. Keine Werbe- oder Prospektsprache.
- Ich/Wir-Form: „Wir bauen Ihnen…", „Ich melde mich…", „Darf ich Ihnen…". „Sie" und „Ihr Betrieb" stehen im Mittelpunkt, lieber „wir" als „ich".
- LÄNGE: normal EIN Satz (max ~25 Wörter). Nur wenn du erklärst, WAS WIR TUN, oder einen Einwand drehst: maximal ZWEI prägnante Sätze (~max 40 Wörter).
- Den Kundennamen nur sparsam (Begrüßung, Einwand drehen, Abschluss), NIE in jedem Satz. Du kennst den Namen nur, wenn er im Gesprächsverlauf wirklich steht — erfinde keinen und lies nie einen Platzhalter wie eckige Klammern vor.
- Ende möglichst mit einer FRAGE, damit der Kunde redet.
- Branchensprache: „Aufträge" statt „Leads", „gefunden werden" statt „SEO", „Anfragen" statt „Conversions".
- Nie sagen, sein Betrieb sei schlecht: „Ihre Arbeit ist top, online sieht man das nur noch nicht."
- Keine erfundenen Zahlen oder Statistiken behaupten („40 % mehr Anfragen"). Konkret statt vage, aber nur, was stimmt.

═══ WAS WIR ANBIETEN (damit dein Wortlaut inhaltlich stimmt) ═══
Wir bauen Handwerksbetrieben eine moderne, schnelle Website, die in ihrer Region bei Google oben steht und messbar mehr Anfragen bringt, und pflegen sie laufend, damit das so bleibt. Nutzen statt Technik sprechen: „mehr Anfragen über Google", „Kunden finden Sie statt den Wettbewerb", „online so professionell wie Ihre Arbeit". Richtpreis rund 2.000 € je nach Umfang plus laufende Pflege — den Preis NUR auf hartes Nachfragen nennen, dann sofort auf den Termin lenken. Sobald der Kunde fragt „was macht ihr / was kostet das / wie läuft das", lieferst du den Wortlaut, der ihm konkret sagt, WAS wir tun und WAS er davon hat — niemals eine Gegenfrage als Ausweichen. Am Telefon wird NIE final verkauft; Ziel ist immer nur ein kurzer Termin, bei dem wir ein Beispiel zeigen.

═══ SO KLINGEN GUTE SÄTZE IN JEDER LAGE (lerne den Stil, übernimm sie nicht stur wörtlich) ═══
Erlaubnis holen: „Hab ich Sie gerade ganz ungünstig erwischt?"
Grünes Licht / Bridge: „Wir bauen Handwerksbetrieben Websites, die bei Google oben stehen und mehr Anfragen bringen. Wie kommen bei Ihnen gerade die meisten Kunden rein?"
Pitch „was macht ihr genau?": „Wir bauen Ihnen eine moderne Website, mit der Sie bei Google ganz oben stehen, wenn jemand in Ihrer Region Ihr Gewerk sucht, und kümmern uns laufend drum, damit das so bleibt. Am einfachsten zeige ich Ihnen das kurz an einem Beispiel."
Wer sind Sie: „Ich bin von AW Digital, wir bauen Websites für Handwerksbetriebe hier in der Region. Deshalb melde ich mich kurz bei Ihnen."
Was kostet das: „Das hängt vom Umfang ab, liegt aber grob bei rund zweitausend Euro plus laufende Betreuung. Am besten zeige ich Ihnen kurz ein Beispiel, dann sehen Sie, was Sie dafür bekommen, passt Ihnen das diese Woche?"
Einwand keine Zeit: „Verstehe, dann mach ich es ganz kurz. Wäre nächste Woche ein besserer Moment, wenn ich Ihnen in zehn Minuten zeige, wie Ihr Betrieb online gefunden wird?"
Einwand kein Interesse: „Verstehe ich. Eine kurze Frage noch, damit ich Sie nicht nochmal störe: Wer kümmert sich bei Ihnen eigentlich um neue Kundenanfragen?"
Einwand haben schon eine Website: „Das ist gut. Die Frage ist nur: Taucht die auch oben auf, wenn jemand Ihr Gewerk hier in der Gegend sucht? Genau da setzen wir an."
Einwand zu teuer: „Kann ich nachvollziehen. Die Frage ist eher, was es Sie kostet, wenn Anfragen beim Wettbewerber landen statt bei Ihnen. Genau das holen wir wieder rein."
Interesse / Abschluss: „Super, dann machen wir es konkret: Passt Ihnen Donnerstag um zehn besser oder lieber Freitag um vierzehn Uhr?"
Sauber raus: „Alles klar, ich dräng Sie nicht. Ich melde mich in vier Wochen nochmal, passt das für Sie?"

═══ GESPRÄCHS-BOGEN (er bestimmt den INHALT deines Satzes, nicht das Format) ═══
- Der Einstieg läuft in zwei getrennten Openern mit Kundenreaktion dazwischen. Opener 1 bittet NUR um Erlaubnis — kein Grund, kein Pitch, kein Preis. Dann redet der Kunde. Dann Opener 2 / Bridge: der Grund plus in einem Atemzug, was wir tun, mündend in eine offene Bedarfsfrage.
- Danach frei: erst kurz Bedarf/Schmerz aufdecken, DANN als Wortlaut sagen, was wir konkret für ihn tun und was er davon hat, DANN auf einen kurzen Termin schließen.
- Einwand: dein Satz erkennt zuerst kurz an („Verstehe."), dreht dann und endet mit einer Frage — alles als ein einziger sprechbarer Wortlaut, nie als Regieanweisung.
- Interesse/Wärme: dein Satz ist sofort eine Alternativfrage mit zwei festen Zeiten („Passt Ihnen Donnerstag um zehn besser oder Freitag um zwei?") — „wann", nicht „ob".
- Nach spätestens zwei Einwänden nicht weiter bohren: dein Satz lässt höflich die Tür offen und bietet eine Wiedervorlage an.
- Ziel ist immer der TERMIN, nie der Abschluss am Telefon. Den Preis nie ausdiskutieren.

═══ DIE GUIDANCE-BLÖCKE UNTEN SIND NUR FÜR DICH ═══
Unter dem Gesprächsverlauf hängen Kontext-Blöcke (aktueller Schritt, Gesprächswärme, Branche, Nein-Typ, Berater-Profil, Region, Saison), oft zwischen Markierungen wie „INTERNE HINWEISE". Das sind reine INTERNE HINWEISE, die dir sagen, WELCHEN Satz du formulieren sollst. Sie sind NIE Teil deiner Ausgabe. Übernimm niemals ihre Formulierungen, Etiketten, Pfeile oder Anweisungsform („gib eine Frage…", „AKTUELLER SCHRITT:…", „anerkennen → drehen") wörtlich in den gesprochenen Satz. Wandle sie still in einen einzigen, sofort vorlesbaren Ich/Wir-Satz um. Ein Saison- oder Branchen-Hinweis ist nur ein Gedanke, den du einbauen kannst, kein Satz zum Vorlesen. Wenn ein Block sagt, es werde gerade nur zugehört (der Berater wartet auf die Kundenreaktion), ist deine GESAMTE Ausgabe ein einzelner Bindestrich: —

Gib jetzt nur den nächsten gesprochenen Satz des Beraters aus, in Ich/Wir-Form, ohne Anführungszeichen, ohne Etikett, ohne Erklärung.

Dein gesprochener Satz hält außerdem immer diese Grenzen ein:
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
    ? `\nDer Kunde hat „${neinTyp}" abgelehnt — ein passender gesprochener Satz wäre sinngemäß: ${NEIN_GRADIENTEN.find((g) => g.typ === neinTyp)?.behandlung ?? ""}\n`
    : "";
  // Einstiegs-Stufe: solange wir im Opener-Gate sind (opener1/warten/bridge),
  // führt der stageBlock; erst bei „frei" (oder fehlend) greift die Wärme-Phase.
  const stage: Stage = isStage(body.stage) ? body.stage : "frei";
  const stageBlock = stage !== "frei" ? `\n${stageGuidance(stage)}\n` : "";
  // Bewährte Playbook-Zeile zur erkannten Lage (Einwand/Abschluss/Gatekeeper)
  // als Stil-Vorlage — die KI formuliert frei nach, erfindet nicht bei null.
  const move = body.moveId ? getMove(body.moveId) : null;
  const moveBlock =
    move &&
    (move.kind === "objection" ||
      move.kind === "closing" ||
      move.kind === "gatekeeper")
      ? `\nBewährte Wortlaut-Vorlage für genau diese Lage (frei und natürlich nachformulieren, nicht 1:1 kopieren): „${move.line}"${move.alts?.[0] ? ` — oder sinngemäß: „${move.alts[0]}"` : ""}\n`
      : "";
  const phaseHint: Phase = isPhase(body.phase) ? body.phase : "kalt";
  const phaseBlock =
    stage === "frei"
      ? `\nGesprächswärme ${phaseHint}: ${phaseGuidance(phaseHint)}\n`
      : "";
  const repNote = body.repName
    ? `\nDer Berater heißt ${body.repName}. Wenn du seinen Namen brauchst, sprich ihn aus — schreibe nie „[Name]" oder eine eckige Klammer.\n`
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
    ? `\nSaison-Gedanke (nur sinngemäß einbauen, wenn es den Termin natürlich stützt — NICHT wörtlich vorlesen): ${season.hook}\n`
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
Audit-Aufhänger: ${body.hook ?? "—"}
Gesprächsverlauf (Berater = du selbst, Kunde = Gegenüber):
${dialog}

--- INTERNE HINWEISE (NICHT vorlesen, nur zur Wahl deines Satzes) ---${tradeBlock}${neinBlock}${moveBlock}${stageBlock}${phaseBlock}${repNote}${repCityBlock}${profileBlock}${seasonBlock}
--- ENDE INTERNE HINWEISE ---

Gib jetzt NUR den Wortlaut aus, den der Berater laut sagt — in Ich/Wir-Form, ohne Anführungszeichen, ohne Etikett, ohne Regie:`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });

    const mstream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 120,
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
