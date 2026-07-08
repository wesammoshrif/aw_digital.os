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
  Pause,
  Mail,
  Ban,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmailCompose } from "@/components/EmailCompose";
import { cn } from "@/lib/utils";
import type { Lead } from "@/db/schema";
import { applyCadence, type Disposition } from "@/lib/cadence";
import { isDnc } from "@/lib/compliance";
import { provisionPerTermin, fmtEuro } from "@/lib/provision";

const DISPOSITIONS = [
  { key: "interested", label: "Interesse", icon: CheckCircle2, tone: "copper", description: "Wärmer Lead — Audit senden" },
  { key: "appointment", label: "Termin", icon: Calendar, tone: "success", description: "Vor-Ort / Telefon-Termin" },
  { key: "callback", label: "Rückruf", icon: RotateCw, tone: "neutral", description: "Konkretes Datum vereinbart" },
  { key: "voicemail", label: "Mailbox", icon: Voicemail, tone: "neutral", description: "+3 Tage" },
  { key: "busy", label: "Besetzt", icon: Pause, tone: "neutral", description: "Heute später erneut" },
  { key: "no_answer", label: "Nicht erreicht", icon: PhoneMissed, tone: "neutral", description: "+2 Tage" },
  { key: "not_interested", label: "Kein Interesse", icon: XCircle, tone: "danger", description: "Verloren — DNC" },
  { key: "wrong_number", label: "Falsche Nummer", icon: AlertTriangle, tone: "danger", description: "Eingefroren — DNC" },
  { key: "opt_out", label: "Nicht mehr anrufen", icon: Ban, tone: "danger", description: "Opt-out — dauerhaft gesperrt" },
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
  callBlocked,
  focusMode = false,
}: {
  lead: Lead;
  nextLeadId?: string | null;
  callBlocked?: boolean;
  focusMode?: boolean;
}) {
  const router = useRouter();
  // Einziger harter Schutz: DNC (Kunde hat Anrufe ausdrücklich abbestellt) —
  // schützt vor Beschwerden. Kein Einwilligungs-Nag; der Erstkontakt liegt in
  // der Hand des Nutzers.
  const dncBlocked = isDnc(lead);
  void callBlocked; // Gating wird granular aus dem Lead abgeleitet
  const complianceOk = useCallback(() => !dncBlocked, [dncBlocked]);
  const [active, setActive] = useState(false);
  const [recording] = useState(false);
  const [note, setNote] = useState("");
  const [lastDispo, setLastDispo] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [apptPicking, setApptPicking] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [apptDate, setApptDate] = useState("");
  // Termin gebucht → kurze Provisions-Motivation, bevor es weitergeht.
  const [celebrateProvision, setCelebrateProvision] = useState(false);
  const popupRef = useRef<Window | null>(null);
  // Anruf-Start für die Dauer-/Erreichungs-Statistik (connectRate).
  const callStartRef = useRef<number | null>(null);
  // Echtes Gespräch + Consent aus dem Souffleur-Popup (für CRM-Gedächtnis +
  // Post-Call-Summary). Wird pro Anruf gesetzt, nach dem Speichern geleert.
  const lastCallDataRef = useRef<{
    transcript: string | null;
    consent: boolean;
    company?: string;
    trade?: string;
    callId?: string | null;
    note?: string | null;
  } | null>(null);
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
  const dispatchingRef = useRef(false);
  const saveDispo = useCallback(
    async (dispo: Disposition, label: string, appointmentAt?: Date) => {
      // Doppel-Dispo verhindern: Button UND postMessage aus dem Popup können
      // gleichzeitig feuern → sonst doppelte calls/activities/Termine.
      if (dispatchingRef.current) return;
      dispatchingRef.current = true;
      setSaving(dispo);
      setSaveError(null);
      const cad = applyCadence(
        { status: lead.status, attempts: lead.attempts },
        dispo,
        { appointmentAt },
      );
      // Pflicht-Notiz: bevorzugt die im Popup erfasste Notiz, sonst die lokal
      // getippte. So wird das „was kam raus?" aus der Anruf-Abfrage gespeichert.
      const effNote = (lastCallDataRef.current?.note ?? "").trim() || note.trim();
      let ok = false;
      try {
        // 1. Lead-Status aktualisieren
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: cad.status,
            attemptsIncrement: true, // Server inkrementiert atomar (kein Lost-Update)
            nextStep: cad.nextStep,
            nextStepAt: cad.nextStepAt.toISOString(),
            locked: cad.locked ?? false,
            // Harter Do-Not-Call bei not_interested/wrong_number/opt_out.
            dnc: cad.dnc ?? undefined,
            dncReason: cad.dnc ? `Disposition: ${label}` : undefined,
            note: effNote || undefined,
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
              note: effNote || undefined,
              attempts: cad.attempts,
              nextStep: cad.nextStep,
            },
          }),
        });

        // 3. Anruf protokollieren (Statistik & Gedächtnis).
        const durationSec =
          callStartRef.current !== null
            ? Math.max(0, Math.round((Date.now() - callStartRef.current) / 1000))
            : null;
        // Echtes Transkript NUR mit Einwilligung speichern (§201 StGB). Mit
        // Transkript zusätzlich eine Post-Call-Summary holen (Stichpunkte/
        // Sentiment/nächster Schritt) — CRM-Gedächtnis ohne Tipparbeit + Daten
        // fürs Coaching. Ohne Consent bleibt es bei der getippten Notiz.
        const cd = lastCallDataRef.current;
        let transcriptToSave: string | null = effNote || null;
        let summaryObj: Record<string, unknown> | null = null;
        let sentiment: string | null = null;
        // Der Souffleur liefert hier bereits NUR die Berater-Worte (kundenfrei).
        // Das ist keine Kundenaufnahme → kein Consent-Gate nötig, wird IMMER
        // gespeichert. Auto-Löschung nach 3 Monaten via pg_cron in der DB.
        if (cd?.transcript) {
          transcriptToSave = cd.transcript;
          try {
            const s = await fetch(`/api/souffleur/summary`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: cd.transcript,
                company: cd.company,
                trade: cd.trade,
              }),
            }).then((r) => r.json());
            if (s?.ok) {
              summaryObj = {
                points: Array.isArray(s.summary) ? s.summary : [],
                nextStep: typeof s.nextStep === "string" ? s.nextStep : null,
              };
              sentiment = typeof s.sentiment === "string" ? s.sentiment : null;
            }
          } catch {}
        }
        await fetch(`/api/calls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            dispo,
            durationSec,
            transcript: transcriptToSave,
            summary: summaryObj,
            sentiment,
            // Souffleur hat den Anruf beim Verbinden schon angelegt → dieselbe
            // Row aktualisieren statt eine zweite anzulegen (Upsert serverseitig).
            externalCallId: cd?.callId ?? null,
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
        // Termin? Kurz die mögliche Provision feiern (Motivation), dann weiter.
        const isTermin = dispo === "appointment";
        if (isTermin) setCelebrateProvision(true);
        // Im Fokus-Modus zurück auf /fokus, aber den GERADE bearbeiteten Lead
        // überspringen (?skip) — sonst zeigt queue[0] denselben Lead erneut
        // (z.B. „Besetzt" bleibt fällig) = Endlosschleife. Sonst zum nächsten
        // Lead bzw. Dashboard.
        const dest = focusMode
          ? `/fokus?skip=${lead.id}`
          : nextLeadId
            ? `/leads/${nextLeadId}`
            : "/";
        setTimeout(() => router.push(dest), isTermin ? 2600 : 800);
        ok = true;
      } catch (err) {
        setSaveError(
          "Speichern fehlgeschlagen: " +
            String((err as Error).message ?? err),
        );
      } finally {
        lastCallDataRef.current = null;
        // Bei Erfolg NICHT entsperren: wir navigieren gleich weg und die
        // Instanz wird neu gemountet. Würden wir hier saving/dispatchingRef
        // freigeben, wäre das Dispo-Grid im 800–2600ms-Fenster erneut klickbar
        // → zweiter PATCH + Doppel-Termin. Nur im Fehlerfall entsperren.
        if (!ok) {
          setSaving(null);
          dispatchingRef.current = false;
        }
      }
    },
    [lead.id, lead.status, lead.attempts, note, router, nextLeadId, focusMode],
  );

  // ── Dispo aus dem Souffleur-Popup übernehmen ─────────────────────
  useEffect(() => {
    const valid = new Set<string>(DISPOSITIONS.map((d) => d.key));
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as {
        type?: string;
        leadId?: string;
        dispo?: string;
        note?: string | null;
        transcript?: string | null;
        consent?: boolean;
        company?: string;
        trade?: string;
        callId?: string | null;
      };
      if (d?.type !== "souffleur:dispo" || d.leadId !== lead.id) return;
      // Echtes Gespräch + Consent + Pflicht-Notiz merken — auch für den
      // Termin-Pfad, der erst nach dem Date-Picker speichert.
      lastCallDataRef.current = {
        transcript: d.transcript ?? null,
        consent: !!d.consent,
        company: d.company,
        trade: d.trade,
        callId: d.callId ?? null,
        note: d.note ?? null,
      };
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
      {celebrateProvision && (
        <ProvisionCelebration onClose={() => setCelebrateProvision(false)} />
      )}
      {/* ── Phone block ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-1)]">
        {dncBlocked && (
          <div className="mb-4 flex items-start gap-2 rounded-[12px] bg-[#fef2f2] p-3 text-[12.5px] leading-relaxed text-[#b42318]">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Dieser Lead ist als „Nicht mehr anrufen“ (DNC) gesperrt — Anruf nicht möglich.
            </span>
          </div>
        )}
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Klick zum Anrufen
            </div>
            <a
              href={dncBlocked ? undefined : telHref}
              onClick={(e) => {
                if (!complianceOk()) {
                  e.preventDefault();
                  return;
                }
                setActive(true);
              }}
              className={cn(
                "text-mono mt-1 block truncate text-[42px] font-semibold leading-tight tracking-tight tabular transition",
                dncBlocked
                  ? "cursor-not-allowed text-[var(--color-fg-mute)] line-through"
                  : "text-[var(--color-fg)] hover:text-[var(--color-copper-600)]",
              )}
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
            <div className={cn("flex items-center gap-2", dncBlocked && "hidden")}>
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
                  if (!complianceOk()) return;
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
                  if (!complianceOk()) return;
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

        <button
          onClick={() => setEmailOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[12.5px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-2)]"
        >
          <Mail className="h-3.5 w-3.5" /> Mail an Kunde schicken
        </button>

        {emailOpen && (
          <EmailCompose
            lead={{
              id: lead.id,
              contactName: lead.contactName,
              company: lead.company,
              email: lead.email,
              website: lead.website,
            }}
            callId={lastCallDataRef.current?.callId ?? null}
            onClose={() => setEmailOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/** Motivations-Overlay nach einem gebuchten Termin: mögliche Provision groß. */
function ProvisionCelebration({ onClose }: { onClose: () => void }) {
  const amount = provisionPerTermin();
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-[22px] bg-white px-8 py-9 text-center shadow-[var(--shadow-3)] [animation:ws-rise_0.4s_var(--ease-out)]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eafaf0] text-[var(--color-success)]">
          <Trophy className="h-8 w-8" />
        </span>
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-success)]">
          Termin gebucht
        </div>
        <div className="text-[14px] text-[var(--color-fg-dim)]">
          Mögliche Provision
        </div>
        <div className="text-mono text-[48px] font-semibold leading-none tabular text-[var(--color-fg)]">
          {fmtEuro(amount)}
        </div>
        <p className="mt-1 text-[12.5px] text-[var(--color-fg-mute)]">
          Stark. Weiter zum nächsten Lead.
        </p>
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
