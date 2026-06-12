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
      return {
        status: dormant ? "frozen" : "contacted",
        nextStep: dormant ? "Ruhend – in 30 Tagen erneut" : "Erneuter Anruf",
        nextStepAt: new Date(now + (dormant ? 30 : 2) * DAY),
        attempts,
      };
    }
    case "voicemail":
      return {
        status: "contacted",
        nextStep: "Mailbox hinterlassen — Rückruf abwarten",
        nextStepAt: new Date(now + 3 * DAY),
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
        nextStepAt: new Date(now + 1 * DAY),
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
  const bumps = Math.floor(days / intervalDays);
  return Math.min(max, start + bumps * step);
}
