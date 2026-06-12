/**
 * Data-Access-Layer mit transparentem Fallback.
 *
 * Wenn `DATABASE_URL` gesetzt ist → echte Drizzle-Queries.
 * Sonst → Mock-Daten aus `lib/mock/data.ts`.
 *
 * Die Pages müssen nichts wissen.
 */

import { OWNER_ID } from "./utils";
import {
  mockLeads,
  mockActivities,
  mockAudits,
  mockTriggers,
  mockAppointments,
  mockProjects,
  mockInvoices,
  pipelineStats,
  callsThisWeek,
  STREAK,
} from "./mock/data";

export { isMockMode } from "./mode";
import { isMockMode } from "./mode";


export async function listProjects() {
  if (isMockMode) return mockProjects;
  const { db } = await import("@/db");
  const { projects } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return db.select().from(projects).where(eq(projects.ownerId, OWNER_ID));
}

export async function listInvoices() {
  if (isMockMode) return mockInvoices;
  const { db } = await import("@/db");
  const { invoices } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return db.select().from(invoices).where(eq(invoices.ownerId, OWNER_ID));
}

// Angebote (kind = "quote") und Rechnungen (kind = "invoice") getrennt.
export async function listQuotes() {
  const all = await listInvoices();
  return all.filter((i) => i.kind === "quote");
}

export async function listRechnungen() {
  const all = await listInvoices();
  return all.filter((i) => i.kind === "invoice");
}

export async function getProjectByLeadId(leadId: string) {
  if (isMockMode) return mockProjects.find((p) => p.leadId === leadId) ?? null;
  const { db } = await import("@/db");
  const { projects } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(projects).where(eq(projects.leadId, leadId)).limit(1);
  return row ?? null;
}


// ── Leads ────────────────────────────────────────────────────────

export async function listLeads(opts?: {
  status?: string;
  limit?: number;
}): Promise<typeof mockLeads> {
  if (isMockMode) {
    let rows = [...mockLeads];
    if (opts?.status) rows = rows.filter((l) => l.status === opts.status);
    return rows.slice(0, opts?.limit ?? 200);
  }
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const where = opts?.status
    ? and(eq(leads.ownerId, OWNER_ID), eq(leads.status, opts.status as never))
    : eq(leads.ownerId, OWNER_ID);
  return db
    .select()
    .from(leads)
    .where(where)
    .limit(opts?.limit ?? 200) as never;
}

export async function getLead(id: string) {
  if (isMockMode) return mockLeads.find((l) => l.id === id) ?? null;
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row ?? null;
}

export async function listActivitiesForLead(leadId: string) {
  if (isMockMode)
    return mockActivities
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const { db } = await import("@/db");
  const { activities } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select()
    .from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.createdAt));
}

export async function listTriggers() {
  if (isMockMode)
    return mockTriggers.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
  const { db } = await import("@/db");
  const { triggerEvents } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select()
    .from(triggerEvents)
    .where(eq(triggerEvents.ownerId, OWNER_ID))
    .orderBy(desc(triggerEvents.occurredAt));
}

export async function listAudits() {
  if (isMockMode)
    return mockAudits.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  const { db } = await import("@/db");
  const { audits } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select()
    .from(audits)
    .where(eq(audits.ownerId, OWNER_ID))
    .orderBy(desc(audits.createdAt));
}

export async function getAudit(id: string) {
  if (isMockMode) return mockAudits.find((a) => a.id === id) ?? null;
  const { db } = await import("@/db");
  const { audits } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return row ?? null;
}

export async function getLatestAuditForLead(leadId: string) {
  if (isMockMode) {
    const rows = mockAudits
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows[0] ?? null;
  }
  const { db } = await import("@/db");
  const { audits } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(audits)
    .where(eq(audits.leadId, leadId))
    .orderBy(desc(audits.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listAppointments() {
  if (isMockMode) return mockAppointments;
  const { db } = await import("@/db");
  const { appointments } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.ownerId, OWNER_ID));
}

// Termine inkl. zugehörigem Lead (Firma/Telefon) — für die Termin-Seite.
export type AppointmentWithLead = (typeof mockAppointments)[number] & {
  lead: { id: string; company: string; phone: string | null } | null;
};

export async function listAppointmentsWithLead(): Promise<AppointmentWithLead[]> {
  const appts = await listAppointments();
  const leads = await listLeads({ limit: 500 });
  const byId = new Map(leads.map((l) => [l.id, l]));
  return appts.map((a) => {
    const l = byId.get(a.leadId);
    return {
      ...a,
      lead: l ? { id: l.id, company: l.company, phone: l.phone } : null,
    };
  });
}

// ── Dashboard helpers ────────────────────────────────────────────

// Anker: im Mock-Modus auf 2026-06-06 (passend zu den Seed-Daten),
// in Produktion echtes Date.now() — sonst friert die Heute-Queue ein.
export function nowAnchor() {
  return isMockMode ? new Date("2026-06-06T09:00:00Z") : new Date();
}

export async function dashboardSummary() {
  const all = await listLeads({ limit: 500 });
  const now = nowAnchor();
  // Status "new" ohne nextStepAt = sofort fällig (frisch gescrapte Leads)
  const dueToday = all
    .filter(
      (l) =>
        !l.locked &&
        (l.status === "new"
          ? !l.nextStepAt || l.nextStepAt.getTime() <= now.getTime() + 24 * 3600 * 1000
          : l.nextStepAt && l.nextStepAt.getTime() <= now.getTime() + 24 * 3600 * 1000),
    )
    .sort((a, b) => (a.painScore ?? 100) - (b.painScore ?? 100));

  const won = all.filter((l) => l.status === "won").length;
  const proposalCount = all.filter((l) => l.status === "proposal").length;
  const mrr = all
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + parseFloat(l.maintenance ?? "0"), 0);

  // Pipeline-Buckets immer aus den geladenen Leads, nicht aus Mock-Konstanten.
  const STAGES = ["new", "contacted", "reached", "audit_sent", "proposal", "won", "frozen"] as const;
  const pipeline: Record<string, { count: number; value: number }> = {};
  for (const status of STAGES) {
    const inStage = all.filter((l) => l.status === status);
    pipeline[status] = {
      count: inStage.length,
      value: inStage.reduce(
        (sum, l) => sum + parseFloat(l.maintenance ?? "0") * 12,
        0,
      ),
    };
  }

  // Termine: aus listAppointments rechnen (nicht hartcoden).
  const appts = await listAppointments();
  const upcoming = appts
    .filter(
      (a) =>
        a.status === "scheduled" &&
        a.startsAt &&
        a.startsAt.getTime() >= now.getTime(),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const nextAppt = upcoming[0] ?? null;

  const prjs = await listProjects();
  const activeProjects = prjs.filter((p) => p.status !== "live");

  const invs = await listInvoices();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const revenueThisMonth = invs
    .filter((inv) => {
      if (inv.status !== "paid" || !inv.paidAt) return false;
      return (
        inv.paidAt.getMonth() === currentMonth &&
        inv.paidAt.getFullYear() === currentYear
      );
    })
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  return {
    queue: dueToday.slice(0, 12),
    total: all.length,
    won,
    proposalCount,
    mrr,
    pipeline,
    weeklyCalls: callsThisWeek(),
    streak: isMockMode ? STREAK : { current: 0, record: 0, todayProgress: 0, todayTarget: 25 },
    upcomingAppointments: upcoming.length,
    nextAppt,
    activeProjects,
    revenueThisMonth,
  };
}
