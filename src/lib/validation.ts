/**
 * Zod-Schemas für die Eingabevalidierung der Route-Handler.
 * Niemals client-gelieferten Werten ungeprüft vertrauen (PDF 4.6).
 *
 * Für komplexe externe Shapes (Finder-Leads) wird bewusst locker validiert
 * (Top-Level-Typ + Größenbegrenzung); die Handler lesen die Felder defensiv.
 */

import { z } from "zod";

const optStr = z.string().max(2000).optional();
const optLongStr = z.string().max(100_000).optional();
const record = z.record(z.string(), z.unknown());

export const leadCreateSchema = z.object({
  company: z.string().min(1).max(300),
  trade: optStr,
  city: optStr,
  postalCode: optStr,
  phone: optStr,
  email: optStr,
  website: optStr,
  notes: z.string().max(5000).optional(),
});

export const leadPatchSchema = z.object({
  status: optStr,
  attempts: z.number().int().min(0).max(10_000).optional(),
  nextStep: optStr,
  nextStepAt: optStr,
  note: z.string().max(5000).optional(),
  locked: z.boolean().optional(),
});

export const activitySchema = z.object({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  payload: record.optional(),
});

export const invoiceCreateSchema = z.object({
  leadId: z.string().min(1).max(100),
  invoiceNumber: z.string().min(1).max(100),
  kind: z.enum(["quote", "invoice"]).optional(),
  type: optStr,
  amount: z.union([z.string().max(40), z.number()]),
  status: optStr,
  dueDate: optStr,
  notes: z.string().max(5000).optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(300),
  leadId: z.string().max(100).optional(),
  status: optStr,
  description: z.string().max(5000).optional(),
  deadline: optStr,
});

export const appointmentSchema = z.object({
  leadId: z.string().min(1).max(100),
  startsAt: z.string().min(1).max(60),
  title: optStr,
});

export const callCreateSchema = z.object({
  leadId: z.string().min(1).max(100),
  dispo: optStr,
  durationSec: z.number().int().min(0).max(86_400).optional(),
  transcript: z.string().max(200_000).nullable().optional(),
  summary: record.nullable().optional(),
  sentiment: z.string().max(40).nullable().optional(),
  externalCallId: z.string().max(200).nullable().optional(),
});

export const auditSchema = z.object({
  leadId: z.string().max(100).optional(),
  websiteUrl: z.string().min(1).max(2000),
});

export const auditPendingSchema = z.object({
  limit: z.number().int().optional(),
});

export const finderSchema = z.object({
  city: optStr,
  trades: z.array(z.string().max(80)).max(50).optional(),
  sources: z.array(z.string().max(40)).max(20).optional(),
});

export const scrapeOsmSchema = z.object({
  city: optStr,
  trades: z.array(z.string().max(80)).max(50).optional(),
});

export const finderImportSchema = z.object({
  leads: z.array(record).max(2000),
});

export const souffleurSuggestSchema = z.object({
  transcript: optLongStr,
  hook: z.string().max(2000).nullable().optional(),
  company: optStr,
  trade: z.string().max(200).nullable().optional(),
  tradeContext: z.string().max(5000).nullable().optional(),
  neinTyp: z.string().max(60).nullable().optional(),
  phase: z.string().max(60).nullable().optional(),
  // Einstiegs-Stufe (opener1 | warten | bridge | frei) — steuert das Einstiegs-Gate.
  stage: z.string().max(20).nullable().optional(),
  // Phase 9: Gesprächs-Gedächtnis (letzte Kundenaussagen), Phasen-Hint, Berater-Name.
  history: z.array(z.string().max(600)).max(8).optional(),
  elapsedSec: z.number().int().min(0).max(36_000).optional(),
  repName: z.string().max(80).nullable().optional(),
  // Phase 10: voller rundenbasierter Dialog (Berater + Kunde im Wechsel).
  turns: z
    .array(
      z.object({
        speaker: z.enum(["advisor", "customer"]),
        text: z.string().max(2000),
      }),
    )
    .max(20)
    .optional(),
  // Cold-Calling-Profil: Stil-Vorgaben für den KI-Dirigenten.
  profile: z
    .object({
      freundlichkeit: z.enum(["direkt", "ausgewogen", "herzlich"]),
      genauigkeit: z.enum(["locker", "ausgewogen", "praezise"]),
      anrede: z.enum(["sie", "du"]),
      humor: z.boolean(),
      stilnotiz: z.string().max(300).optional(),
    })
    .optional(),
});

export const souffleurSummarySchema = z.object({
  transcript: optLongStr,
  company: optStr,
  trade: z.string().max(200).nullable().optional(),
});

// Phase 8: KI-Mitarbeiter-Bewertung (admin-only). agentId = profiles.id.
export const agentReviewSchema = z.object({
  agentId: z.string().uuid(),
  periodDays: z.number().int().min(1).max(365).optional(),
});
