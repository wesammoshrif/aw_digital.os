"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";
import { EasybellSipClient, type SipStatus } from "@/lib/sip/client";
import { cn } from "@/lib/utils";

/** Imperative Steuerung, die der SipDialer an den Eltern-Room durchreicht. */
export type SipControl = { hangup: () => void; isActive: () => boolean };

/**
 * Dialer für den Souffleur.
 *
 * PRIMÄR: Direktanruf im Browser via SIP-over-WSS (In-App-Telefonie).
 * Nutzt die easybell WebRTC-Schnittstelle.
 */
export function SipDialer({
  defaultNumber,
  onRemoteStream,
  onStatus,
  autoDial = false,
  controlRef,
}: {
  defaultNumber?: string;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onStatus?: (status: SipStatus) => void;
  autoDial?: boolean;
  controlRef?: MutableRefObject<SipControl | null>;
}) {
  const [number, setNumber] = useState(defaultNumber ?? "");
  const [status, setStatus] = useState<SipStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showExperimental, setShowExperimental] = useState(autoDial);
  const clientRef = useRef<EasybellSipClient | null>(null);

  useEffect(() => {
    if (defaultNumber) setNumber(defaultNumber);
  }, [defaultNumber]);

  useEffect(() => {
    if (autoDial && defaultNumber && status === "idle") {
      dialBrowser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDial, defaultNumber]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const telHref = number ? `tel:${number.replace(/\s+/g, "")}` : "#";

  async function dialBrowser() {
    if (!number.trim()) return;
    setConnecting(true);
    setStatusMsg(null);
    try {
      const cfgRes = await fetch("/api/sip/config").then((r) => r.json());
      if (!cfgRes.ok) {
        setStatusMsg(cfgRes.message ?? "SIP-Config fehlt");
        setStatus("error");
        setConnecting(false);
        return;
      }
      const client = new EasybellSipClient();
      clientRef.current = client;
      client.on("status", (s, detail) => {
        setStatus(s);
        setStatusMsg(detail ?? null);
        onStatus?.(s);
      });
      client.on("remoteStream", (stream) => onRemoteStream?.(stream));
      await client.connect(cfgRes.cfg);
      setTimeout(async () => {
        try {
          await clientRef.current?.call(number);
        } catch (err) {
          setStatus("error");
          setStatusMsg(String(err));
        }
        setConnecting(false);
      }, 2500);
    } catch (err) {
      setStatus("error");
      setStatusMsg(String(err));
      setConnecting(false);
    }
  }

  function hangup() {
    clientRef.current?.hangup();
    onRemoteStream?.(null);
  }

  const active = status === "ringing" || status === "in-call";

  // Hangup-Funktion nach oben durchreichen, damit das Cockpit-„Auflegen"
  // den Anruf aktiv per BYE beendet (nicht nur das Fenster schließt).
  if (controlRef) controlRef.current = { hangup, isActive: () => active };

  return (
    <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <PhoneCall className="h-4 w-4 text-[var(--color-copper-600)]" />
        <span className="text-[13px] font-bold text-[var(--color-fg)]">
          Telefonie
        </span>
      </div>

      {/* ── Hauptweg: tel: → easybell-App / Telefon ──────────────── */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="ml-1.5 h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+49 152 12345678"
            className="flex-1 bg-transparent px-1 text-[14px] font-medium text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-mute)]"
          />
          <a
            href={telHref}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold text-white shadow-copper transition",
              number.trim()
                ? "bg-[var(--color-copper-500)] hover:bg-[#0077ed]"
                : "pointer-events-none bg-[var(--color-copper-500)]/40",
            )}
          >
            <Phone className="h-3.5 w-3.5" /> Anrufen
          </a>
        </div>
        <p className="px-1.5 text-[10.5px] leading-snug text-[var(--color-fg-mute)]">
          Öffnet dein Telefon bzw. die easybell-App. Die Kundenstimme für den
          Souffleur kommt über die System-Audio-Freigabe (oben).
        </p>
      </div>

      <div className="hairline mb-3 opacity-30" />

      {/* ── Experimentell: Browser-Direktanruf (braucht WSS-Gateway) ── */}
      <button
        onClick={() => setShowExperimental((s) => !s)}
        className="flex w-full items-center justify-between text-[11px] font-medium text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)] transition"
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition",
              showExperimental && "rotate-180",
            )}
          />
          Browser-Direktanruf (experimentell)
        </span>
      </button>

      {showExperimental && (
        <div className="mt-3 space-y-3 pt-1">
          <div className="flex items-start gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[10.5px] leading-relaxed text-[#166534]">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Asterisk-Brücke aktiv (5-231-248-34.sslip.io:8089). Klick auf
              „Trotzdem testen" startet den In-Browser-Anruf direkt über die
              easybell Cloud-PBX — kein externes Telefon nötig.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {active ? (
              <button
                onClick={hangup}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ffeceb] px-4 py-2 text-[12px] font-semibold text-[#d70015] hover:bg-[#ffd1cf] transition"
              >
                <PhoneOff className="h-3.5 w-3.5" /> Auflegen
              </button>
            ) : (
              <button
                onClick={dialBrowser}
                disabled={!number.trim() || connecting}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-3)] px-4 py-2 text-[12px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-hairline)] disabled:opacity-50 transition"
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                {connecting ? "Verbinde…" : "Trotzdem testen"}
              </button>
            )}
            <StatusPill status={status} />
          </div>

          {statusMsg && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed",
                status === "error"
                  ? "bg-[#fff0ef] text-[#a40012] border border-[#fecaca]"
                  : "bg-white/50 text-[var(--color-fg-mute)] border border-[var(--color-hairline)]",
              )}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: SipStatus }) {
  const cls =
    status === "registered" || status === "idle"
      ? "bg-white text-[var(--color-fg-mute)]"
      : status === "ringing"
        ? "bg-[#fffbeb] text-[#b25000]"
        : status === "in-call"
          ? "bg-[#e6f7ea] text-[#1a7f37]"
          : status === "error"
            ? "bg-[#ffeceb] text-[#d70015]"
            : "bg-white text-[var(--color-fg-mute)]";
  const label =
    status === "idle"
      ? "nicht verbunden"
      : status === "connecting"
        ? "verbinde…"
        : status === "registered"
          ? "bereit"
          : status === "ringing"
            ? "klingelt"
            : status === "in-call"
              ? "im Gespräch"
              : status === "ended"
                ? "beendet"
                : "Fehler";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", cls)}>
      {label}
    </span>
  );
}
