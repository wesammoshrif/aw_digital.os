"use client";

import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GuidePhase = "guide" | "sharing" | "forgot" | "success" | "dg-warn";

/**
 * ShareGuide — idiotensicherer Overlay der den User visuell durch
 * Chrome's Bildschirmteilen-Dialog führt.
 *
 * Lifecycle:
 *   1. "guide"   — 4 Schritte mit Chrome-Dialog-Mockup
 *   2. "sharing" — getDisplayMedia läuft
 *   3. "forgot"  — kein Audio-Track erkannt → Retry
 *   4. "success" — alles gut → auto-close nach 1.5s
 */
export function ShareGuide({
  open,
  onShare,
  onClose,
}: {
  open: boolean;
  onShare: () => Promise<{ ok: boolean; noAudio?: boolean; dg?: "live" | "no-key" | "error" }>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<GuidePhase>("guide");
  const [dgWarnType, setDgWarnType] = useState<"no-key" | "error" | null>(null);

  // onClose über Ref lesen, damit Parent-Rerenders (RAF/Timer) den
  // Autoclose-Timeout nicht jede Sekunde neu armen.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Reset wenn sich open ändert
  useEffect(() => {
    if (open) setPhase("guide");
  }, [open]);

  // Auto-close bei success
  useEffect(() => {
    if (phase === "success") {
      const t = setTimeout(() => onCloseRef.current(), 1400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!open) return null;

  async function handleShare() {
    setPhase("sharing");
    const result = await onShare();
    if (result.ok) {
      if (!result.dg || result.dg === "live") {
        setPhase("success");
      } else {
        setDgWarnType(result.dg);
        setPhase("dg-warn");
      }
    } else if (result.noAudio) {
      setPhase("forgot");
    } else {
      setPhase("guide");
    }
  }

  async function handleRetry() {
    setPhase("sharing");
    const result = await onShare();
    if (result.ok) {
      if (!result.dg || result.dg === "live") {
        setPhase("success");
      } else {
        setDgWarnType(result.dg);
        setPhase("dg-warn");
      }
    } else if (result.noAudio) {
      setPhase("forgot");
    } else {
      setPhase("guide");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-[480px] rounded-[20px] bg-white p-0 shadow-[var(--shadow-3)]",
          "animate-[ws-rise_300ms_cubic-bezier(0.22,1,0.36,1)_both]",
        )}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-fg-mute)] hover:bg-[var(--color-surface-2)]"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === "guide" && (
          <GuideView onStart={handleShare} />
        )}
        {phase === "sharing" && <SharingView />}
        {phase === "forgot" && <ForgotView onRetry={handleRetry} onClose={onClose} />}
        {phase === "success" && <SuccessView />}
        {phase === "dg-warn" && <DgWarnView type={dgWarnType!} onClose={onClose} />}
      </div>
    </div>
  );
}

/* ── Guide: 4-Schritt-Anleitung mit Chrome-Dialog-Mockup ─────────── */
function GuideView({ onStart }: { onStart: () => void }) {
  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-copper-50)]">
          <Volume2 className="h-5 w-5 text-[var(--color-copper-500)]" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--color-fg)]">
            Kunden-Stimme teilen
          </h2>
          <p className="text-[13px] text-[var(--color-fg-mute)]">
            Damit der Souffleur deinen Kunden mithört
          </p>
        </div>
      </div>

      {/* Chrome Dialog Mockup */}
      <div className="mb-5 overflow-hidden rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
        {/* Fake Chrome title bar */}
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[#e8e8ed] px-4 py-2.5">
          <Monitor className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
          <span className="text-[12px] font-medium text-[var(--color-fg-dim)]">
            chrome://screen-sharing
          </span>
        </div>

        <div className="space-y-0 p-4">
          {/* Tab selection mockup */}
          <div className="mb-3 flex rounded-[8px] bg-[var(--color-surface-3)] p-[3px]">
            <span className="flex-1 rounded-[6px] px-3 py-1.5 text-center text-[12px] text-[var(--color-fg-mute)]">
              Tab
            </span>
            <span className="flex-1 rounded-[6px] px-3 py-1.5 text-center text-[12px] text-[var(--color-fg-mute)]">
              Fenster
            </span>
            <span className="flex-1 rounded-[6px] bg-white px-3 py-1.5 text-center text-[12px] font-semibold text-[var(--color-fg)] shadow-sm">
              Gesamter Bildschirm
            </span>
          </div>

          {/* Screen preview mockup */}
          <div className="mb-3 flex items-center justify-center rounded-[8px] border-2 border-[var(--color-copper-500)] bg-white p-4">
            <div className="flex h-14 w-24 items-center justify-center rounded-[6px] bg-[var(--color-surface-2)]">
              <Monitor className="h-6 w-6 text-[var(--color-fg-faint)]" />
            </div>
          </div>

          {/* THE checkbox — the whole point */}
          <div className="rounded-[10px] border-2 border-[var(--color-copper-500)] bg-[#e9f2fe] p-3">
            <label className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border-2 border-[var(--color-copper-500)] bg-white">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-copper-500)]" />
              </span>
              <span className="text-[13.5px] font-semibold text-[var(--color-fg)]">
                Systemaudio teilen
              </span>
              <span className="ml-auto inline-flex items-center rounded-full bg-[var(--color-copper-500)] px-2 py-0.5 text-[10px] font-bold text-white">
                WICHTIG
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-5 space-y-2.5">
        <StepRow n={1} text="Gesamter Bildschirm auswählen (dritter Tab)" active />
        <StepRow n={2} text="Deinen Bildschirm anklicken (blauer Rand)" />
        <StepRow n={3} text="Systemaudio teilen anhaken (ganz unten!)" highlight />
        <StepRow n={4} text="Teilen klicken" />
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--color-copper-500)] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#0077ed]"
      >
        Bildschirm teilen starten
        <ChevronRight className="h-4 w-4" />
      </button>

      <p className="mt-3 text-center text-[11.5px] text-[var(--color-fg-faint)]">
        Der Bildschirminhalt wird NICHT aufgezeichnet — nur der System-Ton wird an Deepgram gestreamt.
      </p>
    </div>
  );
}

