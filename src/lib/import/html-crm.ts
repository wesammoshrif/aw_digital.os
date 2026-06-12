/**
 * Importer für die bestehende HTML-CRM Single-Datei (`AW Digital CRM.html`).
 *
 * Erlaubt zwei Wege:
 *   1. Vollständiger localStorage-Dump (JSON-Export-Button im HTML-CRM)
 *   2. Manuelles JSON-Paste der `leads`-Array
 *
 * Mapped legacy Felder auf das neue Drizzle-Schema. Verlustfrei: alles,
 * was nicht passt, landet in `custom`.
 */

import { z } from "zod";
import type { NewLead } from "@/db/schema";

const HtmlLeadSchema = z.object({
  id: z.string().optional(),
  firma: z.string().optional(),
  company: z.string().optional(),
  gewerk: z.string().optional(),
  trade: z.string().optional(),
  ort: z.string().optional(),
  city: z.string().optional(),
  plz: z.string().optional(),
  quelle: z.string().optional(),
  source: z.string().optional(),
  score: z.enum(["Heiß", "Warm", "Kalt", "hot", "warm", "cold"]).optional(),
  status: z.string().optional(),
  kontakt: z.string().optional(),
  contact: z.string().optional(),
  telefon: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  wert: z.number().optional(),
  value: z.number().optional(),
  wartung: z.number().optional(),
  maintenance: z.number().optional(),
  naechsterSchritt: z.string().optional(),
  nextStep: z.string().optional(),
  naechsterSchrittDatum: z.string().optional(),
  versuche: z.number().optional(),
  attempts: z.number().optional(),
  notizen: z.string().optional(),
  notes: z.string().optional(),
  gesperrt: z.boolean().optional(),
  locked: z.boolean().optional(),
});

const STATUS_MAP: Record<string, NewLead["status"]> = {
  neu: "new",
  angesprochen: "contacted",
  "erreicht/interesse": "reached",
  interesse: "reached",
  "audit/termin": "audit_sent",
  audit: "audit_sent",
  termin: "audit_sent",
  angebot: "proposal",
  gewonnen: "won",
  verloren: "lost",
  eis: "frozen",
  "verloren/eis": "frozen",
};

const SCORE_MAP: Record<string, NewLead["score"]> = {
  Heiß: "hot",
  hot: "hot",
  Warm: "warm",
  warm: "warm",
  Kalt: "cold",
  cold: "cold",
};

export function mapHtmlLead(
  raw: unknown,
  ownerId: string,
): NewLead {
  const parsed = HtmlLeadSchema.parse(raw);
  const customExtras: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    if (
      ![
        "id",
        "firma",
        "company",
        "gewerk",
        "trade",
        "ort",
        "city",
        "plz",
        "quelle",
        "source",
        "score",
        "status",
        "kontakt",
        "contact",
        "telefon",
        "phone",
        "email",
        "wert",
        "value",
        "wartung",
        "maintenance",
        "naechsterSchritt",
        "nextStep",
        "naechsterSchrittDatum",
        "versuche",
        "attempts",
        "notizen",
        "notes",
        "gesperrt",
        "locked",
      ].includes(k)
    ) {
      customExtras[k] = v;
    }
  }

  const company = parsed.firma ?? parsed.company ?? "Unbenannt";
  const statusRaw = (parsed.status ?? "neu").toLowerCase();
  const status = STATUS_MAP[statusRaw] ?? "new";
  const score = parsed.score ? SCORE_MAP[parsed.score] : undefined;

  return {
    ownerId,
    company,
    trade: parsed.gewerk ?? parsed.trade ?? null,
    city: parsed.ort ?? parsed.city ?? null,
    postalCode: parsed.plz ?? null,
    contactName: parsed.kontakt ?? parsed.contact ?? null,
    phone: parsed.telefon ?? parsed.phone ?? null,
    email: parsed.email ?? null,
    status,
    score,
    source: "manual",
    value: parsed.wert?.toString() ?? parsed.value?.toString() ?? null,
    maintenance:
      parsed.wartung?.toString() ?? parsed.maintenance?.toString() ?? null,
    nextStep: parsed.naechsterSchritt ?? parsed.nextStep ?? null,
    nextStepAt: parsed.naechsterSchrittDatum
      ? new Date(parsed.naechsterSchrittDatum)
      : null,
    attempts: parsed.versuche ?? parsed.attempts ?? 0,
    locked: parsed.gesperrt ?? parsed.locked ?? false,
    notes: parsed.notizen ?? parsed.notes ?? null,
    custom: customExtras,
  };
}

export function mapHtmlExport(
  rawJson: string,
  ownerId: string,
): NewLead[] {
  const data = JSON.parse(rawJson);
  const leads = Array.isArray(data)
    ? data
    : Array.isArray(data.leads)
      ? data.leads
      : Array.isArray(data.data?.leads)
        ? data.data.leads
        : [];

  return leads.map((l: unknown) => mapHtmlLead(l, ownerId));
}
