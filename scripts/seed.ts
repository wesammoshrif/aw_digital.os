/**
 * Seed-Script — schreibt die Mock-Daten in die echte (Supabase-)DB.
 *
 * Voraussetzung: DATABASE_URL gesetzt (in .env.local oder als Env-Var).
 * Ausführen:  npx tsx scripts/seed.ts
 *
 * Reihenfolge respektiert die FK-Abhängigkeiten. Bestehende Zeilen mit
 * gleicher ID werden übersprungen (onConflictDoNothing) — also idempotent.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import {
  mockLeads,
  mockActivities,
  mockAudits,
  mockTriggers,
  mockAppointments,
  mockProjects,
  mockTasks,
  mockInvoices,
  mockCalls,
  MOCK_OWNER_ID,
  STREAK,
} from "../src/lib/mock/data";

// Mock-IDs (z.B. "lead-00000001-…") sind keine gültigen UUIDs. Wir mappen sie
// deterministisch (md5 → UUID-Form) — gleiche Eingabe ergibt immer dieselbe UUID,
// damit Fremdschlüssel (leadId/projectId/…) konsistent bleiben.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uid(s: string | null | undefined): string | null {
  if (s == null) return s ?? null;
  if (UUID_RE.test(s)) return s;
  const h = createHash("md5").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
const ID_KEYS = ["id", "leadId", "projectId", "convertedInvoiceId"];
function remap<T>(rows: T[]): T[] {
  return rows.map((r) => {
    const o = { ...(r as Record<string, unknown>) };
    for (const k of ID_KEYS) {
      if (k in o && typeof o[k] === "string") o[k] = uid(o[k] as string);
    }
    return o as T;
  });
}

// .env.local laden (falls vorhanden), ohne Zusatz-Dependency
function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
    const txt = readFileSync(".env.local", "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* keine .env.local — egal */
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL fehlt. Erst Supabase verbinden (.env.local), dann erneut.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log("→ Seede Mock-Daten in die DB …");

  // Settings (Single-Tenant) — Streak aus den Mock-Werten
  await db
    .insert(schema.settings)
    .values({
      ownerId: MOCK_OWNER_ID,
      streakDays: STREAK.current,
      streakRecord: STREAK.record,
    })
    .onConflictDoNothing();

  // FK-Reihenfolge: leads zuerst, dann Kinder. IDs → gültige UUIDs gemappt.
  await db.insert(schema.leads).values(remap(mockLeads)).onConflictDoNothing();
  await db.insert(schema.activities).values(remap(mockActivities)).onConflictDoNothing();
  await db.insert(schema.calls).values(remap(mockCalls)).onConflictDoNothing();
  await db.insert(schema.appointments).values(remap(mockAppointments)).onConflictDoNothing();
  await db.insert(schema.audits).values(remap(mockAudits)).onConflictDoNothing();
  await db.insert(schema.triggerEvents).values(remap(mockTriggers)).onConflictDoNothing();
  await db.insert(schema.projects).values(remap(mockProjects)).onConflictDoNothing();
  await db.insert(schema.tasks).values(remap(mockTasks)).onConflictDoNothing();
  await db.insert(schema.invoices).values(remap(mockInvoices)).onConflictDoNothing();

  console.log(
    `✓ Fertig: ${mockLeads.length} Leads, ${mockProjects.length} Projekte, ${mockTasks.length} Tasks, ${mockInvoices.length} Belege, ${mockCalls.length} Anrufe, ${mockAppointments.length} Termine.`,
  );
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed fehlgeschlagen:", err);
  process.exit(1);
});