/* ── Sharing: getDisplayMedia läuft ──────────────────────────────── */
function SharingView() {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-copper-50)]">
        <Monitor className="h-7 w-7 animate-pulse text-[var(--color-copper-500)]" />
      </div>
      <p className="text-[15px] font-semibold text-[var(--color-fg)]">
        Chrome-Dialog offen
      </p>
      <p className="mt-1 text-[13px] text-[var(--color-fg-mute)]">
        Folge den Schritten im Dialog und klicke "Teilen".
      </p>
    </div>
  );
}

/* ── Forgot: User hat Systemaudio nicht angehakt ─────────────────── */
function ForgotView({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3e0]">
          <AlertTriangle className="h-7 w-7 text-[var(--color-warning)]" />
        </div>
        <h2 className="text-[17px] font-semibold text-[var(--color-fg)]">
          Systemaudio fehlt
        </h2>
        <p className="mt-1 max-w-[320px] text-[13px] leading-relaxed text-[var(--color-fg-mute)]">
          Du hast den Bildschirm geteilt, aber das Systemaudio-Häkchen wurde
          nicht aktiviert. Ohne System-Ton kann der Souffleur deinen Kunden
          nicht hören.
        </p>
      </div>

      {/* Visual reminder */}
      <div className="mb-5 rounded-[12px] border border-[var(--color-warning)] bg-[#fff8ee] p-4">
        <p className="mb-2 text-[12px] font-semibold text-[#b25000]">
          So geht's richtig:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning)] text-[10px] font-bold text-white">
              1
            </span>
            <span className="text-[12.5px] text-[#7a5e1f]">
              Wähle <strong>Gesamter Bildschirm</strong> (nicht Tab/Fenster)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning)] text-[10px] font-bold text-white">
              2
            </span>
            <span className="text-[12.5px] text-[#7a5e1f]">
              Hake <strong>Systemaudio teilen</strong> an (unten im Dialog)
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-[12px] bg-[var(--color-surface-2)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-3)]"
        >
          Abbrechen
        </button>
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-copper-500)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0077ed]"
        >
          <RefreshCw className="h-4 w-4" />
          Nochmal versuchen
        </button>
      </div>
    </div>
  );
}

/* ── Success: alles verbunden ────────────────────────────────────── */
function SuccessView() {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f7ea]">
        <CheckCircle2 className="h-7 w-7 text-[var(--color-success)]" />
      </div>
      <p className="text-[15px] font-semibold text-[var(--color-fg)]">
        Kunden-Ton aktiv
      </p>
      <p className="mt-1 text-[13px] text-[var(--color-fg-mute)]">
        Deepgram transkribiert den Gesprächspartner live.
      </p>
    </div>
  );
}

/* ── DgWarn: Audio ok, Deepgram nicht verfügbar ──────────────────── */
function DgWarnView({
  type,
  onClose,
}: {
  type: "no-key" | "error";
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3e0]">
          <AlertTriangle className="h-7 w-7 text-[var(--color-warning)]" />
        </div>
        <h2 className="text-[17px] font-semibold text-[var(--color-fg)]">
          Ton verbunden
        </h2>
        <p className="mt-1 max-w-[320px] text-[13px] leading-relaxed text-[var(--color-fg-mute)]">
          {type === "no-key"
            ? "Systemaudio wird empfangen, aber Transkription ist inaktiv — DEEPGRAM_API_KEY fehlt in .env.local."
            : "Systemaudio wird empfangen, aber die Verbindung zu Deepgram ist fehlgeschlagen. Prüfe Netzwerk und API-Key."}
        </p>
      </div>
      <button
        onClick={onClose}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--color-surface-2)] px-5 py-3 text-[14px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-3)]"
      >
        Verstanden
      </button>
    </div>
  );
}

/* ── Step row ────────────────────────────────────────────────────── */
function StepRow({
  n,
  text,
  active,
  highlight,
}: {
  n: number;
  text: string;
  active?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2",
        highlight
          ? "bg-[#e9f2fe] ring-1 ring-[var(--color-copper-200)]"
          : active
            ? "bg-[var(--color-surface-2)]"
            : "",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
          highlight ? "bg-[var(--color-copper-500)]" : "bg-[var(--color-fg-faint)]",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "text-[13px]",
          highlight
            ? "font-semibold text-[var(--color-copper-600)]"
            : "text-[var(--color-fg-dim)]",
        )}
      >
        {text}
      </span>
    </div>
  );
}
