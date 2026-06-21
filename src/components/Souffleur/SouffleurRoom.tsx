"use client";

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
  isPhase,
  estimatePhase,
  type Phase,
} from "@/lib/souffleur/phases";
import { TEST_SCRIPTS, type ScriptStep } from "@/lib/souffleur/testScripts";
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
] as const;

// Aktiv-Stile pro Gesprächswärme: kühl-blau (kalt) → heiß-rot (heiß).
const PHASE_STYLE: Record<Phase, string> = {
  kalt: "bg-[#e7f0ff] text-[#0a3977] ring-1 ring-[#9cc0ff]",
  lau: "bg-[#e9f2fe] text-[var(--color-copper-700)] ring-1 ring-[var(--color-copper-300)]",
  warm: "bg-[#fff2e3] text-[#b25000] ring-1 ring-[#fdc98a]",
  heiss: "bg-[#ffeceb] text-[#d70015] ring-1 ring-[#ffb3ae]",
};

// Deepgram-Stream-URL: endpointing=300 wartet ~300 ms Sprechpause ab → ganze
// Sätze statt zerbrochener Fragmente (deutlich treffsicherer Matcher + KI).
const DG_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-2&language=de&interim_results=true&endpointing=300&smart_format=true&punctuate=true";

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
  const [copied, setCopied] = useState(false);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [customerTranscript, setCustomerTranscript] = useState("");
  const [dgStatus, setDgStatus] = useState<
    "idle" | "live" | "no-key" | "error" | "off"
  >("idle");
  const [testActive, setTestActive] = useState<string | null>(null);
  const [testStep, setTestStep] = useState(0);
  const [testHint, setTestHint] = useState<string | null>(null);
  const [micAsCustomer, setMicAsCustomer] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [showVoicemail, setShowVoicemail] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
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
  const sysCtxRef = useRef<AudioContext | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dgWsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // Imperative Hangup-Steuerung des SIP-Dialers (für „Auflegen" im Cockpit).
  const sipControlRef = useRef<SipControl | null>(null);

  // ── Tipp-Pipeline-Refs ─────────────────────────────────────────
  const custRef = useRef(""); // rollendes Kunden-Transkript (für Matcher)
  const historyRef = useRef<string[]>([]); // letzte Kundenaussagen (für die KI)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiGenRef = useRef(0); // laufende Nummer pro KI-Anfrage
  const lastAppliedGenRef = useRef(0); // Nummer der zuletzt ANGEWENDETEN Antwort
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
  const tradeHook = useMemo(
    () =>
      tradeCard
        ? fillTradeHook(tradeCard.hookSatz, lead.contactName, lead.city)
        : null,
    [tradeCard, lead.contactName, lead.city],
  );

  // „[Name]" füllen (Berater-Name) bzw. als klaren Lese-Cue lassen.
  const fillName = useCallback(
    (s: string) => s.replace(/\[Name\]/g, repName.trim() || "[Ihr Name]"),
    [repName],
  );

  const hookLine = useMemo(() => {
    if (move.id === "opener" && tradeHook) {
      return fillName(tradeHook);
    }
    let base = move.line;
    if (move.id === "opener") {
      base = lead.website
        ? "Guten Tag, hier ist [Name] von AW Digital. Ich habe mir kurz Ihre Website angesehen — {hook} Haben Sie 60 Sekunden?"
        : "Guten Tag, hier ist [Name] von AW Digital. Ich habe geschaut, wie Ihr Betrieb online zu finden ist — {hook} Haben Sie 60 Sekunden?";
    }
    return fillName(fillHook(base, lead.auditHook));
  }, [move, lead.auditHook, lead.website, tradeHook, fillName]);

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
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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
      setMicLevel(Math.min(1, avg / 90));
      if (micCtxRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    try {
      const tok = await fetch("/api/souffleur/deepgram-token", {
        method: "POST",
      }).then((r) => r.json());
      if (gen !== micGenRef.current) return;
      if (!tok.ok) {
        setMicStatus("no-key");
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
        setMicStatus("live");
        const rec = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        micRecorderRef.current = rec;
        rec.ondataavailable = (ev) => {
          if (ev.data.size > 0 && ws.readyState === 1)
            ev.data.arrayBuffer().then((b) => ws.send(b));
        };
        rec.start(250);
      };
      ws.onmessage = (m) => {
        try {
          const d = JSON.parse(m.data as string);
          const text = d.channel?.alternatives?.[0]?.transcript as
            | string
            | undefined;
          if (text && d.is_final) {
            setTranscript((prev) => (prev + " " + text).slice(-1200));
            if (micAsCustomerRef.current) {
              onCustomerText(text, "Mikro-Test");
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
        if (ws !== micWsRef.current) return;
        setMicStatus("error");
        setMicError("Deepgram-Verbindung fehlgeschlagen");
      };
      ws.onclose = () => {
        if (ws !== micWsRef.current) return;
        setMicStatus((s) => (s === "live" ? "idle" : s));
      };
    } catch (err) {
      setMicStatus("error");
      setMicError(String(err));
    }
    // onCustomerText ist stabil (refs); bewusst nicht in den Deps, um Reconnect
    // des Mikros bei jedem Tipp zu vermeiden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMic = useCallback(() => {
    micGenRef.current++;
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
  const onAdvisorText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      pushTurn("advisor", text);
      lastSpeakerRef.current = "advisor";
      setConvoState("berater");
      // Berater redet → Kunde ist nicht mehr dran: Turn-End-Timer abbrechen.
      if (aiDebounceRef.current) {
        clearTimeout(aiDebounceRef.current);
        aiDebounceRef.current = null;
      }
    },
    [pushTurn],
  );

  // ── KI-Dirigent fragen: voller Dialog → nächster Satz + Phase + Begründung ──
  const askAiNow = useCallback(() => {
    lastAiLenRef.current = custRef.current.length;
    const gen = ++aiGenRef.current;
    const nein = classifyNein(custRef.current.slice(-200));
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
        elapsedSec: elapsedRef.current,
        repName: repNameRef.current.trim() || null,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) {
          setConvoState("warten");
          return;
        }
        // Out-of-order-Schutz: anwenden, solange keine NEUERE Antwort schon
        // angewendet wurde (die jüngste gewinnt).
        if (gen < lastAppliedGenRef.current) return;
        lastAppliedGenRef.current = gen;
        if (res.line) setAiLine(res.line);
        if (isPhase(res.phase)) setPhase(res.phase);
        setWhy(typeof res.why === "string" ? res.why : null);
        setConvoState("warten");
      })
      .catch(() => {
        setConvoState("warten");
      });
  }, [lead.auditHook, lead.company, lead.trade, tradeCard]);

  // ── Kunden-Handler: Redezug protokollieren + Turn-Ende erkennen ──
  const onCustomerText = useCallback(
    (text: string, sourceLabel: string) => {
      if (!text.trim()) return;
      setCustomerTranscript((prev) => (prev + " " + text).slice(-1400));
      custRef.current = (custRef.current + " " + text).slice(-1600);
      historyRef.current = [...historyRef.current, text.trim()].slice(-6);
      pushTurn("customer", text);
      lastSpeakerRef.current = "customer";
      setConvoState("kunde");

      // Sofortiger lokaler Cue (Matcher), während der Kunde redet.
      const mv = matchMove(custRef.current);
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

      // Turn-Ende: ~500 ms Stille = Redezug fertig → GENAU EINE KI-Anfrage mit
      // dem vollen Dialog. (Eine Anfrage pro Redezug — kein Verstopfen, kein
      // nachträgliches Austauschen des Satzes.)
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = setTimeout(() => {
        aiDebounceRef.current = null;
        if (lastSpeakerRef.current !== "customer") return; // Berater hat übernommen
        setConvoState("denkt");
        askAiNow();
      }, 500);
    },
    [askAiNow, pushTurn],
  );

  // ── Gemeinsame Teardown-Funktion für Kunden-Audio-Pipeline ──────
  const teardownCustomerPipeline = useCallback(() => {
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
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSysLevel(Math.min(1, avg / 90));
        if (sysCtxRef.current) requestAnimationFrame(tick);
      };
      tick();

      try {
        const tok = await fetch("/api/souffleur/deepgram-token", {
          method: "POST",
        }).then((r) => r.json());
        if (!tok.ok) {
          setDgStatus("no-key");
          return;
        }
        const ws = new WebSocket(DG_URL, ["token", tok.token]);
        dgWsRef.current = ws;
        ws.onopen = () => {
          setDgStatus("live");
          const rec = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          });
          recorderRef.current = rec;
          rec.ondataavailable = (ev) => {
            if (ev.data.size > 0 && ws.readyState === 1)
              ev.data.arrayBuffer().then((b) => ws.send(b));
          };
          rec.start(250);
        };
        ws.onmessage = (m) => {
          try {
            const d = JSON.parse(m.data as string);
            const text = d.channel?.alternatives?.[0]?.transcript as
              | string
              | undefined;
            if (text && d.is_final) onCustomerText(text, "Kunde");
          } catch {
            /* ignore */
          }
        };
        ws.onerror = () => setDgStatus("error");
        ws.onclose = () => {
          if (ws !== dgWsRef.current) return;
          setDgStatus((s) => (s === "live" ? "off" : s));
        };
      } catch {
        setDgStatus("error");
      }
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
          if (sysCtxRef.current) requestAnimationFrame(tick);
        };
        tick();

        audioTracks[0].onended = () => stopSystem();

        try {
          const tok = await fetch("/api/souffleur/deepgram-token", {
            method: "POST",
          }).then((r) => r.json());
          if (!tok.ok) {
            setDgStatus("no-key");
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
                const d = JSON.parse(m.data as string);
                const text = d.channel?.alternatives?.[0]?.transcript as
                  | string
                  | undefined;
                if (text && d.is_final) onCustomerText(text, "Kunde");
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
        if (!callWasActiveRef.current) setElapsed(0);
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
    [stopSystem],
  );

  // ── Stille-Erkennung: Gesprächsende auch beim tel:-Anruf erkennen ──
  const micLevelRef = useRef(0);
  const sysLevelRef = useRef(0);
  const listeningRef = useRef(false);
  const sysListeningRef = useRef(false);
  const callEndedRef = useRef(false);
  const stopSystemRef = useRef(stopSystem);
  const silentSecsRef = useRef(0);
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
          setMaybeEnded(false);
          setCallEnded(true);
          stopSystemRef.current();
        }
      } else {
        silentSecsRef.current = 0;
        setMaybeEnded(false);
      }
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
    aiGenRef.current++;
    lastAppliedGenRef.current = aiGenRef.current; // in-flight Antworten verwerfen
    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = null;
    }
    setAiLine(null);
    setDetected(null);
    setWhy(null);
    setPhase("kalt");
    setConvoState("warten");
  }, []);

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

  // ── Manueller KI-Tipp (Button) ──────────────────────────────────
  async function askAI() {
    setAiBusy(true);
    setAiLine(null);
    // Manuelle Anfrage hat Vorrang: neueste Generation beanspruchen, damit eine
    // noch laufende Auto-Antwort das Ergebnis nicht überschreibt.
    lastAppliedGenRef.current = ++aiGenRef.current;
    try {
      const res = await fetch("/api/souffleur/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: turnsRef.current.slice(-8),
          history: historyRef.current.slice(-4),
          transcript: (custRef.current || transcript).slice(-700),
          hook: lead.auditHook,
          company: lead.company,
          trade: lead.trade,
          tradeContext: tradeCard ? buildTradeContext(tradeCard) : null,
          neinTyp: classifyNein(custRef.current.slice(-200)),
          phase: phaseRef.current,
          elapsedSec: elapsedRef.current,
          repName: repNameRef.current.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiLine(data.line);
        if (isPhase(data.phase)) setPhase(data.phase);
        setWhy(typeof data.why === "string" ? data.why : null);
      } else {
        setAiLine(data.message ?? "KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
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
    navigator.clipboard?.writeText(aiLine ?? hookLine).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  function disposition(key: string) {
    // 1. Laufenden Browser-Anruf aktiv beenden (SIP-BYE), SOLANGE der WebSocket
    //    noch lebt — sonst bleibt der Anruf beim Gegenüber/Handy stehen.
    try {
      sipControlRef.current?.hangup();
    } catch {}
    // 2. Dispo an die Pipeline melden.
    try {
      window.opener?.postMessage(
        { type: "souffleur:dispo", leadId: lead.id, dispo: key },
        window.location.origin,
      );
    } catch {}
    // 3. Erst schließen, wenn das BYE über die WSS-Verbindung raus ist
    //    (Fenster-Close reißt sonst den Socket vor dem BYE ab). 500 ms gibt
    //    auch bei höherer Latenz/CPU-Last Luft, damit kein verwaister Anruf bleibt.
    setTimeout(() => window.close(), 500);
  }

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
                Mailbox — das jetzt vorlesen (~15 Sek.)
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
                  disposition("voicemail");
                }}
                className="rounded-full bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0077ed]"
              >
                Besprochen → speichern
              </button>
            </div>
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
            <span className="rounded-full bg-[#0a3977] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white">
              Jetzt wörtlich sagen
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
            {convoState === "berater" && (
              <span className="text-[11px] font-medium text-[var(--color-fg-mute)]">
                Du sprichst
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

          <p
            key={aiLine ?? hookLine}
            className="tip-enter mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.028em] text-[var(--color-fg)] sm:text-[34px] md:text-[40px]"
          >
            {aiLine ?? hookLine}
          </p>

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

        {/* Anruf-Steuerung (Browser-Direktanruf) — immer gemountet für Auto-Dial */}
        <div className="mt-3">
          <SipDialer
            defaultNumber={lead.phone ?? ""}
            autoDial={autoDial}
            onRemoteStream={(stream) => handleSipRemoteStream(stream)}
            onStatus={handleSipStatus}
            controlRef={sipControlRef}
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
                <div className="mb-3 rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    Killer-Frage
                  </div>
                  <p className="text-[13px] leading-snug text-[var(--color-fg-dim)]">
                    {tradeCard.killerQuestion}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                      Pain Points
                    </div>
                    <ul className="space-y-1.5 text-[12px] leading-snug text-[var(--color-fg-dim)]">
                      {tradeCard.painPoints.map((p, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="mt-0.5 text-[var(--color-copper-500)]">
                            {i + 1}.
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                      ROI-Argument
                    </div>
                    <p className="text-[12px] leading-snug text-[var(--color-fg-dim)]">
                      {tradeCard.roiArgument}
                    </p>
                  </div>
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
                        PC-Ton wird gehört (Pegel unten), aber für die
                        Wort-Transkription fehlt der DEEPGRAM_API_KEY.
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
                    ? setShowVoicemail(true)
                    : disposition(d.key)
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
              onClick={() => disposition("hangup")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ffeceb] text-[#d70015] hover:bg-[#ffe0de]"
              title="Auflegen & schließen"
            >
              <PhoneOff className="h-4 w-4" />
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
