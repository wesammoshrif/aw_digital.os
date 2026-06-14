"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneMissed,
  Voicemail,
  Calendar,
  RotateCw,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Pause,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ButtonLink, Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Lead } from "@/db/schema";
import { applyCadence, type Disposition } from "@/lib/cadence";

const DISPOSITIONS = [
  { key: "interested", label: "Interesse", icon: CheckCircle2, tone: "copper", description: "Wärmer Lead — Audit senden" },
  { key: "appointment", label: "Termin", icon: Calendar, tone: "success", description: "Vor-Ort / Telefon-Termin" },
  { key: "callback", label: "Rückruf", icon: RotateCw, tone: "neutral", description: "Konkretes Datum vereinbart" },
  { key: "voicemail", label: "Mailbox", icon: Voicemail, tone: "neutral", description: "+3 Tage" },
  { key: "busy", label: "Besetzt", icon: Pause, tone: "neutral", description: "Heute später erneut" },
  { key: "no_answer", label: "Nicht erreicht", icon: PhoneMissed, tone: "neutral", description: "+2 Tage" },
  { key: "not_interested", label: "Kein Interesse", icon: XCircle, tone: "danger", description: "Verloren" },
  { key: "wrong_number", label: "Falsche Nummer", icon: AlertTriangle, tone: "danger", description: "Eingefroren" },
] as const;

const TONE_STYLES = {
  copper:
    "border-[#cfe0fd] hover:bg-[#eff5ff] hover:border-[var(--color-copper-400)] [&_.dot]:bg-[var(--color-copper-500)]",
  success:
    "border-[#bbf7d0] hover:bg-[#f0fdf4] hover:border-[#86efac] [&_.dot]:bg-[var(--color-success)]",
  neutral:
    "border-[var(--color-hairline)] hover:bg-[var(--color-surface-2)] hover:border-[#d8dbe4] [&_.dot]:bg-[var(--color-fg-mute)]",
  danger:
    "border-[#fecaca] hover:bg-[#fef2f2] hover:border-[#fca5a5] [&_.dot]:bg-[var(--color-danger)]",
};

