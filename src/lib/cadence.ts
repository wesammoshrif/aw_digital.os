/**
 * Automatische Kadenz — „nächste Aktion immer gesetzt"
 *
 * Jede Disposition setzt Status + nächstes Datum + Versuchszähler.
 * Aus dem ursprünglichen HTML-CRM Memo übernommen.
 */

import type { Lead } from "@/db/schema";

export type Disposition =
  | "no_answer"
  | "voicemail"
  | "busy"
  | "interested"
  | "appointment"
  | "callback"
  | "not_interested"
  | "wrong_number";

export interface CadenceResult {
  status: Lead["status"];
  nextStep: string;
  nextStepAt: Date;
  attempts: number;
  locked?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// Eskalierende Abstände für Wiederanrufe (aus FOLLOW_UP_CADENCE: Telefon-Touches
// an Tag 1/3/8/14 → Lücken 2/5/6 Tage). Statt fix 2 Tage wird der Abstand größer.
const RETRY_GAP_DAYS = [2, 5, 6, 6];
const retryGap = (attempt: number) =>
  RETRY_GAP_DAYS[Math.min(attempt - 1, RETRY_GAP_DAYS.length - 1)];

/** Wiedervorlage auf das beste Anruf-Fenster legen (später Nachmittag, kein
 *  Wochenende) — laut BEST_CALL_TIMES ist Do 16–17:30 Uhr Gold. */
function atBestCallTime(d: Date): Date {
  const r = new Date(d);
  r.setHours(16, 30, 0, 0);
  const day = r.getDay(); // 0=So, 6=Sa
  if (day === 6) r.setDate(r.getDate() + 2);
  else if (day === 0) r.setDate(r.getDate() + 1);
  if (r.getTime() < Date.now()) r.setDate(r.getDate() + 1);
  return r;
}

export function applyCadence(
  current: Pick<Lead, "status" | "attempts">,
  dispo: Disposition,
  options: { appointmentAt?: Date } = {},
): CadenceResult {
  const attempts = current.attempts + 1;
  const now = Date.now();

  switch (dispo) {
    case "no_answer": {
      const dormant = attempts >= 5;
      if (dormant)
        return {
          status: "frozen",
          nextStep: "Ruhend – in 30 Tagen erneut",
          nextStepAt: new Date(now + 30 * DAY),
          attempts,
        };
      return {
        status: "contacted",
        nextStep:
          attempts >= 2
            ? `Erneuter Anruf (Versuch ${attempts + 1}) — zwischendurch kurze Mail mit Analyse`
            : "Erneuter Anruf",
        nextStepAt: atBestCallTime(new Date(now + retryGap(attempts) * DAY)),
        attempts,
      };
    }
    case "voicemail":
      return {
        status: "contacted",
        nextStep: "Mailbox hinterlassen — kurze Mail nachschicken, dann Rückruf",
        nextStepAt: atBestCallTime(new Date(now + 3 * DAY)),
        attempts,
      };
    case "busy":
      return {
        status: "contacted",
        nextStep: "Heute später erneut",
        nextStepAt: new Date(now + 2 * HOUR),
        attempts,
      };
    case "interested":
      return {
        status: "reached",
        nextStep: "Audit senden + Termin vorschlagen",
        nextStepAt: new Date(now + 2 * DAY),
        attempts,
      };
    case "appointment":
      return {
        status: "audit_sent",
        nextStep: "Termin",
        nextStepAt: options.appointmentAt ?? new Date(now + 3 * DAY),
        attempts,
      };
    case "callback":
      return {
        status: "contacted",
        nextStep: "Rückruf — Datum bestätigen",
        nextStepAt: atBestCallTime(new Date(now + 1 * DAY)),
        attempts,
      };
    case "not_interested":
      return {
        status: "lost",
        nextStep: "—",
        nextStepAt: new Date(now + 180 * DAY),
        attempts,
        locked: true,
      };
    case "wrong_number":
      return {
        status: "frozen",
        nextStep: "Nummer korrigieren / Lead prüfen",
        nextStepAt: new Date(now + 90 * DAY),
        attempts,
        locked: true,
      };
  }
}

/**
 * Rampen-Logik: ab Start-Datum + Schrittweite, gedeckelt.
 */
export function dailyTarget(
  rampStartedAt: Date | null,
  start = 25,
  step = 10,
  intervalDays = 14,
  max = 100,
): number {
  if (!rampStartedAt) return start;
  const days = Math.floor((Date.now() - rampStartedAt.getTime()) / DAY);
  if (days <= 0) return start; // zukünftiges/heutiges Startdatum → kein Minus-Ziel
  const bumps = Math.floor(days / intervalDays);
  return Math.min(max, start + bumps * step);
}
