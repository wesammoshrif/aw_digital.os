import { NextRequest, NextResponse } from "next/server";

/**
 * Zugangs-Gate für den Deploy (HTTP Basic Auth).
 *
 * Schützt die GESAMTE App + alle API-Routen, sobald `APP_PASSWORD` gesetzt ist.
 * Single-User-Tool → ein Passwort genügt; der Browser merkt sich die Anmeldung.
 *
 * - Ohne `APP_PASSWORD` (lokale Entwicklung) → kein Gate.
 * - Der Cron-Endpoint ist im matcher ausgenommen (er schützt sich via
 *   CRON_SECRET, weil Vercel-Cron ihn ohne Basic-Auth-Header aufruft).
 *
 * ⚠️ Für einen sicheren Production-Deploy MUSS `APP_PASSWORD` (z.B. in Vercel)
 *    gesetzt sein — sonst ist die App öffentlich erreichbar.
 */
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next(); // dev: kein Gate

  const expectedUser = process.env.APP_USER || "aw";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === expectedUser && pass === password) {
        return NextResponse.next();
      }
    } catch {
      /* fällt durch zum 401 */
    }
  }

  return new NextResponse("Anmeldung erforderlich.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AW Digital OS", charset="UTF-8"',
    },
  });
}

export const config = {
  // Alles schützen außer: Cron (CRON_SECRET), Next-Assets, statische Bilder.
  matcher: [
    "/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