export function CallMode({
  lead,
  nextLeadId,
}: {
  lead: Lead;
  nextLeadId?: string | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState("");
  const [lastDispo, setLastDispo] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [apptPicking, setApptPicking] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const popupRef = useRef<Window | null>(null);
  // Anruf-Start für die Dauer-/Erreichungs-Statistik (connectRate).
  const callStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (active && callStartRef.current === null) callStartRef.current = Date.now();
    if (!active) callStartRef.current = null;
  }, [active]);

  const initiateSystemCall = useCallback(() => {
    if (!lead.phone) return;
    // easybell hat KEINE Click-to-Call REST-API (api.easybell.de existiert nicht).
    // Zuverlässiger Weg: tel:-Link → easybell-Desktop-App / Systemtelefon übernimmt.
    // In-Browser-Telefonie läuft alternativ über das WebRTC-Softphone im Souffleur-Popup.
    window.location.href = `tel:${lead.phone}`;
  }, [lead.phone]);

  const telHref = lead.phone ? `tel:${lead.phone}` : "#";

  // ── Dispo speichern: Kadenz anwenden → PATCH → zur Heute-Liste ──
  const saveDispo = useCallback(
    async (dispo: Disposition, label: string, appointmentAt?: Date) => {
      setSaving(dispo);
      setSaveError(null);
      const cad = applyCadence(
        { status: lead.status, attempts: lead.attempts },
        dispo,
        { appointmentAt },
      );
      try {
        // 1. Lead-Status aktualisieren
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: cad.status,
            attempts: cad.attempts,
            nextStep: cad.nextStep,
            nextStepAt: cad.nextStepAt.toISOString(),
            locked: cad.locked ?? false,
            note: note.trim() || undefined,
          }),
        }).then((r) => r.json());
        if (!res.ok) throw new Error(res.error ?? "Unbekannter Fehler");

        // 2. Aktivität loggen
        await fetch(`/api/leads/${lead.id}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "call",
            title: `Anruf: ${label}`,
            payload: {
              dispo: dispo,
              note: note.trim() || undefined,
              attempts: cad.attempts,
              nextStep: cad.nextStep,
            },
          }),
        });

        // 3. Anruf protokollieren (Statistik & Gedächtnis) — Mock-No-Op
        const durationSec =
          callStartRef.current !== null
            ? Math.max(0, Math.round((Date.now() - callStartRef.current) / 1000))
            : null;
        await fetch(`/api/calls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            dispo,
            durationSec,
            transcript: note.trim() || null,
          }),
        }).catch(() => {});

        // 4. Bei Termin: echte appointments-Row anlegen (für Erinnerungs-Cron).
        if (dispo === "appointment") {
          await fetch(`/api/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: lead.id,
              startsAt: (appointmentAt ?? cad.nextStepAt).toISOString(),
              title: "Telefon-/Vor-Ort-Termin",
            }),
          }).catch(() => {});
        }

        setLastDispo(`${label} → ${cad.nextStep}`);
        setActive(false);
        // Souffleur-Popup schließen — sonst läuft das Mikro weiter zwischen den Calls
        try {
          popupRef.current?.close();
        } catch {}
        popupRef.current = null;
        // Verspricht "springt automatisch zum nächsten" → wenn es einen
        // nächsten fälligen Lead gibt, dorthin springen; sonst Dashboard.
        setTimeout(
          () => router.push(nextLeadId ? `/leads/${nextLeadId}` : "/"),
          800,
        );
      } catch (err) {
        setSaveError(
          "Speichern fehlgeschlagen: " +
            String((err as Error).message ?? err),
        );
      } finally {
        setSaving(null);
      }
    },
    [lead.id, lead.status, lead.attempts, note, router, nextLeadId],
  );

  // ── Dispo aus dem Souffleur-Popup übernehmen ─────────────────────
  useEffect(() => {
    const valid = new Set<string>(DISPOSITIONS.map((d) => d.key));
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; leadId?: string; dispo?: string };
      if (d?.type !== "souffleur:dispo" || d.leadId !== lead.id) return;
      if (d.dispo === "hangup") {
        setActive(false);
        return;
      }
      // Termin aus dem Popup: NICHT blind mit Default-Datum speichern —
      // den Date-Picker im Parent öffnen, damit das vereinbarte Datum zählt.
      if (d.dispo === "appointment") {
        setApptDate((prev) => prev || defaultApptDateTime());
        setApptPicking(true);
        return;
      }
      if (d.dispo && valid.has(d.dispo)) {
        const meta = DISPOSITIONS.find((x) => x.key === d.dispo);
        saveDispo(d.dispo as Disposition, meta?.label ?? d.dispo);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [lead.id, saveDispo]);

  return (
    <div className="space-y-5">
      {/* ── Phone block ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-1)]">
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Klick zum Anrufen
            </div>
            <a
              href={telHref}
              onClick={() => setActive(true)}
              className="text-mono mt-1 block truncate text-[42px] font-semibold leading-tight tracking-tight tabular text-[var(--color-fg)] transition hover:text-[var(--color-copper-600)]"
            >
              {lead.phone ?? "Keine Nummer"}
            </a>
            {lead.auditHook && (
              <p className="mt-4 max-w-[60ch] rounded-md border-l-[3px] border-[var(--color-copper-500)] bg-[#eff5ff] py-2.5 pl-3.5 pr-4 text-[14px] italic leading-relaxed text-[var(--color-copper-700)]">
                „{lead.auditHook}"
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (active) {
                    setActive(false);
                    try {
                      popupRef.current?.close();
                    } catch {}
                    popupRef.current = null;
                    return;
                  }
                  setActive(true);
                  setPopupBlocked(false);
                  const win = window.open(
                    `/souffleur/${lead.id}?autocall=1`,
                    "souffleur",
                    "width=780,height=740,menubar=no,toolbar=no,location=no,status=no",
                  );
                  if (!win || win.closed) {
                    setPopupBlocked(true);
                  } else {
                    popupRef.current = win;
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold transition shadow-sm",
                  active
                    ? "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]"
                    : "bg-[#007aff] text-white hover:bg-[#0062cc]",
                )}
              >
                {active ? (
                  <>
                    <PhoneOff className="h-4 w-4" />
                    Stopp
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-4 w-4" />
                    Direkt (Browser)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (active) {
                    setActive(false);
                    try {
                      popupRef.current?.close();
                    } catch {}
                    popupRef.current = null;
                    return;
                  }
                  setActive(true);
                  setPopupBlocked(false);
                  const win = window.open(
                    `/souffleur/${lead.id}`,
                    "souffleur",
                    "width=780,height=740,menubar=no,toolbar=no,location=no,status=no",
                  );
                  if (!win || win.closed) {
                    setPopupBlocked(true);
                  } else {
                    popupRef.current = win;
                  }
                  initiateSystemCall();
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold transition border",
                  active
                    ? "hidden"
                    : "bg-white text-[var(--color-fg)] border-[var(--color-hairline)] hover:bg-[var(--color-surface-2)]",
                )}
              >
                <Phone className="h-4 w-4" />
                App / Tel
              </button>
            </div>
            <p className="max-w-[20ch] text-right text-[10.5px] leading-tight text-[var(--color-fg-mute)]">
              {active
                ? "Souffleur läuft im Popup"
                : "Wähle die Methode: Browser-Direktruf oder externe App."}
            </p>
            <Link
              href="/settings/telefonie"
              className="text-[11px] text-[var(--color-fg-mute)] hover:text-[var(--color-copper-600)]"
            >
              Telefonie-Setup &rarr;
            </Link>
          </div>
        </div>

        {popupBlocked && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <div className="flex items-center gap-2 text-[13px]">
              <AlertTriangle className="h-4 w-4" />
              <span>Das Souffleur-Fenster wurde vom Browser blockiert.</span>
            </div>
            <a
              href={`/souffleur/${lead.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setPopupBlocked(false)}
              className="inline-flex items-center justify-center font-medium transition-colors duration-150 bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-surface-3)] h-7 px-3.5 text-[12.5px] gap-1.5 rounded-full"
            >
              Manuell öffnen
            </a>
          </div>
        )}

        {recording && <RecordingBars />}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          Notiz
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Was wurde besprochen? Wer ist Entscheider? Pain Points genannt?"
          className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3.5 py-2.5 text-[13px] text-[var(--color-fg)] shadow-[var(--shadow-1)] outline-none placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-copper-400)] focus:ring-2 focus:ring-[#dbe8fe]"
        />
      </div>

      {/* ── Dispo grid ─────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Disposition · springt automatisch zum nächsten
          </div>
          {lastDispo && (
            <div className="text-[11px] text-[var(--color-success)]">
              ✓ Gespeichert: {lastDispo}
            </div>
          )}
          {saveError && (
            <div className="text-[11px] text-[var(--color-danger)]">
              {saveError}
            </div>
          )}
        </div>
        {apptPicking && (
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
                Termin wann?
              </span>
              <input
                type="datetime-local"
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!apptDate || !!saving}
              onClick={() => {
                const d = new Date(apptDate);
                if (isNaN(d.getTime())) return;
                setApptPicking(false);
                saveDispo("appointment", "Termin", d);
              }}
            >
              Termin speichern
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApptPicking(false)}>
              Abbrechen
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DISPOSITIONS.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.key}
                disabled={!!saving}
                onClick={() => {
                  if (d.key === "appointment") {
                    if (!apptDate) setApptDate(defaultApptDateTime());
                    setApptPicking(true);
                    return;
                  }
                  saveDispo(d.key, d.label);
                }}
                className={cn(
                  "group flex flex-col items-start rounded-[var(--radius-md)] border bg-white p-3 text-left shadow-[var(--shadow-1)] transition disabled:opacity-50",
                  saving === d.key && "ring-2 ring-[var(--color-copper-400)]",
                  TONE_STYLES[d.tone],
                )}
              >
                <div className="flex w-full items-center gap-1.5">
                  <span className="dot h-1.5 w-1.5 rounded-full" />
                  <Icon className="h-3.5 w-3.5 text-[var(--color-fg-dim)]" />
                  <span className="text-[12.5px] font-medium text-[var(--color-fg)]">
                    {d.label}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-fg-mute)]">
                  {d.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Default-Terminvorschlag: morgen 10:00, im datetime-local-Format. */
function defaultApptDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RecordingBars() {
  return (
    <div className="relative mt-4 flex h-8 items-center gap-1.5">
      {Array.from({ length: 32 }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-full bg-[var(--color-hot)]/50"
          style={{
            height: `${20 + Math.sin(i * 0.7) * 18 + (i % 7) * 4}%`,
            animation: `pulse ${1.2 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
