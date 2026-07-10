"use client";

/*
 * ───────────────────────────────────────────────────────────────────────────
 *  © 2026 Wesam Ephraim Moshrif. Alle Rechte vorbehalten.
 *  Urheber und Rechteinhaber dieses Codes: Wesam Ephraim Moshrif.
 *  Author / copyright holder of this code: Wesam Ephraim Moshrif.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  X,
  Copy,
  Check,
  TestTube,
  Zap,
  Flame,
  ChevronDown,
  Headphones,
  ArrowRight,
} from "lucide-react";
import type { Lead } from "@/db/schema";
import {
  QUICK_OBJECTIONS,
  CLOSING_TECHNIQUES,
  VOICEMAIL_SCRIPT,
  getMove,
  fillHook,
  type Move,
} from "@/lib/souffleur/playbook";
import { matchMove } from "@/lib/souffleur/matcher";
import {
  classifyNein,
  NEIN_GRADIENTEN,
  POWER_QUESTIONS,
  MICRO_COMMITMENTS,
} from "@/lib/souffleur/strategies";
import {
  PHASES,
  estimatePhase,
  STAGES,
  type Phase,
  type Stage,
} from "@/lib/souffleur/phases";
import { TEST_SCRIPTS, type ScriptStep } from "@/lib/souffleur/testScripts";
import {
  loadProfile,
  saveProfile,
  DEFAULT_PROFILE,
  type ColdCallProfile,
} from "@/lib/souffleur/profile";
import {
  getTradeCard,
  fillTradeHook,
  buildTradeContext,
} from "@/lib/souffleur/tradePlaybook";
import { SipDialer, type SipControl } from "./SipDialer";
import { ShareGuide } from "./ShareGuide";
import { cn } from "@/lib/utils";

const DISPOS = [
  { key: "interested", label: "Interesse", tone: "copper" },
  { key: "appointment", label: "Termin!", tone: "success" },
  { key: "callback", label: "Rückruf", tone: "neutral" },
  { key: "voicemail", label: "Mailbox", tone: "neutral" },
  { key: "busy", label: "Besetzt", tone: "neutral" },
  { key: "no_answer", label: "Nicht erreicht", tone: "neutral" },
  { key: "not_interested", label: "Kein Interesse", tone: "danger" },
  { key: "wrong_number", label: "Falsche Nr.", tone: "danger" },
  { key: "opt_out", label: "Nicht mehr anrufen", tone: "danger" },
] as const;

// Schnell antippbare Gründe für die Pflicht-Notiz nach dem Anruf.
const REASON_CHIPS = [
  "Kein Interesse",
  "Kein Budget / zu teuer",
  "Hat schon eine Website",
  "Falsche Zeit / will Rückruf",
  "Entscheider nicht da",
  "Gatekeeper / nicht durchgekommen",
  "Kein Bedarf",
  "Macht Familie/Bekannter",
  "Schon andere Anbieter",
  "Mailbox / niemand dran",
] as const;

// Aktiv-Stile pro Gesprächswärme: kühl-blau (kalt) → heiß-rot (heiß).
const PHASE_STYLE: Record<Phase, string> = {
  kalt: "bg-[#e7f0ff] text-[#0a3977] ring-1 ring-[#9cc0ff]",
  lau: "bg-[#e9f2fe] text-[var(--color-copper-700)] ring-1 ring-[var(--color-copper-300)]",
  warm: "bg-[#fff2e3] text-[#b25000] ring-1 ring-[#fdc98a]",
  heiss: "bg-[#ffeceb] text-[#d70015] ring-1 ring-[#ffb3ae]",
};

// Deepgram-Stream-URL.
//  - model=nova-3: bestes DE-Telefon-Modell (~21 % weniger Fehler als nova-2,
//    für noisy/Telefon-Audio empfohlen; verifiziert: nova-3-general kann de+streaming).
//  - endpointing=500: 500 ms Sprechpause = Satzende (Denkpausen ≠ Gesprächsende;
//    der rundenbasierte Turn-Timer wartet ebenfalls ~500 ms).
//  - encoding/sample_rate werden BEWUSST NICHT gesetzt: das Audio ist
//    webm/opus-containerisiert, Deepgram liest den Header selbst (Setzen würde
//    den Stream zerschießen).
const DG_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-3&language=de&interim_results=true&endpointing=300&utterance_end_ms=1000&vad_events=true&smart_format=true&punctuate=true";

// HEADSET_MODE=true: der Pegel-Lock (Berater spricht → Zeile einfrieren) ist
// aktiv. Ohne Headset würde Lautsprecher-Bleed der Kundenstimme den Pegel offen
// halten → dann auf false stellen (fällt auf den is_final-Lock zurück).
const HEADSET_MODE = true;

type DgWord = { confidence?: number };
type DgResult = {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
      words?: DgWord[];
    }>;
  };
};

/** Geräusch-Heuristik aus dem Deepgram-Resultat: kleinste Wort-Konfidenz (sagt
 *  mehr als der Satz-Durchschnitt) + Sprechsegment-Dauer seit SpeechStarted. */
function dgWordStats(
  d: DgResult,
  speechStartedTs: number,
): { minConf: number; segMs: number } {
  const alt = d.channel?.alternatives?.[0];
  const w = alt?.words ?? [];
  const minConf = w.length
    ? Math.min(...w.map((x) => x.confidence ?? 1))
    : alt?.confidence ?? 1;
  const segMs = speechStartedTs ? Date.now() - speechStartedTs : 0;
  return { minConf, segMs };
}

