/**
 * Clear-Script — löscht ALLE Daten aus der DB (Schema bleibt).
 * Für den Übergang von Demo/Mock zu Production: leerer, sauberer Start.
 *
 * Ausführen:  npx tsx scripts/clear.ts
 * Voraussetzung: DATABASE_URL gesetzt (.env.local).
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

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
    console.error("❌ DATABASE_URL fehlt. (.env.local) — nichts gelöscht.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  console.log("→ Lösche alle Daten (Schema bleibt erhalten) …");

  // CASCADE räumt FK-Abhängigkeiten in einem Rutsch ab.
  await sql`TRUNCATE TABLE
    invoices, tasks, projects, audits, appointments, calls,
    activities, trigger_events, scrape_runs, leads, settings
    RESTART IDENTITY CASCADE`;

  console.log("✓ Alle Daten gelöscht — die DB ist jetzt production-clean (leer).");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Löschen fehlgeschlagen:", err);
  process.exit(1);
});
