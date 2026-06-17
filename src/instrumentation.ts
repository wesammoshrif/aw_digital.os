/**
 * Boot-Check (läuft einmal beim Serverstart, nicht beim Build).
 *
 * Der Zugang ist seit der Multi-User-Umstellung über Supabase-Auth geregelt
 * (Login + Rollen + RLS), NICHT mehr über ein App-weites Basic-Auth-Passwort.
 * Deshalb prüfen wir hier fail-closed, dass die für Auth/DB nötige Konfiguration
 * vorhanden ist — sonst liefe die App in Production kaputt (Login/Datenzugriff).
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    throw new Error(
      `[boot] Pflicht-Env fehlt in Production: ${missing.join(", ")}. ` +
        "Ohne diese Werte funktioniert Login/Datenzugriff nicht. Im Deploy-Env " +
        "setzen (siehe GO-LIVE.md / DEPLOY.md).",
    );
  }

  if (!process.env.CRON_SECRET) {
    console.error(
      "[boot] WARNUNG: CRON_SECRET ist in Production nicht gesetzt. Der " +
        "Cron-Endpoint /api/cron/tick lehnt Aufrufe dann ab (fail-closed).",
    );
  }
  if (!process.env.ADMIN_EMAILS) {
    console.error(
      "[boot] WARNUNG: ADMIN_EMAILS ist leer — niemand wird bei der " +
        "Registrierung automatisch Admin. Mindestens eine Admin-Mail setzen.",
    );
  }
}