export function SouffleurRoom({
  lead,
  autoDial = false,
}: {
  lead: Lead;
  autoDial?: boolean;
}) {
  const [move, setMove] = useState<Move>(() => getMove("opener")!);
  const [detected, setDetected] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [sysListening, setSysListening] = useState(false);
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [sysLevel, setSysLevel] = useState(0);
  const [maybeEnded, setMaybeEnded] = useState(false);
  const [pacingCue, setPacingCue] = useState(false); // Monolog-Warnung
  const [copied, setCopied] = useState(false);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [customerTranscript, setCustomerTranscript] = useState("");
  const [dgStatus, setDgStatus] = useState<
    "idle" | "live" | "no-key" | "error" | "off"
  >("idle");
  // Klartext-Grund vom Token-Endpoint (z.B. „Member-Key statt Owner-Key") —
  // wird als Tooltip am „Key fehlt"-Status gezeigt, statt den Grund zu verschlucken.
  const [transcriptionHint, setTranscriptionHint] = useState<string | null>(null);
  const [testActive, setTestActive] = useState<string | null>(null);
  const [testStep, setTestStep] = useState(0);
  const [testHint, setTestHint] = useState<string | null>(null);
  const [micAsCustomer, setMicAsCustomer] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [showVoicemail, setShowVoicemail] = useState(false);
  // Mailbox-Countdown: läuft, solange das Voicemail-Overlay offen ist (15 → 0).
  const [vmSecs, setVmSecs] = useState(15);
  // Pflicht-Abfrage nach dem Anruf: Ergebnis + Grund/Notiz (zwingend).
  const [resultOpen, setResultOpen] = useState(false);
  const [resultDispo, setResultDispo] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState("");
  const [briefingOpen, setBriefingOpen] = useState(true);
  // Einstiegs-Treppe (opener1 → warten → bridge → frei): feste Schiene für den
  // Gesprächsanfang, bevor die freie Phasen-Logik übernimmt. stageRef spiegelt
  // den Wert für die Callbacks (askAiNow/onCustomerText laufen außerhalb Render).
  const [stage, setStage] = useState<Stage>("opener1");
  const stageRef = useRef<Stage>("opener1");
  const goStage = useCallback((s: Stage) => {
    stageRef.current = s;
    setStage(s);
  }, []);
  // Phase 9: Gesprächswärme + KI-Begründung + Werkzeug-Schublade.
  const [phase, setPhase] = useState<Phase>("kalt");
  const [why, setWhy] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  // Gesprächs-Zustand für die Anzeige: wer ist dran / wartet die KI gerade aus.
  const [convoState, setConvoState] = useState<
    "warten" | "berater" | "kunde" | "denkt"
  >("warten");

  // Berater-Name (einmal setzen, füllt „[Name]" in allen Sätzen → nur ablesen).
  const [repName, setRepName] = useState("");
  useEffect(() => {
    try {
      setRepName(localStorage.getItem("aw_rep_name") ?? "");
    } catch {}
  }, []);

  // Region des Beraters (für Regio-Bezug im KI-Tipp). Default Bad Kreuznach,
  // per localStorage „aw_rep_city" überschreibbar.
  const repCityRef = useRef("Bad Kreuznach");
  useEffect(() => {
    try {
      repCityRef.current =
        localStorage.getItem("aw_rep_city")?.trim() || "Bad Kreuznach";
    } catch {}
  }, []);

  // Cold-Calling-Profil (Stil des KI-Dirigenten) — pro Browser gespeichert.
  const [profile, setProfile] = useState<ColdCallProfile>(DEFAULT_PROFILE);
  const profileRef = useRef<ColdCallProfile>(DEFAULT_PROFILE);
  useEffect(() => {
    setProfile(loadProfile());
  }, []);
  const updateProfile = useCallback((patch: Partial<ColdCallProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micAsCustomerRef = useRef(false);
  useEffect(() => {
    micAsCustomerRef.current = micAsCustomer;
  }, [micAsCustomer]);

  const [micStatus, setMicStatus] = useState<
    "idle" | "live" | "no-key" | "no-permission" | "error"
  >("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  // KI-Verfügbarkeit einmal prüfen (statt hardcoded "on")
  useEffect(() => {
    fetch("/api/souffleur/suggest")
      .then((r) => r.json())
      .then((d) => setAiReady(!!d.ok))
      .catch(() => setAiReady(false));
  }, []);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micWsRef = useRef<WebSocket | null>(null);
  const micGenRef = useRef(0); // Stale-Guard: jeder Start bekommt eine Generation
  // Auto-Reconnect bei WS-Abriss (sonst sendet ein neuer WS nur header-lose
  // Chunks → Transkript stirbt still). Gedeckelt, Timer wird beim Teardown gelöscht.
  const micReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micRetryRef = useRef(0);
  const sysReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sysRetryRef = useRef(0);
  const sysAudioWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null); // WS live, aber kein Kundenaudio?
  const sysCtxRef = useRef<AudioContext | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const sysRafRef = useRef<number | null>(null); // RAF der Kunden-Pegel-Loop
  const dgWsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // Imperative Hangup-Steuerung des SIP-Dialers (für „Auflegen" im Cockpit).
  const sipControlRef = useRef<SipControl | null>(null);

  // ── Tipp-Pipeline-Refs ─────────────────────────────────────────
  const custRef = useRef(""); // rollendes Kunden-Transkript (für Matcher)
  const historyRef = useRef<string[]>([]); // letzte Kundenaussagen (für die KI)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpecFireRef = useRef(0); // letztes spekulatives Vorberechnen (Drossel)
  const callIdRef = useRef<string | null>(null); // externalCallId des laufenden Anrufs
  const moveIdRef = useRef<string | null>(null); // letzter erkannter Playbook-Move
  // ── Sprech-Lock gegen Hintergrundgeräusche: solange der Berater liest, wird
  // die angezeigte Zeile NICHT verändert/ersetzt. Zwei Quellen (Mikro-Pegel +
  // Berater-is_final) werden per Math.max gemergt; Hard-Cap gegen Frozen-Pegel.
  const speechLockUntilRef = useRef(0); // Pegel-Lock-Ende (RAF-getrieben)
  const isFinalLockUntilRef = useRef(0); // Berater-is_final-Lock-Ende
  const lockHardCapRef = useRef(0); // Pegel-Lock nie länger als das offen
  const speechStartedRef = useRef(0); // ts des letzten Deepgram-SpeechStarted (Kunde)
  const lastCustTextRef = useRef(""); // Dedup gegen Reconnect-Schwall
  const lastCustTextAtRef = useRef(0);
  const lastTurnQualifiedRef = useRef(false); // war der letzte Kunden-Turn „echt"?
  const lockUntil = useCallback(
    () =>
      Math.max(
        isFinalLockUntilRef.current,
        HEADSET_MODE
          ? Math.min(speechLockUntilRef.current, lockHardCapRef.current)
          : 0,
      ),
    [],
  );
  const aiGenRef = useRef(0); // laufende Nummer pro KI-Anfrage (latest-wins beim Stream)
  const aiLineGenRef = useRef(-1); // welche Generation die sichtbare Zeile aktuell besitzt
  const lastAiLenRef = useRef(0); // Zeichenstand beim letzten KI-Call
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("kalt");
  const repNameRef = useRef("");
  // Phase 10: rundenbasierter Dialog. turnsRef = voller Verlauf (Berater + Kunde),
  // lastSpeakerRef = wer zuletzt geredet hat. aiDebounceRef dient jetzt als
  // Turn-End-Timer (700 ms Stille = Kunden-Redezug fertig → KI fragen).
  const turnsRef = useRef<{ speaker: "advisor" | "customer"; text: string }[]>([]);
  const lastSpeakerRef = useRef<"advisor" | "customer" | null>(null);

  const tradeCard = useMemo(() => getTradeCard(lead.trade), [lead.trade]);

  // „[Name]" füllen (Berater-Name) bzw. als klaren Lese-Cue lassen.
  const fillName = useCallback(
    (s: string) => s.replace(/\[Name\]/g, repName.trim() || "[Ihr Name]"),
    [repName],
  );

  const hookLine = useMemo(() => {
    // Opener = kurzer, EHRLICHER Teaser: WER (AW Digital, Websites für Handwerker
    // — als „Webdesign" verpackt) + WORUM (kostet Sie Aufträge) + kleine Bitte.
    // Bewusst OHNE den langen Branchen-/Audit-Befund: der kommt erst, wenn der
    // Kunde „ja, 30 Sekunden" sagt. Sonst rätselt der Kunde am Anfang → nervt.
    if (move.id === "opener") {
      const base = lead.website
        ? "Guten Tag, [Name] von AW Digital — wir machen Websites für Handwerksbetriebe. Ich war kurz auf Ihrer Seite, da ist mir was aufgefallen, das Sie Aufträge kostet. Haben Sie 30 Sekunden?"
        : "Guten Tag, [Name] von AW Digital — wir machen Websites für Handwerksbetriebe. Ihr Betrieb ist online kaum zu finden, und genau das kostet Sie Aufträge. Haben Sie 30 Sekunden?";
      return fillName(base);
    }
    return fillName(fillHook(move.line, lead.auditHook));
  }, [move, lead.auditHook, lead.website, fillName]);

  // Opener 1 — NUR Erlaubnis holen, kurz genug zum stolperfreien Vorlesen.
  const opener1Line = useMemo(
    () =>
      fillName(
        "Guten Tag, [Name] von AW Digital — hab ich Sie gerade ganz ungünstig erwischt?",
      ),
    [fillName],
  );
  // Opener 2 / Bridge — JETZT erst der Grund + erste Bedarfsfrage. Fallback-Zeile,
  // bis die KI (die den Kundensatz kennt) eine passendere liefert.
  const bridgeLine = useMemo(() => {
    const reason = lead.website
      ? "Wir bauen Handwerkern Websites, die bei Google oben stehen und mehr Anfragen bringen — auf Ihrer Seite ist mir was aufgefallen, das Sie Aufträge kostet."
      : "Wir bauen Handwerkern Websites, die bei Google oben stehen und mehr Anfragen bringen — Ihr Betrieb ist online kaum zu finden, genau das kostet Sie Aufträge.";
    return fillName(`${reason} Wie kommen bei Ihnen aktuell die meisten Neukunden rein?`);
  }, [lead.website, fillName]);

  // Welche Zeile die große Karte zeigt — KI schlägt alles, sonst je Stufe.
  const stageLine =
    stage === "opener1" ? opener1Line : stage === "bridge" ? bridgeLine : hookLine;
  const showListen = stage === "warten" && !aiLine;

  // Nein-Gradient aus dem letzten Kunden-Satz (für das Coach-Panel).
  const neinTyp = useMemo(
    () => classifyNein(customerTranscript.slice(-200)),
    [customerTranscript],
  );
  const neinGradient = neinTyp
    ? NEIN_GRADIENTEN.find((g) => g.typ === neinTyp)
    : null;

  // ── Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (callEnded) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [callEnded]);

  // Mailbox-Countdown: tickt nur, solange das Overlay offen ist; stoppt bei 0.
  useEffect(() => {
    if (!showVoicemail) return;
    const t = setInterval(
      () => setVmSecs((s) => (s <= 1 ? 0 : s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [showVoicemail]);

  // ── Mikro via Deepgram (zuverlässig, gleicher Anbieter wie Kunde) ──
  const startMic = useCallback(async () => {
    if (micStreamRef.current) return;
    const gen = ++micGenRef.current;

    setMicError(null);
    setMicStatus("idle");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Echo-Unterdrückung AN (gegen Lautsprecher-Bleed), aber
          // noiseSuppression + autoGainControl AUS: aggressives NS/AGC frisst
          // Wortanfänge/Konsonanten und lässt den Pegel pumpen — Deepgram
          // erkennt rohes Audio deutlich zuverlässiger.
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      setMicStatus("no-permission");
      const msg =
        name === "NotAllowedError"
          ? "Mikro-Zugriff verweigert. Schloss-Symbol in der Adressleiste -> Mikrofon zulassen."
          : name === "NotFoundError"
            ? "Kein Mikro gefunden. Headset eingesteckt?"
            : "Mikro-Fehler: " + String((err as Error).message ?? err);
      setMicError(msg);
      return;
    }
    if (gen !== micGenRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    micStreamRef.current = stream;
    setListening(true);

    const ctx = new AudioContext();
    micCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      an.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const lvl = avg / 90;
      setMicLevel(Math.min(1, lvl));
      // Berater spricht aktiv (Pegel > Sprech-Schwelle) → Lock mit 800ms Nachlauf
      // (deckt Lese-Atempausen). Hard-Cap nur zu Lock-Beginn → kein ewiger Lock.
      if (lvl > 0.1) {
        speechLockUntilRef.current = Date.now() + 800;
        if (lockHardCapRef.current < Date.now())
          lockHardCapRef.current = Date.now() + 8000;
      }
      if (micCtxRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // Token → WS → Recorder als rekursive Funktion: bricht der WS ab, setzt
    // sie sich automatisch komplett neu auf (frischer Token + frischer
    // WebM-Header), sonst käme nur header-loses Audio und das Transkript stürbe still.
    // WICHTIG: Der Retry-Zähler wird NICHT bei onopen genullt (das feuert schon
    // beim bloßen Connect → bei Flackern entstünde ein Endlos-Sturm), sondern
    // erst bei einem ECHTEN Transkript (onmessage). So greift der 5er-Deckel
    // auch im „connect-dann-sofort-weg"-Fall.
    const connectDg = async () => {
      const scheduleRetry = () => {
        if (
          gen === micGenRef.current &&
          micStreamRef.current &&
          micRetryRef.current < 5
        ) {
          micRetryRef.current++;
          micReconnectRef.current = setTimeout(connectDg, 1200);
        } else if (gen === micGenRef.current) {
          setMicStatus("error");
          setMicError("Transkription verloren — Mikro neu starten.");
        }
      };
      try {
        const tok = await fetch("/api/souffleur/deepgram-token", {
          method: "POST",
        }).then((r) => r.json());
        if (gen !== micGenRef.current) return;
        if (!tok.ok) {
          setMicStatus("no-key"); // echtes Schlüssel-/Rechte-Problem → kein Retry
          if (tok.message) setTranscriptionHint(tok.message);
          return;
        }
        const ws = new WebSocket(DG_URL, ["token", tok.token]);
        micWsRef.current = ws;
        ws.onopen = () => {
          if (ws !== micWsRef.current || gen !== micGenRef.current) {
            try {
              ws.close();
            } catch {}
            return;
          }
          try {
            micRecorderRef.current?.stop?.();
            const rec = new MediaRecorder(stream, {
              mimeType: "audio/webm;codecs=opus",
            });
            micRecorderRef.current = rec;
            rec.ondataavailable = (ev) => {
              if (ev.data.size > 0 && ws.readyState === 1)
                ev.data.arrayBuffer().then((b) => ws.send(b));
            };
            rec.start(250);
            setMicStatus("live");
          } catch {
            // Recorder kaputt (Track ended o.ä.) → WS schließen, onclose reconnectet.
            try {
              ws.close();
            } catch {}
          }
        };
        ws.onmessage = (m) => {
          try {
            const d = JSON.parse(m.data as string) as DgResult;
            const text = d.channel?.alternatives?.[0]?.transcript;
            if (text && d.is_final) {
              micRetryRef.current = 0; // gesunde Session → Reconnect-Budget zurück
              setTranscript((prev) => (prev + " " + text).slice(-1200));
              if (micAsCustomerRef.current) {
                const { minConf, segMs } = dgWordStats(d, speechStartedRef.current);
                onCustomerText(text, "Mikro-Test", !!d.speech_final, minConf, segMs);
              } else {
                // Echtbetrieb: das eigene Mikro ist der Berater-Redezug.
                onAdvisorText(text);
              }
            }
          } catch {
            /* ignore */
          }
        };
        ws.onerror = () => {
          /* onclose übernimmt Reconnect + Statusentscheid */
        };
        ws.onclose = () => {
          if (ws !== micWsRef.current) return;
          micWsRef.current = null;
          try {
            micRecorderRef.current?.stop?.();
          } catch {}
          micRecorderRef.current = null;
          scheduleRetry();
        };
      } catch {
        if (gen !== micGenRef.current) return;
        scheduleRetry(); // transienter Netz-/Fetch-Fehler → gedeckelt erneut
      }
    };
    micRetryRef.current = 0;
    connectDg();
    // onCustomerText ist stabil (refs); bewusst nicht in den Deps, um Reconnect
    // des Mikros bei jedem Tipp zu vermeiden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMic = useCallback(() => {
    micGenRef.current++;
    if (micReconnectRef.current) {
      clearTimeout(micReconnectRef.current);
      micReconnectRef.current = null;
    }
    try {
      micRecorderRef.current?.stop?.();
    } catch {}
    micRecorderRef.current = null;
    const ws = micWsRef.current;
    micWsRef.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try {
        ws.close();
      } catch {}
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setListening(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    micCtxRef.current?.close?.();
    micCtxRef.current = null;
    setMicLevel(0);
    setMicError(null);
    setMicStatus("idle");
  }, []);

  // ── Einen Redezug protokollieren (gleiche Sprecher zusammenfassen) ──
  const pushTurn = useCallback(
    (speaker: "advisor" | "customer", text: string) => {
      const turns = turnsRef.current;
      const last = turns[turns.length - 1];
      if (last && last.speaker === speaker) {
        last.text = (last.text + " " + text).trim();
      } else {
        turns.push({ speaker, text: text.trim() });
      }
      if (turns.length > 14) turns.splice(0, turns.length - 14);
    },
    [],
  );

  // Berater-Text (eigenes Mikro): als Berater-Redezug merken, KI NICHT triggern.
  // Setzt den is_final-Lock zusätzlich zum Mikro-Pegel-Lock (gemergt in lockUntil).
  const onAdvisorText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      pushTurn("advisor", text);
      lastSpeakerRef.current = "advisor";
      isFinalLockUntilRef.current = Date.now() + 900;
      setConvoState("berater");
      // Berater redet → Kunde ist nicht mehr dran: Turn-End-Timer abbrechen.
      if (aiDebounceRef.current) {
        clearTimeout(aiDebounceRef.current);
        aiDebounceRef.current = null;
      }
    },
    [pushTurn],
  );

  // ── KI-Dirigent fragen: STREAMING — der Satz fließt Wort für Wort rein. ──
  const askAiNow = useCallback(() => {
    lastAiLenRef.current = custRef.current.length;
    const gen = ++aiGenRef.current;
    const nein = classifyNein(custRef.current.slice(-200));
    setWhy(null);
    fetch("/api/souffleur/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turns: turnsRef.current.slice(-8),
        transcript: custRef.current.slice(-700),
        hook: lead.auditHook,
        company: lead.company,
        trade: lead.trade,
        tradeContext: tradeCard ? buildTradeContext(tradeCard) : null,
        neinTyp: nein,
        phase: phaseRef.current,
        stage: stageRef.current,
        moveId: moveIdRef.current,
        elapsedSec: elapsedRef.current,
        repName: repNameRef.current.trim() || null,
        profile: profileRef.current,
      }),
    })
      .then(async (res) => {
        // Kein Key / Fehler → JSON statt Stream.
        if ((res.headers.get("content-type") || "").includes("application/json")) {
          await res.json().catch(() => {});
          if (gen === aiGenRef.current) setConvoState("warten");
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          if (gen === aiGenRef.current) setConvoState("warten");
          return;
        }
        const decoder = new TextDecoder();
        let acc = "";
        let started = false;
        // Zeile setzen, sobald diese Generation sie besitzt bzw. das Lock frei
        // ist. Ein blanker „—"/leerer Text ist NUR im „warten"-Schritt ein
        // gewolltes Zuhör-Signal — sonst NICHT anzeigen (er würde die Karte
        // mitten im Gespräch leeren = „nichts kam"); dann bleibt die letzte
        // brauchbare Zeile stehen. Rückgabe: wurde wirklich gesetzt?
        const commitLine = (text: string): boolean => {
          const tr = text.trim();
          if (
            (tr === "—" || tr === "-" || tr === "") &&
            stageRef.current !== "warten"
          )
            return false;
          aiLineGenRef.current = gen;
          setAiLine(text);
          return true;
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          // Neuere Anfrage gestartet → diesen Stream verwerfen (latest-wins).
          if (gen !== aiGenRef.current) {
            try {
              await reader.cancel();
            } catch {}
            return;
          }
          acc += decoder.decode(value, { stream: true });
          if (acc.trim()) {
            if (!started) {
              started = true;
              setConvoState("warten"); // erstes Wort da → „KI wertet aus" weg
            }
            // Sobald DIESE Generation die sichtbare Zeile besitzt, wächst sie
            // IMMER weiter (acc ist append-only = nie ein Rückzug, gefahrlos
            // beim Vorlesen) — sonst fröre die Anzeige an einem Teilsatz ein,
            // wenn der Berater den Anfang schon liest und das Lock greift. Nur
            // die ÜBERNAHME durch eine neue Generation wartet aufs freie Lock.
            if (aiLineGenRef.current === gen || Date.now() >= lockUntil())
              commitLine(acc);
          }
        }
        // Stream fertig: die KOMPLETTE Zeile garantiert einblenden, sobald das
        // Lock frei ist — auch wenn diese Generation wegen Dauer-Lock nie zur
        // Anzeige kam. Ohne diesen Flush bliebe ein halber Satz stehen.
        if (gen === aiGenRef.current) {
          setConvoState("warten");
          acc += decoder.decode(); // Rest-Bytes (Mehrbyte-Zeichen an Chunk-Grenzen)
          const full = acc;
          if (full.trim()) {
            const flush = () => {
              if (gen !== aiGenRef.current) return; // von neuerer Anfrage überholt
              if (aiLineGenRef.current === gen || Date.now() >= lockUntil()) {
                commitLine(full);
              } else {
                setTimeout(flush, 200);
              }
            };
            flush();
          }
        }
      })
      .catch(() => {
        if (gen === aiGenRef.current) setConvoState("warten");
      });
  }, [lead.auditHook, lead.company, lead.trade, tradeCard, lockUntil]);

  // Turn-Ende: feuert GENAU eine KI-Anfrage pro Kunden-Redezug — aber NIE,
  // während der Berater gerade vorliest (dann kurz vertagen statt die Zeile
  // unter ihm wegzuziehen).
  const fireTurnEnd = useCallback(() => {
    aiDebounceRef.current = null;
    if (lastSpeakerRef.current !== "customer") return; // Berater hat übernommen
    if (Date.now() < lockUntil()) {
      // Berater liest noch → Zeile NICHT ersetzen, gleich erneut prüfen.
      aiDebounceRef.current = setTimeout(fireTurnEnd, 250);
      return;
    }
    // Einstiegs-Treppe nur bei einem ECHTEN Kunden-Turn weiterschalten
    // (speech_final + Mindestlänge) — ein Geräusch/„ja?" springt den Anfänger
    // sonst ungewollt von „Erlaubnis" auf „Grund".
    if (lastTurnQualifiedRef.current) {
      if (stageRef.current === "opener1" || stageRef.current === "warten")
        goStage("bridge");
      else if (stageRef.current === "bridge") goStage("frei");
    }
    setConvoState("denkt");
    askAiNow();
  }, [askAiNow, goStage, lockUntil]);

  // ── Kunden-Handler: Redezug protokollieren + Turn-Ende erkennen ──
  const onCustomerText = useCallback(
    (
      text: string,
      sourceLabel: string,
      speechFinal = false,
      minConf = 1,
      segMs = 0,
    ) => {
      const t = text.trim();
      if (!t) return;
      const words = t.split(/\s+/).filter(Boolean).length;

      // ── RAUSCH-GATE (vor JEDER Puffer-Mutation) ──────────────────────
      // Verworfene Fetzen landen NIE in custRef/turnsRef/historyRef, damit sie
      // weder die Anzeige noch den nächsten KI-Kontext verfälschen.
      // 1) Dedup gegen Reconnect-Schwall: gleicher String < 500ms → weg.
      if (
        t === lastCustTextRef.current &&
        Date.now() - lastCustTextAtRef.current < 500
      )
        return;
      // 2) Zu kurzes Sprechsegment (VAD) = Klacken/Maschinenlärm.
      if (segMs > 0 && segMs < 350) return;
      // 3) Akustischer Matsch (sehr niedrige Wort-Konfidenz).
      if (minConf < 0.4) return;
      // 4) Kurz-Fetzen NUR durchlassen, wenn echtes Satzende + ausreichende
      //    Konfidenz (echtes knappes „Ja, kurz" kommt durch, ein 1-Wort-
      //    Geräuschburst nicht).
      const tooShort = words < 2 || t.length < 6;
      if (tooShort && !(speechFinal && minConf >= 0.55)) return;

      lastCustTextRef.current = t;
      lastCustTextAtRef.current = Date.now();
      // „Echter" Turn (für Stage-Fortschritt): speech_final + Mindestlänge.
      lastTurnQualifiedRef.current = !!speechFinal && words >= 2;

      // ── Kontext IMMER pflegen (Rauschen ist hier bereits raus) ──────
      setCustomerTranscript((prev) => (prev + " " + t).slice(-1400));
      custRef.current = (custRef.current + " " + t).slice(-1600);
      historyRef.current = [...historyRef.current, t].slice(-6);
      pushTurn("customer", t);
      lastSpeakerRef.current = "customer";

      // ── Sichtbaren State NUR ändern, wenn der Berater NICHT gerade liest.
      // Das ist der Kernfix: während des Sprech-Locks bleibt die Karte (Zeile,
      // Move, Wärme-Phase, „Kunde spricht…") komplett eingefroren.
      const locked = Date.now() < lockUntil();
      const mv = matchMove(custRef.current);
      moveIdRef.current = mv ? mv.id : null;
      if (!locked) {
        setConvoState("kunde");
        if (mv) {
          setMove(mv);
          setDetected(mv.label + " · " + sourceLabel);
          setPhase(
            estimatePhase({
              elapsedSec: elapsedRef.current,
              moveKind: mv.kind,
              neinTyp: classifyNein(custRef.current.slice(-200)),
              customerSpoke: true,
            }),
          );
        }
      }

      // ── Spekulatives Vorberechnen — nur wenn nicht gelockt (spart Kosten;
      // der finale Tipp kommt über fireTurnEnd direkt nach Lock-Ende). ──
      const urgent =
        mv &&
        (mv.kind === "objection" || mv.kind === "signal" || mv.kind === "closing");
      if (
        !speechFinal &&
        stageRef.current === "frei" &&
        Date.now() >= lockUntil() &&
        Date.now() - lastSpecFireRef.current > (urgent ? 350 : 700) &&
        custRef.current.trim().length > 12
      ) {
        lastSpecFireRef.current = Date.now();
        askAiNow();
      }

      // ── Turn-Ende-Fallback (Hauptweg ist Deepgrams UtteranceEnd-Event). ──
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = setTimeout(fireTurnEnd, speechFinal ? 60 : 600);
    },
    [pushTurn, fireTurnEnd, askAiNow, lockUntil],
  );

  // ── Gemeinsame Teardown-Funktion für Kunden-Audio-Pipeline ──────
  const teardownCustomerPipeline = useCallback(() => {
    // Sprech-Lock-/Geräusch-Refs zurücksetzen (sonst feuert ein gepufferter
    // Turn-End-Timer nach Gesprächsende noch einen Tipp in die tote Karte).
    speechLockUntilRef.current = 0;
    isFinalLockUntilRef.current = 0;
    lockHardCapRef.current = 0;
    speechStartedRef.current = 0;
    lastCustTextRef.current = "";
    if (sysRafRef.current) {
      cancelAnimationFrame(sysRafRef.current);
      sysRafRef.current = null;
    }
    if (sysReconnectRef.current) {
      clearTimeout(sysReconnectRef.current);
      sysReconnectRef.current = null;
    }
    if (sysAudioWatchdogRef.current) {
      clearTimeout(sysAudioWatchdogRef.current);
      sysAudioWatchdogRef.current = null;
    }
    try {
      recorderRef.current?.stop?.();
    } catch {}
    recorderRef.current = null;
    if (dgWsRef.current) {
      const ws = dgWsRef.current;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      dgWsRef.current = null;
      try {
        ws.close();
      } catch {}
    }
    sysStreamRef.current?.getTracks().forEach((t) => t.stop());
    sysStreamRef.current = null;
    if (sysCtxRef.current) {
      try {
        sysCtxRef.current.close();
      } catch {}
      sysCtxRef.current = null;
    }
    setSysListening(false);
    setSysLevel(0);
    setDgStatus("idle");
  }, []);

  // ── SIP-Remote-Stream direkt an Deepgram (kein Screen-Share nötig) ──
  const handleSipRemoteStream = useCallback(
    async (stream: MediaStream | null) => {
      if (!stream) {
        teardownCustomerPipeline();
        return;
      }
      teardownCustomerPipeline();

      sysStreamRef.current = stream;
      setSysListening(true);

      const ctx = new AudioContext();
      sysCtxRef.current = ctx;
      // AudioContext startet außerhalb einer Klick-Geste ggf. suspended (Chrome/
      // ChromeOS) → resume, sonst liefert der ganze Graph Stille. Best-effort.
      try {
        await ctx.resume();
      } catch {}
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      // KERNFIX Chromebook: ChromeOS/Chrome nimmt einen reinen REMOTE-WebRTC-Track
      // (die Kundenstimme aus dem SIP-Anruf) mit MediaRecorder NICHT auf — es
      // kommen stille Chunks, Deepgram liefert kein Transkript → nach dem Opener
      // keine weitere Zeile. Workaround: den Remote-Track durch einen WebAudio-
      // Sink (MediaStreamDestination) in einen LOKALEN Track wandeln und DIESEN
      // aufnehmen. Das „zieht" zugleich den Remote-Track aktiv (kein Silence).
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      const recStream = dest.stream;
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSysLevel(Math.min(1, avg / 90));
        if (sysCtxRef.current) sysRafRef.current = requestAnimationFrame(tick);
      };
      sysRafRef.current = requestAnimationFrame(tick);

      // Rekursiver Connect mit Auto-Reconnect (frischer Token + WebM-Header),
      // damit der Kunden-Stream bei einem WS-Abriss nicht still verstummt.
      // Retry-Zähler erst bei echtem Transkript zurücksetzen (nicht bei onopen) —
      // sonst Endlos-Sturm bei Flacker-Verbindungen.
      const connectDgSys = async () => {
        const scheduleRetry = () => {
          if (sysStreamRef.current === stream && sysRetryRef.current < 5) {
            sysRetryRef.current++;
            sysReconnectRef.current = setTimeout(connectDgSys, 1200);
          } else if (sysStreamRef.current === stream) {
            setDgStatus("error");
          }
        };
        try {
          const tok = await fetch("/api/souffleur/deepgram-token", {
            method: "POST",
          }).then((r) => r.json());
          if (sysStreamRef.current !== stream) return; // Stream nicht mehr aktiv
          if (!tok.ok) {
            setDgStatus("no-key"); // echtes Schlüssel-/Rechte-Problem → kein Retry
            if (tok.message) setTranscriptionHint(tok.message);
            return;
          }
          const ws = new WebSocket(DG_URL, ["token", tok.token]);
          dgWsRef.current = ws;
          ws.onopen = () => {
            if (ws !== dgWsRef.current || sysStreamRef.current !== stream) {
              try {
                ws.close();
              } catch {}
              return;
            }
            try {
              recorderRef.current?.stop?.();
              const rec = new MediaRecorder(recStream, {
                mimeType: "audio/webm;codecs=opus",
              });
              recorderRef.current = rec;
              rec.ondataavailable = (ev) => {
                if (ev.data.size > 0 && ws.readyState === 1)
                  ev.data.arrayBuffer().then((b) => ws.send(b));
              };
              rec.start(250);
              setDgStatus("live");
              // Watchdog: WS ist live, aber wenn ~9s KEIN Kunden-Transkript kommt,
              // hört der Chromebook den SIP-Ton nicht auf (meist tel:-Weg statt
              // Browser-Anruf / kein Headset). Klarer Hinweis statt totem Souffleur.
              if (sysAudioWatchdogRef.current)
                clearTimeout(sysAudioWatchdogRef.current);
              sysAudioWatchdogRef.current = setTimeout(() => {
                if (sysStreamRef.current === stream)
                  setTranscriptionHint(
                    "Kunde wird nicht gehört. Bitte über den blauen Browser-Anruf telefonieren (nicht den Telefon-Link) und ein Kabel-Headset nutzen.",
                  );
              }, 9000);
            } catch {
              try {
                ws.close();
              } catch {}
            }
          };
          ws.onmessage = (m) => {
            try {
              const d = JSON.parse(m.data as string) as DgResult;
              if (d.type === "SpeechStarted") {
                speechStartedRef.current = Date.now();
                return;
              }
              if (d.type === "UtteranceEnd") {
                // Sauberes Turn-Ende (echte Stille auf dem Kanal) → Tipp jetzt.
                if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
                fireTurnEnd();
                return;
              }
              const text = d.channel?.alternatives?.[0]?.transcript;
              if (text && d.is_final) {
                sysRetryRef.current = 0; // gesunde Session → Budget zurück
                // Kundenaudio kommt an → Watchdog entwarnen.
                if (sysAudioWatchdogRef.current) {
                  clearTimeout(sysAudioWatchdogRef.current);
                  sysAudioWatchdogRef.current = null;
                }
                const { minConf, segMs } = dgWordStats(d, speechStartedRef.current);
                onCustomerText(text, "Kunde", !!d.speech_final, minConf, segMs);
              }
            } catch {
              /* ignore */
            }
          };
          ws.onerror = () => {
            /* onclose übernimmt Reconnect + Statusentscheid */
          };
          ws.onclose = () => {
            if (ws !== dgWsRef.current) return;
            dgWsRef.current = null;
            try {
              recorderRef.current?.stop?.();
            } catch {}
            recorderRef.current = null;
            scheduleRetry();
          };
        } catch {
          if (sysStreamRef.current !== stream) return;
          scheduleRetry();
        }
      };
      sysRetryRef.current = 0;
      connectDgSys();
    },
    [onCustomerText, teardownCustomerPipeline],
  );

  // ── System-Audio (PC-Ausgang = Stimme des Kunden) ───────────────
  const startSystem = useCallback(
    async (): Promise<{
      ok: boolean;
      noAudio?: boolean;
      dg?: "live" | "no-key" | "error";
    }> => {
      try {
        const stream = await (
          navigator.mediaDevices as MediaDevices & {
            getDisplayMedia: (c: unknown) => Promise<MediaStream>;
          }
        ).getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        const audioTracks = stream.getAudioTracks();
        stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return { ok: false, noAudio: true };
        }

        teardownCustomerPipeline();
        sysStreamRef.current = stream;
        setSysListening(true);

        const ctx = new AudioContext();
        sysCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(
          new MediaStream([audioTracks[0]]),
        );
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        const data = new Uint8Array(an.frequencyBinCount);
        const tick = () => {
          an.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setSysLevel(Math.min(1, avg / 90));
          if (sysCtxRef.current) sysRafRef.current = requestAnimationFrame(tick);
        };
        sysRafRef.current = requestAnimationFrame(tick);

        audioTracks[0].onended = () => stopSystem();

        try {
          const tok = await fetch("/api/souffleur/deepgram-token", {
            method: "POST",
          }).then((r) => r.json());
          if (!tok.ok) {
            setDgStatus("no-key");
            if (tok.message) setTranscriptionHint(tok.message);
            return { ok: true, dg: "no-key" };
          }

          const dg = await new Promise<"live" | "error">((resolve) => {
            const timeout = setTimeout(() => {
              setDgStatus("error");
              resolve("error");
            }, 5000);
            const ws = new WebSocket(DG_URL, ["token", tok.token]);
            dgWsRef.current = ws;
            ws.onopen = () => {
              clearTimeout(timeout);
              setDgStatus("live");
              const rec = new MediaRecorder(new MediaStream([audioTracks[0]]), {
                mimeType: "audio/webm;codecs=opus",
              });
              recorderRef.current = rec;
              rec.ondataavailable = (ev) => {
                if (ev.data.size > 0 && ws.readyState === 1)
                  ev.data.arrayBuffer().then((b) => ws.send(b));
              };
              rec.start(250);
              resolve("live");
            };
            ws.onmessage = (m) => {
              try {
                const d = JSON.parse(m.data as string) as DgResult;
                if (d.type === "SpeechStarted") {
                  speechStartedRef.current = Date.now();
                  return;
                }
                if (d.type === "UtteranceEnd") {
                  if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
                  fireTurnEnd();
                  return;
                }
                const text = d.channel?.alternatives?.[0]?.transcript;
                if (text && d.is_final) {
                  const { minConf, segMs } = dgWordStats(d, speechStartedRef.current);
                  onCustomerText(text, "Kunde", !!d.speech_final, minConf, segMs);
                }
              } catch {
                /* ignore */
              }
            };
            ws.onerror = () => {
              clearTimeout(timeout);
              setDgStatus("error");
              resolve("error");
            };
            ws.onclose = () => {
              if (ws !== dgWsRef.current) return;
              setDgStatus((s) => (s === "live" ? "off" : s));
            };
          });

          return { ok: true, dg };
        } catch {
          setDgStatus("error");
          return { ok: true, dg: "error" };
        }
      } catch {
        return { ok: false };
      }
    },
    [onCustomerText, teardownCustomerPipeline],
  );

  const stopSystem = useCallback(
    () => teardownCustomerPipeline(),
    [teardownCustomerPipeline],
  );

  // Browser-Direktanruf: Gesprächsende automatisch erkennen → Souffleur stoppen.
  const callWasActiveRef = useRef(false);
  const handleSipStatus = useCallback(
    (s: string) => {
      if (s === "ringing" || s === "in-call") {
        if (!callWasActiveRef.current) {
          setElapsed(0);
          // Frischer Anruf im selben Fenster: Treppe + Kunden-Kontext neu,
          // sonst fließt das Transkript des Vorgesprächs in den neuen Call.
          goStage("opener1");
          custRef.current = "";
          turnsRef.current = [];
          historyRef.current = [];
          lastSpeakerRef.current = null;
          aiGenRef.current++;
          setCustomerTranscript("");
          setAiLine(null);
          // Anruf beim PLATZIEREN erfassen (zählt jeden Anrufversuch, auch
          // unbeantwortete — unabhängig von der Dispo und vom fragilen
          // window.opener-Weg). Die Dispo aktualisiert dieselbe Row über die
          // externalCallId (Upsert serverseitig).
          const cid = crypto.randomUUID();
          callIdRef.current = cid;
          fetch("/api/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: lead.id, externalCallId: cid }),
          }).catch(() => {});
          // KI-Souffleur beim Klingeln vorwärmen (Prompt-Cache + Verbindung),
          // damit die ERSTE diktierte Zeile so schnell kommt wie die folgenden.
          fetch("/api/souffleur/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ warm: true }),
          }).catch(() => {});
        }
        callWasActiveRef.current = true;
        setCallEnded(false);
      } else if (
        (s === "ended" || s === "error" || s === "idle") &&
        callWasActiveRef.current
      ) {
        callWasActiveRef.current = false;
        setCallEnded(true);
        stopSystem();
      }
    },
    [stopSystem, goStage, lead.id],
  );

  // ── Stille-Erkennung: Gesprächsende auch beim tel:-Anruf erkennen ──
  const micLevelRef = useRef(0);
  const sysLevelRef = useRef(0);
  const listeningRef = useRef(false);
  const sysListeningRef = useRef(false);
  const callEndedRef = useRef(false);
  const stopSystemRef = useRef(stopSystem);
  const silentSecsRef = useRef(0);
  const advisorTalkSecsRef = useRef(0); // wie lange der Berater am Stück spricht
  micLevelRef.current = micLevel;
  sysLevelRef.current = sysLevel;
  listeningRef.current = listening;
  sysListeningRef.current = sysListening;
  callEndedRef.current = callEnded;
  stopSystemRef.current = stopSystem;
  // Phase 9: Live-Werte für die KI-Pipeline spiegeln.
  elapsedRef.current = elapsed;
  phaseRef.current = phase;
  repNameRef.current = repName;
  profileRef.current = profile;
  useEffect(() => {
    const t = setInterval(() => {
      if (callEndedRef.current) {
        silentSecsRef.current = 0;
        return;
      }
      const audioOn = listeningRef.current || sysListeningRef.current;
      const silent = micLevelRef.current < 0.05 && sysLevelRef.current < 0.05;
      if (audioOn && silent) {
        silentSecsRef.current += 1;
        if (silentSecsRef.current === 25) setMaybeEnded(true);
        if (silentSecsRef.current >= 45) {
          // NIE hart beenden, solange die SIP-Leitung noch steht — der Kunde
          // schaut vielleicht nur in Ruhe die genannte Website an oder holt
          // einen Kollegen. Sonst reißt es Souffleur + Transkript mitten im
          // wichtigsten Gespräch ab. Bei aktivem SIP nur der Hinweis.
          if (sipControlRef.current?.isActive()) {
            setMaybeEnded(true);
          } else {
            setMaybeEnded(false);
            setCallEnded(true);
            stopSystemRef.current();
          }
        }
      } else {
        silentSecsRef.current = 0;
        setMaybeEnded(false);
      }
      // Pacing gegen Monolog: zählt, wie lange der Berater am Stück spricht
      // (eigener Mikro-Pegel). Ab 30 s am Stück → sanfter „Frag was"-Cue.
      if (micLevelRef.current > 0.06) advisorTalkSecsRef.current += 1;
      else advisorTalkSecsRef.current = 0;
      setPacingCue(!callEndedRef.current && advisorTalkSecsRef.current >= 30);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Gemeinsamer Reset für den Kunden-Kontext ────────────────────
  const resetCustomerContext = useCallback(() => {
    custRef.current = "";
    historyRef.current = [];
    turnsRef.current = [];
    lastSpeakerRef.current = null;
    lastAiLenRef.current = 0;
    setCustomerTranscript("");
    aiGenRef.current++; // laufende Streams verwerfen (gen !== aiGenRef)
    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = null;
    }
    setAiLine(null);
    setDetected(null);
    setWhy(null);
    setPhase("kalt");
    setConvoState("warten");
    goStage("opener1"); // Einstiegs-Treppe für den nächsten Anruf zurücksetzen
    // Sprech-Lock-/Geräusch-Refs ebenfalls neu (frischer Anruf).
    speechLockUntilRef.current = 0;
    isFinalLockUntilRef.current = 0;
    lockHardCapRef.current = 0;
    speechStartedRef.current = 0;
    lastCustTextRef.current = "";
    lastTurnQualifiedRef.current = false;
  }, [goStage]);

  // ── Test-Modus: Skript-Anruf (fiktiver Kunde) ───────────────────
  const startTest = useCallback(
    (scriptKey: string) => {
      const script = TEST_SCRIPTS[scriptKey];
      if (!script) return;
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      setTestActive(scriptKey);
      setTestStep(0);
      resetCustomerContext();
      setTestHint("Test läuft — antworte laut, übe deinen Pitch.");

      let i = 0;
      const playNext = () => {
        if (i >= script.length) {
          setTestHint("Test fertig — Reset, dann ist der echte Call sauber.");
          setTestActive(null);
          resetCustomerContext();
          return;
        }
        const step: ScriptStep = script[i];
        testTimerRef.current = setTimeout(() => {
          if (step.note) setTestHint(step.note);
          onCustomerText(step.text, "Test");
          i++;
          setTestStep(i);
          playNext();
        }, step.delayMs);
      };
      playNext();
    },
    [onCustomerText, resetCustomerContext],
  );

  const stopTest = useCallback(() => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    testTimerRef.current = null;
    setTestActive(null);
    setTestHint(null);
    resetCustomerContext();
  }, [resetCustomerContext]);

  // Auto-start mic when Souffleur opens — „hört sofort mit"
  useEffect(() => {
    const t = setTimeout(() => {
      startMic();
    }, 250);
    return () => {
      clearTimeout(t);
      stopMic();
      stopSystem();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tastatur-Shortcuts — Hände am Gespräch statt an der Maus. Die konkrete
  // Aktion steht in onShortcutRef (wird unten nach den Funktionen gesetzt).
  const onShortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const h = (e: KeyboardEvent) => onShortcutRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Manueller KI-Tipp (Button) ──────────────────────────────────
  async function askAI() {
    setAiBusy(true);
    setWhy(null);
    const gen = ++aiGenRef.current; // beansprucht die neueste Generation
    try {
      const res = await fetch("/api/souffleur/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: turnsRef.current.slice(-8),
          transcript: (custRef.current || transcript).slice(-700),
          hook: lead.auditHook,
          company: lead.company,
          trade: lead.trade,
          tradeContext: tradeCard ? buildTradeContext(tradeCard) : null,
          neinTyp: classifyNein(custRef.current.slice(-200)),
          phase: phaseRef.current,
          stage: stageRef.current,
          moveId: moveIdRef.current,
          elapsedSec: elapsedRef.current,
          repName: repNameRef.current.trim() || null,
          repCity: repCityRef.current || null,
          profile: profileRef.current,
        }),
      });
      if ((res.headers.get("content-type") || "").includes("application/json")) {
        const data = await res.json();
        setAiLine(data.message ?? "KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
        setAiBusy(false);
        return;
      }
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (gen !== aiGenRef.current) {
            try {
              await reader.cancel();
            } catch {}
            break;
          }
          acc += decoder.decode(value, { stream: true });
          if (acc.trim()) setAiLine(acc);
        }
      }
    } catch {
      setAiLine("KI nicht erreichbar.");
    }
    setAiBusy(false);
  }

  // Wärme manuell setzen → sofort einen passenden Satz für die Phase holen.
  function pickPhase(p: Phase) {
    setPhase(p);
    phaseRef.current = p;
    if (aiReady) askAiNow();
  }

  function pickObjection(id: string) {
    const m = getMove(id);
    if (m) {
      setMove(m);
      setDetected(m.label);
      setAiLine(null);
      setWhy(null);
    }
  }

  function copyLine() {
    navigator.clipboard?.writeText(aiLine ?? stageLine).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  async function disposition(key: string, note?: string) {
    // 1. Laufenden Browser-Anruf aktiv beenden (SIP-BYE), SOLANGE der WebSocket
    //    noch lebt — sonst bleibt der Anruf beim Gegenüber/Handy stehen.
    try {
      sipControlRef.current?.hangup();
    } catch {}
    // 2. Dispo an die Pipeline melden — inkl. echtem Gesprächs-Transkript,
    //    ABER nur wenn der Berater Einwilligung gesetzt hat (§201 StGB: ohne
    //    Consent wird nichts gespeichert). Das echte Transkript ist die Basis
    //    für CRM-Gedächtnis, Post-Call-Summary und Coaching.
    // Datenschutz/Compliance: Es wird AUSSCHLIESSLICH gespeichert, was der
    // Cold-Caller (Berater) selbst sagt — der Kundenton wird NICHT abgelegt.
    // Dadurch entfällt die §201-Frage (wir zeichnen nur die eigene Mitarbeiter-
    // stimme auf), und der Berater-Wortlaut wird zur Nachvollziehbarkeit
    // (Beschwerde-/Qualitätsfall) IMMER erfasst — unabhängig vom Consent-Schalter.
    const transcript =
      turnsRef.current
        .filter((t) => t.speaker === "advisor")
        .map((t) => t.text)
        .join("\n")
        .slice(-8000) || null;
    // 2a. SICHERUNGSNETZ: Dispo + Notiz + Transkript IMMER serverseitig
    //     persistieren — unabhängig von window.opener. Sonst geht die Bewertung
    //     still verloren, sobald der Opener null ist (Popup neu geladen / aus
    //     dem Verlauf / rel=noopener-Ersatzlink). Idempotent per externalCallId.
    try {
      await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          externalCallId: callIdRef.current,
          dispo: key,
          transcript,
          note: note?.trim() || null,
        }),
      });
    } catch {}
    // 2b. Opener informieren (volle Kadenz: Status/Termin/Mail + Sprung zum
    //     nächsten Lead). Fehlt der Opener, ist die Bewertung dank 2a trotzdem
    //     sicher — nur der automatische Lead-Statuswechsel entfällt dann.
    try {
      window.opener?.postMessage(
        {
          type: "souffleur:dispo",
          leadId: lead.id,
          dispo: key,
          note: note?.trim() || null,
          transcript,
          consent,
          company: lead.company,
          trade: lead.trade,
          callId: callIdRef.current,
        },
        window.location.origin,
      );
    } catch {}
    // 3. Erst schließen, wenn das BYE über die WSS-Verbindung raus ist
    //    (Fenster-Close reißt sonst den Socket vor dem BYE ab). 500 ms gibt
    //    auch bei höherer Latenz/CPU-Last Luft, damit kein verwaister Anruf bleibt.
    setTimeout(() => window.close(), 500);
  }

  // Pflicht-Abfrage öffnen (Ergebnis vorwählen, Notiz leer). Die Leitung wird
  // sofort getrennt (Berater hat das Gespräch ja beendet) — getaggt wird danach.
  function openResult(key: string | null) {
    try {
      sipControlRef.current?.hangup();
    } catch {}
    setResultDispo(key);
    setResultNote("");
    setResultOpen(true);
  }
  // Speichern & weiter — nur mit Ergebnis UND nicht-leerer Notiz.
  function finishResult() {
    if (!resultDispo || !resultNote.trim()) return;
    setResultOpen(false);
    disposition(resultDispo, resultNote);
  }

  // Shortcut-Aktionen: Leertaste=neuer KI-Satz, C=kopieren, 1=Termin,
  // 2=Rückruf, Esc=auflegen. (Ignoriert Eingabefelder.)
  onShortcutRef.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Bei offener Pflicht-Abfrage greifen die Gesprächs-Shortcuts nicht mehr
    // (sonst würde Esc/1/2 die Vorauswahl + Notiz zurücksetzen).
    if (resultOpen) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      // Im Einstieg = „nächster Schritt", erst im freien Gespräch = neuer KI-Satz.
      if (stageRef.current === "opener1") {
        goStage("warten");
      } else if (stageRef.current === "warten") {
        goStage("bridge");
        setConvoState("denkt");
        askAiNow();
      } else if (stageRef.current === "bridge") {
        goStage("frei");
        setConvoState("denkt");
        askAiNow();
      } else {
        askAI();
      }
    } else if (e.key.toLowerCase() === "c") {
      copyLine();
    } else if (e.key === "1") {
      openResult("appointment");
    } else if (e.key === "2") {
      openResult("callback");
    } else if (e.key === "Escape") {
      openResult(null);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-fg)]">
      {maybeEnded && (
        <div className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2 shadow-lg">
          <span className="text-[13px] font-medium text-[var(--color-fg)]">
            Es ist still — Gespräch vorbei?
          </span>
          <button
            onClick={() => {
              silentSecsRef.current = 0;
              setMaybeEnded(false);
            }}
            className="rounded-full bg-[var(--color-surface-3)] px-3 py-1 text-[12px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-hairline)]"
          >
            Weiter
          </button>
          <button
            onClick={() => {
              setMaybeEnded(false);
              setCallEnded(true);
              try {
                sipControlRef.current?.hangup();
              } catch {}
              stopSystem();
            }}
            className="rounded-full bg-[#ffeceb] px-3 py-1 text-[12px] font-semibold text-[#d70015] hover:bg-[#ffd1cf]"
          >
            Beenden
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-copper-500)]" />
            <span className="truncate text-[15px] font-semibold">
              {lead.company}
            </span>
            <span className="tabular text-[13px] text-[var(--color-fg-mute)]">
              {mm}:{ss}
            </span>
            {callEnded && (
              <span className="rounded-full bg-[#ffeceb] px-2 py-0.5 text-[10.5px] font-medium text-[#d70015]">
                beendet
              </span>
            )}
          </div>
          {lead.phone && (
            <div className="tabular text-[12px] text-[var(--color-fg-mute)]">
              {lead.phone} · {lead.trade ?? ""} {lead.city ?? ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConsent((c) => !c)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition",
              consent
                ? "bg-[#e6f7ea] text-[#1a7f37]"
                : "bg-[var(--color-surface-2)] text-[var(--color-fg-mute)]",
            )}
            title="§201 StGB: Aufnahme nur mit Zustimmung. Standard: nichts speichern."
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {consent ? "Mit Zustimmung" : "Kein Speichern"}
          </button>
          <button
            onClick={() => window.close()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-fg-mute)] hover:bg-[var(--color-surface-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Readiness-Banner ───────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-[var(--color-hairline)] px-5 py-2">
        <ReadinessChip
          label="Mikro"
          status={
            micStatus === "live"
              ? "on"
              : micStatus === "no-permission" || micStatus === "error"
                ? "error"
                : "off"
          }
        />
        <ReadinessChip
          label="PC-Ton"
          status={
            sysListening && dgStatus === "live"
              ? "on"
              : sysListening
                ? "warn"
                : "off"
          }
        />
        <ReadinessChip
          label="KI"
          status={aiReady === null ? "off" : aiReady ? "on" : "error"}
        />
        {!sysListening && (
          <button
            onClick={() => setShowShareGuide(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--color-copper-50)] px-3 py-1 text-[11.5px] font-medium text-[var(--color-copper-600)] transition hover:bg-[var(--color-copper-100)]"
          >
            <Volume2 className="h-3 w-3" />
            Kunden-Ton verbinden
          </button>
        )}
        {sysListening && dgStatus === "live" && (
          <span className="ml-auto text-[11.5px] text-[var(--color-success)]">
            Alle Systeme bereit
          </span>
        )}
      </div>

      {/* ── ShareGuide Overlay ──────────────────────────────────── */}
      <ShareGuide
        open={showShareGuide}
        onShare={startSystem}
        onClose={() => setShowShareGuide(false)}
      />

      {/* ── Voicemail-Skript (beim Dispo „Mailbox" vorlesen) ─────── */}
      {showVoicemail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-[520px] rounded-[18px] bg-white p-6 shadow-[var(--shadow-2)]">
            <div className="mb-2 flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[var(--color-copper-600)]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-copper-700)]">
                Mailbox — das jetzt vorlesen
              </span>
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums",
                  vmSecs === 0
                    ? "bg-[#ffeceb] text-[#d70015]"
                    : vmSecs <= 5
                      ? "bg-[#fff4e5] text-[#b25000]"
                      : "bg-[#eef2ff] text-[#0a3977]",
                )}
              >
                {vmSecs === 0 ? "Zeit um" : `${vmSecs}s`}
              </span>
            </div>
            <p className="rounded-[12px] bg-[#eff5ff] p-4 text-[16px] font-medium leading-relaxed text-[var(--color-fg)]">
              {fillHook(
                lead.contactName
                  ? VOICEMAIL_SCRIPT.replace("[Name]", lead.contactName)
                  : VOICEMAIL_SCRIPT.replace("Herr [Name], ", ""),
                lead.auditHook,
              )}
            </p>
            <p className="mt-2 text-[11px] text-[var(--color-fg-mute)]">
              [Berater] und [Nummer] selbst einsetzen.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowVoicemail(false)}
                className="rounded-full bg-[var(--color-surface-2)] px-4 py-2 text-[13px] font-medium text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]"
              >
                Zurück
              </button>
              <button
                onClick={() => {
                  setShowVoicemail(false);
                  openResult("voicemail");
                }}
                className="rounded-full bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0077ed]"
              >
                Besprochen → speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pflicht-Abfrage nach dem Anruf: Ergebnis + Pflicht-Notiz ────────
          Ohne Ergebnis UND Notiz wird nichts gespeichert. Danach schließt
          das Fenster und die Liste springt zum nächsten Lead. */}
      {resultOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-[560px] rounded-[18px] bg-white p-6 shadow-[var(--shadow-2)]">
            <div className="mb-1 flex items-center gap-2">
              <PhoneOff className="h-4 w-4 text-[var(--color-copper-600)]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-copper-700)]">
                Anruf vorbei — was ist passiert?
              </span>
            </div>
            <p className="mb-3 text-[12px] text-[var(--color-fg-mute)]">
              {lead.company}
              {lead.trade ? ` · ${lead.trade}` : " · Branche unbekannt"}
            </p>

            {/* 1. Ergebnis wählen */}
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-fg-mute)]">
              Ergebnis
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {DISPOS.filter((d) => d.key !== "voicemail").map((d) => {
                const active = resultDispo === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setResultDispo(d.key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[var(--color-copper-500)] text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            {/* 2. Schnell-Gründe (tippen → an Notiz anhängen) */}
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-fg-mute)]">
              Grund (antippen)
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REASON_CHIPS.map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    setResultNote((prev) => {
                      const has = prev
                        .split(/\s*·\s*/)
                        .map((s) => s.trim())
                        .includes(r);
                      if (has) return prev;
                      return prev.trim() ? `${prev.trim()} · ${r}` : r;
                    })
                  }
                  className="rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-[12px] text-[var(--color-fg-dim)] hover:border-[var(--color-copper-400)] hover:text-[var(--color-fg)]"
                >
                  + {r}
                </button>
              ))}
            </div>

            {/* 3. Pflicht-Notiz */}
            <textarea
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              autoFocus
              rows={3}
              placeholder="Pflicht: Was kam raus? Warum gescheitert / nächster Schritt …"
              className="w-full resize-y rounded-[12px] border border-[var(--color-border)] bg-white p-3 text-[14px] leading-relaxed text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
            />

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setResultOpen(false)}
                className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]"
              >
                Zurück
              </button>
              <button
                onClick={finishResult}
                disabled={!resultDispo || !resultNote.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-colors",
                  !resultDispo || !resultNote.trim()
                    ? "cursor-not-allowed bg-[var(--color-surface-3)] text-[var(--color-fg-mute)]"
                    : "bg-[var(--color-copper-500)] hover:bg-[#0077ed]",
                )}
              >
                Speichern & nächster Lead
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {(!resultDispo || !resultNote.trim()) && (
              <p className="mt-2 text-right text-[11px] text-[var(--color-fg-mute)]">
                {!resultDispo
                  ? "Ergebnis wählen und kurz notieren, dann geht's weiter."
                  : "Kurze Pflicht-Notiz fehlt noch."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Hauptbühne: Wärme + ein Diktat-Satz ─────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Gesprächswärme */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-fg-mute)]">
              <Flame className="h-3.5 w-3.5 text-[var(--color-copper-500)]" />
              Gesprächswärme
            </span>
            {why && (
              <span className="truncate pl-3 text-[11.5px] text-[var(--color-fg-dim)]">
                {why}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {PHASES.map((p) => {
              const active = p.key === phase;
              return (
                <button
                  key={p.key}
                  onClick={() => pickPhase(p.key)}
                  className={cn(
                    "flex-1 rounded-[10px] px-2.5 py-1.5 text-left transition",
                    active
                      ? PHASE_STYLE[p.key]
                      : "bg-[var(--color-surface-2)] text-[var(--color-fg-mute)] hover:bg-[var(--color-surface-3)]",
                  )}
                  title={p.tagline}
                >
                  <div className="text-[12px] font-semibold">{p.label}</div>
                  <div
                    className={cn(
                      "truncate text-[10px] leading-tight",
                      active ? "opacity-90" : "opacity-70",
                    )}
                  >
                    {p.tagline}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Einstiegs-Treppe — fester Anfang, damit ein Anfänger nie hängt */}
        {stage !== "frei" && (
          <div className="mb-3 flex items-center gap-2">
            {STAGES.filter((s) => s.key !== "frei").map((s) => {
              const order = ["opener1", "warten", "bridge"];
              const here = order.indexOf(stage);
              const mine = order.indexOf(s.key);
              const active = s.key === stage;
              const done = mine < here;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full transition",
                      active
                        ? "bg-[var(--color-copper-500)]"
                        : done
                          ? "bg-[var(--color-copper-300)]"
                          : "bg-[var(--color-surface-3)]",
                    )}
                  />
                  {active && (
                    <span className="text-[11.5px] font-semibold text-[var(--color-fg-dim)]">
                      {s.tagline}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* DER Satz — wörtlich ablesen */}
        <div
          className={cn(
            "rounded-[20px] bg-white p-6 shadow-[var(--shadow-2)] ring-1 transition-[box-shadow,--tw-ring-color] duration-500 md:p-8",
            aiLine
              ? "ring-[var(--color-copper-300)] shadow-[var(--shadow-copper)]"
              : "ring-black/[0.04]",
          )}
        >
          <div className="flex items-center gap-2">
            {aiLine && (
              <span className="breathe h-2 w-2 shrink-0 rounded-full bg-[var(--color-copper-500)]" />
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white",
                showListen ? "bg-[#1a7f37]" : "bg-[#0a3977]",
              )}
            >
              {showListen ? "Jetzt zuhören" : "Jetzt wörtlich sagen"}
            </span>
            {convoState === "kunde" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a7f37]">
                <span className="breathe h-1.5 w-1.5 rounded-full bg-[#1a7f37]" />
                Kunde spricht…
              </span>
            )}
            {convoState === "denkt" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-copper-600)]">
                <span className="breathe h-1.5 w-1.5 rounded-full bg-[var(--color-copper-500)]" />
                KI wertet aus…
              </span>
            )}
            {convoState === "berater" && !pacingCue && (
              <span className="text-[11px] font-medium text-[var(--color-fg-mute)]">
                Du sprichst
              </span>
            )}
            {pacingCue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-semibold text-[#b25000]">
                Langsamer — stell eine Frage, lass ihn reden
              </span>
            )}
            <button
              onClick={copyLine}
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#1a7f37]" /> kopiert
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> kopieren
                </>
              )}
            </button>
          </div>

          {showListen ? (
            <p className="mt-3 text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-[#1a7f37] sm:text-[28px] md:text-[32px]">
              Jetzt zuhören. Lass ihn reden.
              <span className="mt-1 block text-[14px] font-medium text-[var(--color-fg-mute)]">
                Stille ist okay — nicht reinquatschen. Sobald er antwortet,
                kommt dein nächster Satz.
              </span>
            </p>
          ) : (
            <p className="mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.028em] text-[var(--color-fg)] sm:text-[34px] md:text-[40px]">
              {aiLine ?? stageLine}
            </p>
          )}

          {!aiLine && move.alts.length > 0 && (
            <p className="mt-3 text-[14px] leading-snug text-[var(--color-fg-mute)]">
              <span className="font-semibold">oder:</span> {move.alts[0]}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--color-fg-mute)]">
            <button
              onClick={askAI}
              disabled={aiBusy}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-copper-500)] px-3 py-1 text-[11.5px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60"
            >
              <Sparkles className="h-3 w-3" />
              {aiBusy ? "denkt…" : "KI: neuer Satz"}
            </button>
            {aiReady === false && (
              <span className="text-[var(--color-fg-mute)]">
                KI inaktiv — lokaler Tipp
              </span>
            )}
            {detected && !aiLine && <span>erkannt: {detected}</span>}
          </div>
        </div>

        {/* Headset-Pflicht: ohne Headset läuft die Kundenstimme aus dem
            Lautsprecher zurück ins Mikro → Echo auf BEIDEN Seiten + matschige
            Erkennung. Das ist die häufigste „Ton kacke"-Ursache. */}
        <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[#fff7ed] px-3.5 py-2.5 ring-1 ring-[#fdba74]">
          <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-[#c2410c]" />
          <p className="text-[12.5px] leading-snug text-[#9a3412]">
            <span className="font-semibold">Headset benutzen.</span> Ohne Headset
            hört der Kunde sich selbst (Echo) und die Spracherkennung wird matschig
            — nie über Laptop-Lautsprecher telefonieren.
          </p>
        </div>

        {/* Anruf-Steuerung (Browser-Direktanruf) — immer gemountet für Auto-Dial */}
        <div className="mt-3">
          <SipDialer
            defaultNumber={lead.phone ?? ""}
            autoDial={autoDial}
            onRemoteStream={(stream) => handleSipRemoteStream(stream)}
            onStatus={handleSipStatus}
            controlRef={sipControlRef}
            getLocalStream={() => micStreamRef.current}
          />
        </div>

        {/* ── Werkzeug-Schublade (eingeklappt = ruhige Bühne) ───── */}
        <button
          onClick={() => setToolsOpen((o) => !o)}
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-copper-600)] transition hover:text-[var(--color-copper-700)]"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition", toolsOpen ? "rotate-180" : "")}
          />
          Werkzeuge, Playbook &amp; Transkript
        </button>

        {toolsOpen && (
          <div className="mt-3 space-y-5">
            {/* Briefing */}
            {briefingOpen ? (
              <div className="rounded-[16px] border border-[#cfe0fd] bg-[#f5f9ff] p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#0a3977]">
                    Briefing · {lead.trade ?? "Betrieb"}
                    {lead.city ? ` · ${lead.city}` : ""} ·{" "}
                    {lead.website ? "hat Website" : "KEINE WEBSITE = heiß"}
                  </span>
                  <button
                    onClick={() => setBriefingOpen(false)}
                    className="text-[11px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
                  >
                    ausblenden
                  </button>
                </div>
                {lead.auditHook && (
                  <div className="mb-3 rounded-[10px] bg-white px-3 py-2 ring-1 ring-[#cfe0fd]">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#0a3977]">
                      Konkreter Befund — im Gespräch fallenlassen
                    </span>
                    <p className="mt-0.5 text-[13px] font-medium leading-snug text-[var(--color-fg)]">
                      {lead.auditHook}
                    </p>
                  </div>
                )}
                {lead.notes?.trim() && (
                  <div className="mb-3 rounded-[10px] bg-white px-3 py-2 ring-1 ring-[#cfe0fd]">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#0a3977]">
                      Bisherige Notizen — was beim letzten Mal war
                    </span>
                    <p className="mt-0.5 max-h-[110px] overflow-y-auto whitespace-pre-line text-[12.5px] leading-snug text-[var(--color-fg-dim)]">
                      {lead.notes}
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {tradeCard && (
                    <div>
                      <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg-mute)]">
                        Wahrscheinliche Schmerzpunkte
                      </div>
                      <ul className="space-y-1">
                        {tradeCard.painPoints.slice(0, 2).map((p, i) => (
                          <li
                            key={i}
                            className="flex gap-1.5 text-[12px] leading-snug text-[var(--color-fg-dim)]"
                          >
                            <span className="mt-0.5 text-[var(--color-copper-500)]">
                              ▸
                            </span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg-mute)]">
                      Womit er kommt → antippen für die Antwort
                    </div>
                    <div className="flex flex-col gap-1">
                      {[
                        "no_time",
                        "no_interest",
                        lead.website ? "have_website" : "kumpel_macht",
                        "price",
                      ]
                        .map((id) => getMove(id))
                        .filter((m): m is Move => !!m)
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => pickObjection(m.id)}
                            title={fillHook(m.line, lead.auditHook)}
                            className="rounded-[8px] bg-white px-2.5 py-1.5 text-left text-[11.5px] font-medium text-[var(--color-fg-dim)] ring-1 ring-black/[0.04] transition hover:bg-[#eff5ff] hover:text-[var(--color-copper-700)]"
                          >
                            „{m.label}"
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setBriefingOpen(true)}
                className="text-[11px] font-medium text-[var(--color-copper-600)] hover:underline"
              >
                + Briefing einblenden
              </button>
            )}

            {/* Cold-Calling-Profil — Stil des KI-Dirigenten (pro Browser gespeichert) */}
            <div className="mb-3 rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
              <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                Cold-Calling-Profil — so formuliert die KI
              </div>
              <div className="space-y-2">
                {(
                  [
                    { k: "freundlichkeit", label: "Ton", opts: [["direkt", "direkt"], ["ausgewogen", "ausgewogen"], ["herzlich", "herzlich"]] },
                    { k: "genauigkeit", label: "Tempo", opts: [["locker", "locker"], ["ausgewogen", "ausgewogen"], ["praezise", "präzise"]] },
                    { k: "anrede", label: "Anrede", opts: [["sie", "Sie"], ["du", "Du"]] },
                  ] as const
                ).map((row) => (
                  <div key={row.k} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[10.5px] text-[var(--color-fg-mute)]">{row.label}</span>
                    <div className="flex flex-wrap gap-1">
                      {row.opts.map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() => updateProfile({ [row.k]: val } as Partial<ColdCallProfile>)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                            profile[row.k] === val
                              ? "bg-[var(--color-copper-500)] text-white"
                              : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[#eff5ff]",
                          )}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[10.5px] text-[var(--color-fg-mute)]">Humor</span>
                  <button
                    onClick={() => updateProfile({ humor: !profile.humor })}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      profile.humor
                        ? "bg-[var(--color-copper-500)] text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[#eff5ff]",
                    )}
                  >
                    {profile.humor ? "ein" : "aus"}
                  </button>
                </div>
                <input
                  value={profile.stilnotiz ?? ""}
                  onChange={(e) => updateProfile({ stilnotiz: e.target.value })}
                  placeholder="Eigene Stil-Notiz (optional), z.B. 10 Jahre Garantie erwähnen"
                  className="w-full rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-2 py-1 text-[12px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
                />
              </div>
            </div>

            {/* Berater-Name + Power-Fragen + Nein-Gradient */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
                <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                  Dein Name (für „[Name]")
                </div>
                <input
                  value={repName}
                  onChange={(e) => {
                    setRepName(e.target.value);
                    try {
                      localStorage.setItem("aw_rep_name", e.target.value);
                    } catch {}
                  }}
                  placeholder="z.B. Wesam"
                  className="w-full rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-2 py-1 text-[12px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
                />
              </div>

              <div className="rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
                <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                  Power-Frage → groß
                </div>
                <div className="flex flex-col gap-1">
                  {POWER_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setAiLine(
                          fillTradeHook(q.question, lead.contactName, lead.city),
                        );
                        setDetected(null);
                        setWhy(null);
                      }}
                      className="rounded-[8px] bg-[var(--color-surface-2)] px-2 py-1.5 text-left text-[11px] leading-snug text-[var(--color-fg-dim)] transition hover:bg-[#eff5ff] hover:text-[var(--color-copper-700)]"
                    >
                      {q.question}
                    </button>
                  ))}
                </div>
              </div>

              {neinGradient ? (
                <div className="rounded-[12px] border border-[#fde0c8] bg-[#fff7ef] p-3">
                  <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#b25000]">
                    Nein: {neinTyp} · {neinGradient.erfolgsquote}
                  </div>
                  <p className="text-[12px] leading-snug text-[#7a4a10]">
                    {neinGradient.behandlung}
                  </p>
                </div>
              ) : (
                <div className="rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
                  <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                    Nein-Gradient
                  </div>
                  <p className="text-[11.5px] leading-snug text-[var(--color-fg-mute)]">
                    Sobald ein „Nein" fällt, erscheint hier die passende
                    Behandlung.
                  </p>
                </div>
              )}
            </div>

            {/* Ja-Leiter zum Termin */}
            <div className="rounded-[14px] border border-[var(--color-hairline)] bg-white p-4">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-mute)]">
                Ja-Leiter zum Termin · antippen → groß
              </div>
              <ol className="flex flex-col gap-1">
                {MICRO_COMMITMENTS.map((m) => (
                  <li key={m.stufe}>
                    <button
                      onClick={() => {
                        setAiLine(
                          fillTradeHook(m.phrase, lead.contactName, lead.city),
                        );
                        setDetected(null);
                        setWhy(null);
                      }}
                      className="flex w-full items-start gap-2 rounded-[8px] px-2 py-1 text-left text-[12px] leading-snug text-[var(--color-fg-dim)] transition hover:bg-[#eff5ff]"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[9px] font-bold text-white">
                        {m.stufe}
                      </span>
                      <span>
                        <span className="font-medium text-[var(--color-fg)]">
                          {m.typ}:
                        </span>{" "}
                        {m.phrase}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* Branchen-Karte */}
            {tradeCard && (
              <div className="rounded-[14px] border border-[var(--color-copper-100)] bg-[var(--color-copper-50)]/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[var(--color-copper-600)]" />
                  <span className="text-[12px] font-semibold text-[var(--color-copper-700)]">
                    Branchen-Playbook: {tradeCard.label}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAiLine(
                      fillTradeHook(tradeCard.killerQuestion, lead.contactName, lead.city),
                    );
                    setDetected(null);
                    setWhy(null);
                  }}
                  className="mb-3 block w-full rounded-[10px] bg-white p-3 text-left shadow-sm ring-1 ring-black/[0.04] transition hover:ring-[var(--color-copper-300)]"
                >
                  <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    Killer-Frage · antippen
                  </div>
                  <p className="text-[13px] leading-snug text-[var(--color-fg-dim)]">
                    {tradeCard.killerQuestion}
                  </p>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                      Pain Points · antippen
                    </div>
                    <ul className="space-y-1.5 text-[12px] leading-snug text-[var(--color-fg-dim)]">
                      {tradeCard.painPoints.map((p, i) => (
                        <li key={i}>
                          <button
                            onClick={() => {
                              setAiLine(fillTradeHook(p, lead.contactName, lead.city));
                              setDetected(null);
                              setWhy(null);
                            }}
                            className="flex w-full gap-1.5 text-left transition hover:text-[var(--color-copper-700)]"
                          >
                            <span className="mt-0.5 text-[var(--color-copper-500)]">
                              {i + 1}.
                            </span>
                            <span>{p}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setAiLine(
                        fillTradeHook(tradeCard.roiArgument, lead.contactName, lead.city),
                      );
                      setDetected(null);
                      setWhy(null);
                    }}
                    className="block rounded-[10px] bg-white p-3 text-left shadow-sm ring-1 ring-black/[0.04] transition hover:ring-[var(--color-copper-300)]"
                  >
                    <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                      ROI-Argument · antippen
                    </div>
                    <p className="text-[12px] leading-snug text-[var(--color-fg-dim)]">
                      {tradeCard.roiArgument}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Schnell-Einwände */}
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                Einwand antippen
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {QUICK_OBJECTIONS.map((id) => {
                  const m = getMove(id);
                  if (!m) return null;
                  const active = move.id === id;
                  return (
                    <button
                      key={id}
                      onClick={() => pickObjection(id)}
                      className={cn(
                        "rounded-[10px] px-2.5 py-2 text-left text-[12px] font-medium transition",
                        active
                          ? "bg-[var(--color-copper-500)] text-white"
                          : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gatekeeper (Sekretariat / „worum geht's?") */}
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                Gatekeeper antippen → groß
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {["gk_durchstellen", "gk_rueckruf"].map((id) => {
                  const m = getMove(id);
                  if (!m) return null;
                  const active = move.id === id;
                  return (
                    <button
                      key={id}
                      onClick={() => pickObjection(id)}
                      className={cn(
                        "rounded-[10px] px-2.5 py-2 text-left text-[12px] font-medium transition",
                        active
                          ? "bg-[var(--color-copper-500)] text-white"
                          : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Abschluss-Techniken */}
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                Abschluss antippen → groß
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {CLOSING_TECHNIQUES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setAiLine(c.line);
                      setDetected(null);
                      setWhy(null);
                    }}
                    title={c.line}
                    className="rounded-[10px] bg-[#f0fdf4] px-2.5 py-2 text-left text-[12px] font-medium text-[#1a7f37] transition hover:bg-[#dcfce7]"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Redeanteil */}
            {(transcript.trim() || customerTranscript.trim()) &&
              (() => {
                const a = transcript.trim().length;
                const b = customerTranscript.trim().length;
                const total = a + b || 1;
                const repShare = Math.round((a / total) * 100);
                const tooMuch = repShare > 65;
                return (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.06em]">
                      <span className="text-[var(--color-fg-mute)]">
                        Redeanteil
                      </span>
                      <span
                        className={cn(
                          "tabular",
                          tooMuch
                            ? "text-[var(--color-copper-600)]"
                            : "text-[var(--color-fg-mute)]",
                        )}
                      >
                        Du {repShare}% · Kunde {100 - repShare}%
                      </span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          tooMuch
                            ? "bg-[var(--color-copper-500)]"
                            : "bg-[var(--color-copper-300)]",
                        )}
                        style={{ width: `${repShare}%` }}
                      />
                    </div>
                    {tooMuch && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--color-copper-600)]">
                        <span className="breathe h-1.5 w-1.5 rounded-full bg-[var(--color-copper-500)]" />
                        Lass ihn reden — stell eine Frage.
                      </p>
                    )}
                  </div>
                );
              })()}

            {/* Transkripte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border-l-[3px] border-[var(--color-fg-mute)]/25 bg-[var(--color-surface-2)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    Du · Mikro
                  </span>
                  <span
                    title={
                      micStatus === "no-key"
                        ? (transcriptionHint ?? undefined)
                        : undefined
                    }
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      micStatus === "live"
                        ? "bg-[#e6f7ea] text-[#1a7f37]"
                        : micStatus === "no-permission" || micStatus === "error"
                          ? "bg-[#ffeceb] text-[#d70015]"
                          : "bg-[var(--color-surface-3)] text-[var(--color-fg-mute)]",
                    )}
                  >
                    {micStatus === "live"
                      ? "Deepgram aktiv"
                      : micStatus === "no-permission"
                        ? "Mikro blockiert"
                        : micStatus === "no-key"
                          ? "Key fehlt"
                          : micStatus === "error"
                            ? "Fehler"
                            : "wartet"}
                  </span>
                </div>
                {micError && (
                  <p className="mb-2 rounded-md bg-[#fff0ef] px-2.5 py-1.5 text-[11.5px] leading-snug text-[#a40012]">
                    {micError}
                  </p>
                )}
                <p className="max-h-24 overflow-y-auto text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
                  {transcript || (
                    <span className="text-[var(--color-fg-faint)]">
                      {micStatus === "live"
                        ? "Sprich los — deine Worte erscheinen hier."
                        : "»Mikro mithören« starten oder Mikrofon erlauben."}
                    </span>
                  )}
                </p>
              </div>

              <div className="rounded-[14px] border-l-[3px] border-[var(--color-copper-400)] bg-[var(--color-copper-50)]/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    Kunde · PC-Ton
                  </span>
                  <span
                    title={
                      dgStatus === "no-key"
                        ? (transcriptionHint ?? undefined)
                        : undefined
                    }
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      dgStatus === "live"
                        ? "bg-[#e6f7ea] text-[#1a7f37]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-fg-mute)]",
                    )}
                  >
                    {dgStatus === "live"
                      ? "Deepgram aktiv"
                      : dgStatus === "no-key"
                        ? "Key fehlt"
                        : dgStatus === "error"
                          ? "Fehler"
                          : "—"}
                  </span>
                </div>
                <p className="max-h-24 overflow-y-auto text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
                  {customerTranscript ||
                    (dgStatus === "no-key" ? (
                      <span className="text-[var(--color-fg-faint)]">
                        {transcriptionHint ??
                          "PC-Ton wird gehört (Pegel unten), aber für die Wort-Transkription fehlt der DEEPGRAM_API_KEY."}
                      </span>
                    ) : (
                      <span className="text-[var(--color-fg-faint)]">
                        „PC-Ton (Kunde)" starten — die Worte des Gegenübers
                        steuern die Tipps.
                      </span>
                    ))}
                </p>
              </div>
            </div>

            {/* Test-Modus */}
            <div className="rounded-[14px] border border-[#fde68a] bg-[#fffbeb] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-[#b25000]" />
                  <span className="text-[12px] font-semibold text-[#7a5e1f]">
                    Test-Modus
                  </span>
                  {testActive && (
                    <span className="rounded-full bg-[#b25000] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Skript {testStep} läuft
                    </span>
                  )}
                </div>
                {testActive && (
                  <button
                    onClick={stopTest}
                    className="text-[11.5px] font-medium text-[#b25000] hover:text-[#7a5e1f]"
                  >
                    Stoppen
                  </button>
                )}
              </div>
              {testHint && (
                <p className="mb-2 text-[12px] italic text-[#7a5e1f]">
                  {testHint}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ["vollDurchlauf", "Voll-Durchlauf"],
                    ["schwieriger", "Schwierig"],
                    ["kurzeSession", "Kurz"],
                    ["socialMedia", "Social-Media"],
                    ["verbrannterKunde", "Verbrannter"],
                    ["einzelkaempfer", "Einzelkämpfer"],
                    ["vorwandKette", "Vorwand-Kette"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => startTest(key)}
                    disabled={!!testActive}
                    className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
                  >
                    ▶ {label}
                  </button>
                ))}
                <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#fde68a]">
                  <input
                    type="checkbox"
                    checked={micAsCustomer}
                    onChange={(e) => setMicAsCustomer(e.target.checked)}
                    className="accent-[#b25000]"
                  />
                  <span className="text-[12px] font-medium text-[#7a5e1f]">
                    Mein Mikro = Kunde
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Steuerleiste ────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-hairline)] px-3 py-2.5 md:px-5 md:py-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={listening ? stopMic : startMic}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition",
              listening
                ? "bg-[#ffeceb] text-[#d70015]"
                : "bg-[var(--color-copper-500)] text-white hover:bg-[#0077ed]",
            )}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? "Mikro stoppen" : "Mikro mithören"}
          </button>
          <Meter level={micLevel} on={listening} label="Du" />

          <button
            onClick={sysListening ? stopSystem : () => setShowShareGuide(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition",
              sysListening
                ? "bg-[#ffeceb] text-[#d70015]"
                : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
            )}
            title="Kunden-Ton teilen — mit visueller Anleitung"
          >
            <Volume2 className="h-4 w-4" />
            {sysListening ? "PC-Ton aus" : "PC-Ton (Kunde)"}
          </button>
          <Meter level={sysLevel} on={sysListening} label="Kunde" />

          <div className="flex flex-wrap items-center gap-1.5 md:ml-auto">
            {DISPOS.map((d) => (
              <button
                key={d.key}
                onClick={() =>
                  d.key === "voicemail"
                    ? (setVmSecs(15), setShowVoicemail(true))
                    : openResult(d.key)
                }
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-[12px] font-medium transition",
                  d.tone === "copper" &&
                    "bg-[#e9f2fe] text-[var(--color-copper-700)] hover:bg-[#d2e4fd]",
                  d.tone === "success" &&
                    "bg-[#e6f7ea] text-[#1a7f37] hover:bg-[#d3f0da]",
                  d.tone === "danger" &&
                    "bg-[#ffeceb] text-[#d70015] hover:bg-[#ffe0de]",
                  d.tone === "neutral" &&
                    "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
                )}
              >
                {d.label}
              </button>
            ))}
            <button
              onClick={() => openResult(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#ffeceb] px-3 text-[12px] font-semibold text-[#d70015] hover:bg-[#ffe0de]"
              title="Anruf beenden & bewerten"
            >
              <PhoneOff className="h-4 w-4" /> Beenden & bewerten
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Meter({
  level,
  on,
  label,
}: {
  level: number;
  on: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-6 items-end gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => {
          const active = on && level > i / 5;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all",
                active
                  ? "bg-[var(--color-copper-500)]"
                  : "bg-[var(--color-surface-3)]",
              )}
              style={{ height: `${6 + i * 4}px` }}
            />
          );
        })}
      </div>
      <span className="text-[10.5px] text-[var(--color-fg-mute)]">{label}</span>
    </div>
  );
}

function ReadinessChip({
  label,
  status,
}: {
  label: string;
  status: "on" | "off" | "warn" | "error";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "on" && "bg-[var(--color-success)]",
          status === "off" && "bg-[var(--color-surface-3)]",
          status === "warn" && "bg-[var(--color-warning)] animate-pulse",
          status === "error" && "bg-[var(--color-danger)]",
        )}
      />
      <span
        className={cn(
          "text-[11px] font-medium",
          status === "on"
            ? "text-[var(--color-success)]"
            : status === "error"
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-fg-mute)]",
        )}
      >
        {label}
      </span>
    </div>
  );
}
