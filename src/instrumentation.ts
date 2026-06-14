/**
 * Boot-Check (läuft einmal beim Serverstart, nicht beim Build).
 *
 * Fail-closed: Startet die App in Production ohne `APP_PASSWORD`, ist sie
 * ungeschützt öffentlich. Das wird hier lautstark als Fehler signalisiert.
 * Die Middleware blockt zusätzlich jeden Request mit 503.
 */
export async function register() {
  if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) {
    throw new Error(
      "[boot] APP_PASSWORD ist in Production NICHT gesetzt. Abbruch — die App " +
        "waere sonst ohne jeden Schutz oeffentlich erreichbar. APP_PASSWORD im " +
        "Deploy-Env setzen (siehe DEPLOY.md).",
    );
  }
  if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
    console.error(
      "[boot] WARNUNG: CRON_SECRET ist in Production nicht gesetzt. Der " +
        "Cron-Endpoint /api/cron/tick lehnt Aufrufe dann ab (fail-closed).",
    );
  }
}
