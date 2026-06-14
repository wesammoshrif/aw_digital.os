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
  Phone,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";
import type { Lead } from "@/db/schema";
import {
  PLAYBOOK,
  QUICK_OBJECTIONS,
  CLOSING_TECHNIQUES,
  KIND_LABEL,
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
import { TEST_SCRIPTS, type ScriptStep } from "@/lib/souffleur/testScripts";
import {
  getTradeCard,
  fillTradeHook,
  buildTradeContext,
  type TradeCard,
} from "@/lib/souffleur/tradePlaybook";
import { SipDialer } from "./SipDialer";
import { ShareGuide } from "./ShareGuide";
import type { SipStatus } from "@/lib/sip/client";
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
  const [micLevel, setMicLevel] = useState(0);
  const [sysLevel, setSysLevel] = useState(0);
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
  const [dialNumber, setDialNumber] = useState("");
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [showVoicemail, setShowVoicemail] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
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

  const tradeCard = useMemo(
    () => getTradeCard(lead.trade),
    [lead.trade],
  );
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
    // Opener: branchenscharfer Einstieg als Hauptsatz, wenn das Gewerk erkannt
    // ist — der wirkt sofort kundig. Sonst ein website-adaptiver Generik-Opener
    // (kein „Ihre Website angesehen", wenn der Betrieb gar keine hat).
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
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Mikro via Deepgram (zuverlässig, gleicher Anbieter wie Kunde) ──
  const startMic = useCallback(async () => {
    // Bereits live → nichts tun (Doppelstart durch Autostart+Button verhindern)
    if (micStreamRef.current) return;
    const gen = ++micGenRef.current;

    setMicError(null);
    setMicStatus("idle");

    // 1. Mic-Permission + Stream
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
    // Stop während getUserMedia? Dann diesen Start abbrechen.
    if (gen !== micGenRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    micStreamRef.current = stream;
    setListening(true);

    // 2. Pegel-Meter
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

    // 3. Deepgram WebSocket
    try {
      const tok = await fetch("/api/souffleur/deepgram-token", {
        method: "POST",
      }).then((r) => r.json());
      // Stop während Token-Fetch? Sauber raus, kein WS öffnen.
      if (gen !== micGenRef.current) return;
      if (!tok.ok) {
        setMicStatus("no-key");
        return;
      }
      const ws = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&language=de&interim_results=true&smart_format=true&punctuate=true",
        // --- END MODIFIED ---
        ["token", tok.token],
      );
      micWsRef.current = ws;
      ws.onopen = () => {
        if (ws !== micWsRef.current || gen !== micGenRef.current) {
          try { ws.close(); } catch {}
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
            // Test-Modus „Mein Mikro = Kunde": Mic-Text in Customer-Spalte
            // spiegeln und Matcher reagieren lassen.
            if (micAsCustomerRef.current) {
              setCustomerTranscript((prev) =>
                (prev + " " + text).slice(-1400),
              );
              const mv = matchMove(text);
              if (mv) {
                setMove(mv);
                setDetected(mv.label + " · Mikro-Test");
                setAiLine(null);
              }
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
  }, []);

  const stopMic = useCallback(() => {
    micGenRef.current++; // alle laufenden Async-Starts invalidieren
    try {
      micRecorderRef.current?.stop?.();
    } catch {}
    micRecorderRef.current = null;
    const ws = micWsRef.current;
    micWsRef.current = null;
    if (ws) {
      // Handler abkoppeln, damit ein verspäteter onerror (CONNECTING → close)
      // den Status nicht auf "Deepgram-Verbindung fehlgeschlagen" springt.
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try { ws.close(); } catch {}
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

  // ── Gemeinsamer Kunden-Handler: Transkript + Matcher + Auto-Haiku ──
  const custRef = useRef("");
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stale-Guard für Haiku-Antworten: nur die jüngste Antwort darf den Satz setzen.
  const aiGenRef = useRef(0);
  const onCustomerText = useCallback(
    (text: string, sourceLabel: string) => {
      if (!text.trim()) return;
      setCustomerTranscript((prev) => (prev + " " + text).slice(-1400));
      custRef.current = (custRef.current + " " + text).slice(-1600);

      // 1. Sofort: lokaler Matcher auf dem ROLLENDEN Transkript (0 ms) —
      //    sonst fallen über zwei Deepgram-Chunks gesplittete Einwände
      //    („keine" + „zeit dafür") durch und der Satz bleibt auf dem Opener.
      const mv = matchMove(custRef.current);
      if (mv) {
        setMove(mv);
        setDetected(mv.label + " · " + sourceLabel);
        setAiLine(null);
      }

      // 2. Debounced: Haiku verfeinert (~1 s). Stale-Guard: nur die jüngste
      //    Antwort darf den Satz setzen (out-of-order-Schutz bei schnellen Finals).
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = setTimeout(async () => {
        const gen = ++aiGenRef.current;
        try {
          const res = await fetch("/api/souffleur/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript: custRef.current.slice(-700),
              hook: lead.auditHook,
              company: lead.company,
              trade: lead.trade,
              tradeContext: tradeCard
                ? buildTradeContext(tradeCard)
                : null,
            }),
          }).then((r) => r.json());
          if (gen === aiGenRef.current && res.ok && res.line) setAiLine(res.line);
        } catch {
          /* lokaler Tipp bleibt stehen */
        }
      }, 800);
    },
    [lead.auditHook, lead.company, lead.trade, tradeCard],
  );

  // ── Gemeinsame Teardown-Funktion für Kunden-Audio-Pipeline ─────────
  const teardownCustomerPipeline = useCallback(() => {
    try { recorderRef.current?.stop?.(); } catch {}
    recorderRef.current = null;
    if (dgWsRef.current) {
      const ws = dgWsRef.current;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      dgWsRef.current = null;
      try { ws.close(); } catch {}
    }
    sysStreamRef.current?.getTracks().forEach((t) => t.stop());
    sysStreamRef.current = null;
    if (sysCtxRef.current) {
      try { sysCtxRef.current.close(); } catch {}
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

      // Pegel-Meter
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

      // Deepgram-Stream
      try {
        const tok = await fetch("/api/souffleur/deepgram-token", {
          method: "POST",
        }).then((r) => r.json());
        if (!tok.ok) {
          setDgStatus("no-key");
          return;
        }
        const ws = new WebSocket(
            "wss://api.deepgram.com/v1/listen?model=nova-2&language=de&interim_results=true&smart_format=true&punctuate=true",
          // --- END MODIFIED ---
          ["token", tok.token],
        );
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
    async (): Promise<{ ok: boolean; noAudio?: boolean; dg?: "live" | "no-key" | "error" }> => {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
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

        // ── Deepgram — auf WS-open warten (max 5 s) ─────────────────
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
            const ws = new WebSocket(
              "wss://api.deepgram.com/v1/listen?model=nova-2&language=de&interim_results=true&smart_format=true&punctuate=true",
              ["token", tok.token],
            );
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

  // ── Gemeinsamer Reset für den Kunden-Kontext ────────────────────
  // Wichtig: leert auch custRef + pending Haiku-Debounce, damit Test-
  // Einwände nicht in den echten Call übergehen (oder umgekehrt).
  const resetCustomerContext = useCallback(() => {
    custRef.current = "";
    setCustomerTranscript("");
    // Laufende Haiku-Fetches invalidieren — sonst füllt eine alte Antwort
    // nach dem Reset (z.B. Test→echter Call) den Satz wieder.
    aiGenRef.current++;
    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = null;
    }
    setAiLine(null);
    setDetected(null);
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
          // Wichtig: Test-Inhalte aus dem Haiku-Kontext entfernen, sonst
          // antwortet die KI im echten Call auf Test-Einwände.
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

  // Auto-start mic when Souffleur opens — user expectation is "hört sofort mit"
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

  // ── KI-Tipp (Haiku) — nur wenn Key konfiguriert ─────────────────
  async function askAI() {
    setAiBusy(true);
    setAiLine(null);
    try {
      // Bevorzugt Kunden-Transkript (Auto-Pfad sendet das auch), Fallback Mikro
      const ctx = (custRef.current || transcript).slice(-700);
      const res = await fetch("/api/souffleur/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: ctx,
          hook: lead.auditHook,
          company: lead.company,
          trade: lead.trade,
          tradeContext: tradeCard ? buildTradeContext(tradeCard) : null,
        }),
      });
      const data = await res.json();
      if (data.ok) setAiLine(data.line);
      else setAiLine(data.message ?? "KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
    } catch {
      setAiLine("KI nicht erreichbar.");
    }
    setAiBusy(false);
  }

  function pickObjection(id: string) {
    const m = getMove(id);
    if (m) {
      setMove(m);
      setDetected(m.label);
      setAiLine(null);
    }
  }

  function copyLine() {
    navigator.clipboard?.writeText(aiLine ?? hookLine).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  function disposition(key: string) {
    try {
      window.opener?.postMessage(
        { type: "souffleur:dispo", leadId: lead.id, dispo: key },
        window.location.origin,
      );
    } catch {}
    // Erst die Nachricht zustellen lassen, dann schließen — sonst kann
    // window.close() den sendenden Context abreißen, bevor postMessage greift.
    setTimeout(() => window.close(), 60);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-fg)]">
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
          status={micStatus === "live" ? "on" : micStatus === "no-permission" || micStatus === "error" ? "error" : "off"}
        />
        <ReadinessChip
          label="PC-Ton"
          status={sysListening && dgStatus === "live" ? "on" : sysListening ? "warn" : "off"}
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

      {/* ── Was JETZT sagen (groß) + Strategie (klein, Seite) ───── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* PRE-CALL-BRIEFING — was den Berater erwartet, damit er nur abliest */}
        {briefingOpen ? (
          <div className="mb-4 rounded-[16px] border border-[#cfe0fd] bg-[#f5f9ff] p-4">
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
                {(() => {
                  const ap = lead.auditPayload as {
                    seo?: { score?: number } | null;
                    lighthouse?: { seo?: number | null } | null;
                  } | null;
                  const parts: string[] = [];
                  if (ap?.seo?.score != null) parts.push(`SEO-Check ${ap.seo.score}/100`);
                  if (ap?.lighthouse?.seo != null)
                    parts.push(`Lighthouse-SEO ${ap.lighthouse.seo}`);
                  return parts.length ? (
                    <p className="mt-1 text-[11px] text-[var(--color-fg-mute)]">
                      {parts.join(" · ")}
                    </p>
                  ) : null;
                })()}
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
                        <span className="mt-0.5 text-[var(--color-copper-500)]">▸</span>
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
                  {["no_time", "no_interest", lead.website ? "have_website" : "kumpel_macht", "price"]
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
            className="mb-3 text-[11px] font-medium text-[var(--color-copper-600)] hover:underline"
          >
            + Briefing einblenden
          </button>
        )}
        <div className="flex gap-4">
        <div
          className={cn(
            "flex-[1.8] min-w-0 rounded-[18px] bg-white p-6 shadow-[var(--shadow-2)] ring-1 transition-[box-shadow,--tw-ring-color] duration-500",
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
            className="tip-enter mt-3 text-[35px] font-bold leading-[1.13] tracking-[-0.028em] text-[var(--color-fg)]"
          >
            {aiLine ?? hookLine}
          </p>

          {!aiLine && move.alts.length > 0 && (
            <div className="mt-4 space-y-1">
              {move.alts.map((a, i) => (
                <p key={i} className="text-[13px] leading-snug text-[var(--color-fg-mute)]">
                  <span className="font-semibold">oder:</span> {a}
                </p>
              ))}
            </div>
          )}
        </div>

          {/* RECHTS — kleine Strategie-Spalte */}
          <aside className="w-[224px] shrink-0 space-y-2.5">
            <div className="rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
              <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                Strategie
              </div>
              <div className="text-[12.5px] font-medium text-[var(--color-fg)]">
                {aiLine ? "KI-Verfeinerung" : KIND_LABEL[move.kind]}
              </div>
              {detected && !aiLine && (
                <div className="mt-0.5 text-[11px] text-[var(--color-fg-mute)]">
                  erkannt: {detected}
                </div>
              )}
              <button
                onClick={askAI}
                disabled={aiBusy}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-copper-500)] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60"
              >
                <Sparkles className="h-3 w-3" />
                {aiBusy ? "denkt…" : "KI verfeinern"}
              </button>
              <input
                value={repName}
                onChange={(e) => {
                  setRepName(e.target.value);
                  try {
                    localStorage.setItem("aw_rep_name", e.target.value);
                  } catch {}
                }}
                placeholder="Dein Name (für den Opener)"
                className="mt-2 w-full rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-2 py-1 text-[11px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </div>

            {neinGradient && (
              <div className="rounded-[12px] border border-[#fde0c8] bg-[#fff7ef] p-3">
                <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#b25000]">
                  Nein: {neinTyp} · {neinGradient.erfolgsquote}
                </div>
                <p className="text-[12px] leading-snug text-[#7a4a10]">
                  {neinGradient.behandlung}
                </p>
              </div>
            )}

            <div className="rounded-[12px] border border-[var(--color-hairline)] bg-white p-3">
              <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
                Power-Frage → groß
              </div>
              <div className="flex flex-col gap-1">
                {POWER_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setAiLine(fillTradeHook(q.question, lead.contactName, lead.city));
                      setDetected(null);
                    }}
                    className="rounded-[8px] bg-[var(--color-surface-2)] px-2 py-1.5 text-left text-[11px] leading-snug text-[var(--color-fg-dim)] transition hover:bg-[#eff5ff] hover:text-[var(--color-copper-700)]"
                  >
                    {q.question}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* ── Ja-Leiter zum Termin (antippen → groß) ──────────── */}
        <div className="mt-4">
          <div className="rounded-[14px] border border-[var(--color-hairline)] bg-white p-4">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-mute)]">
              Ja-Leiter zum Termin · antippen → groß
            </div>
            <ol className="flex flex-col gap-1">
              {MICRO_COMMITMENTS.map((m) => (
                <li key={m.stufe}>
                  <button
                    onClick={() => {
                      setAiLine(fillTradeHook(m.phrase, lead.contactName, lead.city));
                      setDetected(null);
                    }}
                    className="flex w-full items-start gap-2 rounded-[8px] px-2 py-1 text-left text-[12px] leading-snug text-[var(--color-fg-dim)] transition hover:bg-[#eff5ff]"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[9px] font-bold text-white">
                      {m.stufe}
                    </span>
                    <span>
                      <span className="font-medium text-[var(--color-fg)]">{m.typ}:</span>{" "}
                      {m.phrase}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Branchen-Karte (wenn Trade erkannt) ─────────────── */}
        {tradeCard && (
          <div className="mt-5 rounded-[14px] border border-[var(--color-copper-100)] bg-[var(--color-copper-50)]/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--color-copper-600)]" />
              <span className="text-[12px] font-semibold text-[var(--color-copper-700)]">
                Branchen-Playbook: {tradeCard.label}
              </span>
            </div>

            {/* Trade-spezifischer Hook */}
            {tradeHook && move.id === "opener" && (
              <div className="mb-3 rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                  Branchen-Einstieg
                </div>
                <p className="text-[14px] font-medium leading-snug text-[var(--color-fg)]">
                  {tradeHook}
                </p>
              </div>
            )}

            {/* Killer-Frage */}
            <div className="mb-3 rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
              <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                Killer-Frage
              </div>
              <p className="text-[13px] leading-snug text-[var(--color-fg-dim)]">
                {tradeCard.killerQuestion}
              </p>
            </div>

            {/* Pain Points + ROI in 2 Spalten */}
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
              <div className="space-y-3">
                <div className="rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    ROI-Argument
                  </div>
                  <p className="text-[12px] leading-snug text-[var(--color-fg-dim)]">
                    {tradeCard.roiArgument}
                  </p>
                </div>
                <div className="rounded-[10px] bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                    Saison-Timing
                  </div>
                  <p className="text-[11.5px] leading-snug text-[var(--color-fg-dim)]">
                    <span className="font-medium">{tradeCard.seasonalTiming.bestMonths}:</span>{" "}
                    {tradeCard.seasonalTiming.angle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Test-Leiste ────────────────────────────────────────── */}
        <div className="mt-5 rounded-[14px] border border-[#fde68a] bg-[#fffbeb] p-3">
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
            <button
              onClick={() => startTest("vollDurchlauf")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Voll-Durchlauf
            </button>
            <button
              onClick={() => startTest("schwieriger")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Schwierig
            </button>
            <button
              onClick={() => startTest("kurzeSession")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Kurz
            </button>
            <button
              onClick={() => startTest("socialMedia")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Social-Media
            </button>
            <button
              onClick={() => startTest("verbrannterKunde")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Verbrannter
            </button>
            <button
              onClick={() => startTest("einzelkaempfer")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Einzelkämpfer
            </button>
            <button
              onClick={() => startTest("vorwandKette")}
              disabled={!!testActive}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#b25000] ring-1 ring-[#fde68a] transition hover:bg-[#fff5d6] disabled:opacity-50"
            >
              ▶ Vorwand-Kette
            </button>
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

        {/* ── SIP-Direktanruf (easybell im Browser) ──────────────── */}
        <div className="mt-3">
          <SipDialer
            defaultNumber={lead.phone ?? ""}
            autoDial={autoDial}
            onRemoteStream={(stream) => handleSipRemoteStream(stream)}
          />
        </div>

        {/* ── Schnell-Einwände ──────────────────────────────────── */}
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
            Einwand antippen
          </div>
          <div className="grid grid-cols-4 gap-1.5">
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

        {/* ── Abschluss-Techniken (bei Kaufsignal antippen) ─────── */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
            Abschluss antippen → groß
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {CLOSING_TECHNIQUES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setAiLine(c.line);
                  setDetected(null);
                }}
                title={c.line}
                className="rounded-[10px] bg-[#f0fdf4] px-2.5 py-2 text-left text-[12px] font-medium text-[#1a7f37] transition hover:bg-[#dcfce7]"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Redeanteil-Puls ──────────────────────────────────── */}
        {(transcript.trim() || customerTranscript.trim()) &&
          (() => {
            const a = transcript.trim().length;
            const b = customerTranscript.trim().length;
            const total = a + b || 1;
            const repShare = Math.round((a / total) * 100);
            const tooMuch = repShare > 65;
            return (
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.06em]">
                  <span className="text-[var(--color-fg-mute)]">Redeanteil</span>
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

        {/* ── Transkripte: Du | Kunde ───────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Du (Mikro via Deepgram) */}
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

          {/* Kunde (PC-Ton via Deepgram) */}
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
                    PC-Ton wird gehört (Pegel unten), aber für die Wort-
                    Transkription des Kunden fehlt der DEEPGRAM_API_KEY.
                  </span>
                ) : (
                  <span className="text-[var(--color-fg-faint)]">
                    „PC-Ton (Kunde)" starten — die Worte des Gegenübers
                    erscheinen hier und steuern die Tipps.
                  </span>
                ))}
            </p>
          </div>
        </div>
      </div>

      {/* ── Steuerleiste ────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-hairline)] px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={listening ? stopMic : startMic}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition",
              listening
                ? "bg-[#ffeceb] text-[#d70015]"
                : "bg-[var(--color-copper-500)] text-white hover:bg-[#0077ed]",
            )}
          >
            {listening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
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

          <div className="ml-auto flex items-center gap-1.5">
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
