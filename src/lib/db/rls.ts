import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { SessionUser } from "@/lib/auth/session";

/** Transaktions-Handle, wie es withRls an die Query-Funktion übergibt. */
export type RlsTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Führt Drizzle-Queries als der eingeloggte Nutzer aus, damit RLS greift.
 *
 * Die DB-Verbindung läuft normal als postgres (Pooler) und umgeht RLS. Hier
 * öffnen wir eine Transaktion, setzen die JWT-Claims (sub + app_role) und
 * wechseln auf die Rolle `authenticated` — ab da greifen die Policies:
 *   - Agent sieht/ändert nur owner_id = auth.uid()
 *   - Admin (app_role=admin) sieht alles (is_admin())
 * Nach COMMIT ist die Verbindung wieder postgres (set local).
 */
export async function withRls<T>(
  user: Pick<SessionUser, "id" | "role">,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: user.id,
      role: "authenticated",
      app_role: user.role,
    });
    // Claims setzen (noch als postgres), dann auf authenticated wechseln.
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
