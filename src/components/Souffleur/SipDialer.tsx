"use client";

import { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";
import { EasybellSipClient, type SipStatus } from "@/lib/sip/client";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

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
}: {
  defaultNumber?: string;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onStatus?: (status: SipStatus) => void;
}) {
  const [number, setNumber] = useState(defaultNumber ?? "");
  const [status, setStatus] = useState<SipStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const clientRef = useRef<EasybellSipClient | null>(null);

  useEffect(() => {
    if (defaultNumber) setNumber(defaultNumber);
  }, [defaultNumber]);

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

  return (
    <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <PhoneCall className="h-4 w-4 text-[var(--color-copper-600)]" />
        <span className="text-[13px] font-bold text-[var(--color-fg)]">
          Telefonie
        </span>
      </div>

      {/* ── Browser-Direktanruf (In-App) ─────────────────────────── */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="ml-1.5 h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+49 152 12345678"
            className="flex-1 bg-transparent px-1 text-[14px] font-medium text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-mute)]"
          />
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-copper-500)] px-4 py-2 text-[12px] font-semibold text-white shadow-copper hover:bg-[#0077ed] disabled:opacity-50 transition"
            >
              {connecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              {connecting ? "Verbinde…" : "Anrufen"}
            </button>
          )}
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

        <div className="flex items-center justify-between px-1.5">
          <StatusPill status={status} />
          <Badge variant="copper" className="text-[9px] py-0 px-1.5 opacity-70">Browser-SIP</Badge>
        </div>
      </div>

      <div className="hairline mb-3 opacity-30" />

      {/* ── Fallback: easybell-App ─────────────────────────────────── */}
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
          Andere Optionen (Desktop-App)
        </span>
      </button>

      {showExperimental && (
        <div className="mt-3 space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white/40 p-2.5 border border-white/60">
            <span className="text-[11px] text-[var(--color-fg-mute)]">Externe App nutzen:</span>
            <a
              href={telHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-3)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-hairline)] transition"
            >
              Desktop-App öffnen
            </a>
          </div>
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
