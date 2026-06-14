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
  mockTasks,
  mockCalls,
  pipelineStats,
  callsThisWeek,
  STREAK,
} from "./mock/data";

export { isMockMode } from "./mode";
import { isMockMode } from "./mode";

// Gültige UUID? Schützt DB-Queries vor Postgres-Cast-500 bei Nicht-UUID-IDs
// (z.B. alte Mock-Links „prj-…") → liefert sauber null → notFound()/404.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


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

export async function getProject(id: string) {
  if (isMockMode) return mockProjects.find((p) => p.id === id) ?? null;
  if (!UUID_RE.test(id)) return null;
  const { db } = await import("@/db");
  const { projects } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

export async function createProject(input: {
  leadId: string;
  name: string;
  status?: string;
  description?: string;
}): Promise<{ id: string } | null> {
  // Im Mock-Modus existiert keine DB → kein Insert möglich.
  if (isMockMode) return null;
  try {
    const { db } = await import("@/db");
    const { projects } = await import("@/db/schema");
    const [row] = await db
      .insert(projects)
      .values({
        ownerId: OWNER_ID,
        leadId: input.leadId,
        name: input.name,
        status: (input.status ?? "planning") as never,
        description: input.description ?? null,
      })
      .returning({ id: projects.id });
    return row ? { id: row.id } : null;
  } catch {
    return null;
  }
}

export async function createAppointment(input: {
  leadId: string;
  startsAt: Date;
  title?: string;
  reminderAt?: Date;
}): Promise<{ id: string } | null> {
  if (isMockMode) return null;
  try {
    const { db } = await import("@/db");
    const { appointments } = await import("@/db/schema");
    // Erinnerung standardmäßig 24h vor dem Termin.
    const reminderAt =
      input.reminderAt ??
      new Date(input.startsAt.getTime() - 24 * 60 * 60 * 1000);
    const [row] = await db
      .insert(appointments)
      .values({
        ownerId: OWNER_ID,
        leadId: input.leadId,
        startsAt: input.startsAt,
        title: input.title ?? "Telefon-Termin",
        status: "scheduled",
        reminderAt,
      })
      .returning({ id: appointments.id });
    return row ? { id: row.id } : null;
  } catch {
    return null;
  }
}

export async function listTasks(projectId: string) {
  if (isMockMode)
    return mockTasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  const { db } = await import("@/db");
  const { tasks } = await import("@/db/schema");
  const { eq, asc } = await import("drizzle-orm");
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.dueDate));
}

// ── Anrufe & Statistik ───────────────────────────────────────────
export async function listCalls() {
  if (isMockMode)
    return [...mockCalls].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  const { db } = await import("@/db");
  const { calls } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select()
    .from(calls)
    .where(eq(calls.ownerId, OWNER_ID))
    .orderBy(desc(calls.startedAt));
}

export async function callStats() {
  const calls = await listCalls();
  const total = calls.length;
  const connected = calls.filter((c) => (c.durationSec ?? 0) > 0).length;
  const appointments = calls.filter((c) => c.dispo === "appointment").length;
  const interested = calls.filter((c) => c.dispo === "interested").length;
  const totalDuration = calls.reduce((s, c) => s + (c.durationSec ?? 0), 0);
  const avgDuration = connected ? Math.round(totalDuration / connected) : 0;
  const connectRate = total ? Math.round((connected / total) * 100) : 0;
  return { total, connected, connectRate, appointments, interested, avgDuration };
}

// Streak (current/record) für die Sidebar — Mock-Konstante bzw. settings.
export async function getStreak(): Promise<{ current: number; record: number }> {
  if (isMockMode) return { current: STREAK.current, record: STREAK.record };
  try {
    const { db } = await import("@/db");
    const { settings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [s] = await db
      .select()
      .from(settings)
      .where(eq(settings.ownerId, OWNER_ID))
      .limit(1);
    return { current: s?.streakDays ?? 0, record: s?.streakRecord ?? 0 };
  } catch {
    return { current: 0, record: 0 };
  }
}

// Anrufe pro Tag der letzten 7 Tage (für die Wochen-Sparkline) — echte Daten.
async function weeklyCallsDb(anchor: Date): Promise<number[]> {
  const calls = await listCalls();
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(
      calls.filter(
        (c) => c.startedAt && c.startedAt.toISOString().slice(0, 10) === key,
      ).length,
    );
  }
  return days;
}


// ── Leads ────────────────────────────────────────────────────────

export async function listLeads(opts?: {
  status?: string;
  limit?: number;
}): Promise<typeof mockLeads> {
  if (isMockMode) {
    let rows = [...mockLeads];
    if (opts?.status) rows = rows.filter((l) => l.status === opts.status);
    // Heißeste zuerst (niedriger painScore = mehr Verkaufs-Hebel), null ans Ende.
    rows.sort((a, b) => (a.painScore ?? 101) - (b.painScore ?? 101));
    return rows.slice(0, opts?.limit ?? 200);
  }
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");
  const { eq, and, asc, desc } = await import("drizzle-orm");
  const where = opts?.status
    ? and(eq(leads.ownerId, OWNER_ID), eq(leads.status, opts.status as never))
    : eq(leads.ownerId, OWNER_ID);
  // painScore ASC → Postgres sortiert NULL ans Ende (unaudierte zuletzt).
  return db
    .select()
    .from(leads)
    .where(where)
    .orderBy(asc(leads.painScore), desc(leads.createdAt))
    .limit(opts?.limit ?? 200) as never;
}

export async function getLead(id: string) {
  if (isMockMode) return mockLeads.find((l) => l.id === id) ?? null;
  if (!UUID_RE.test(id)) return null;
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
  if (!UUID_RE.test(id)) return null;
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

  const stats = await callStats();

  // Streak: im Mock aus Konstanten, im DB-Modus aus settings (mit Lesefehler-Fallback).
  let streak = STREAK;
  if (!isMockMode) {
    try {
      const { db } = await import("@/db");
      const { settings } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const [s] = await db
        .select()
        .from(settings)
        .where(eq(settings.ownerId, OWNER_ID))
        .limit(1);
      const todayStr = now.toISOString().slice(0, 10);
      const callsToday = await listCalls();
      const todayProgress = callsToday.filter(
        (c) => c.startedAt && c.startedAt.toISOString().slice(0, 10) === todayStr,
      ).length;
      streak = {
        current: s?.streakDays ?? 0,
        record: s?.streakRecord ?? 0,
        todayProgress,
        todayTarget: 25,
      };
    } catch {
      streak = { current: 0, record: 0, todayProgress: 0, todayTarget: 25 };
    }
  }

  return {
    queue: dueToday.slice(0, 12),
    total: all.length,
    won,
    proposalCount,
    mrr,
    pipeline,
    weeklyCalls: isMockMode ? callsThisWeek() : await weeklyCallsDb(now),
    streak,
    upcomingAppointments: upcoming.length,
    nextAppt,
    activeProjects,
    revenueThisMonth,
    callStats: stats,
  };
}
