/**
 * Drizzle client — Supabase Postgres connection.
 *
 * Lazy initialisation: nur wenn DATABASE_URL gesetzt ist UND `db`
 * tatsächlich genutzt wird. Build-Zeit-fest, damit die Routen ohne
 * Supabase kompilieren.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbClient | null = null;

function getDb(): DbClient {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — DB-backed routes need a live Supabase connection. Set .env.local.",
    );
  }
  // max:1 serialisierte JEDE withRls-Transaktion (Promise.all brachte nichts,
  // überlappende Navigationen stauten sich). 8 erlaubt echte Parallelität;
  // prepare:false ist für den Supabase-Pooler Pflicht.
  const client = postgres(url, { prepare: false, max: 8 });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as DbClient, {
  get(_, key) {
    return Reflect.get(getDb(), key);
  },
});
export { schema };
