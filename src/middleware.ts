import { NextRequest, NextResponse } from "next/server";
import { verifyBasicAuth } from "@/lib/auth";

/**
 * Zugangs-Gate für den Deploy (HTTP Basic Auth) — erste Verteidigungslinie.
 * Die Route-Handler prüfen zusätzlich selbst (requireAuth, Defense-in-Depth).
 *
 * - In Production OHNE `APP_PASSWORD` → 503 (fail-closed), App bleibt zu.
 * - Lokale Entwicklung (NODE_ENV !== production, kein Passwort) → kein Gate.
 * - Brute-Force-Schutz: In-Memory-Rate-Limit pro IP (reicht für Single-Container).
 * - Cron ist im matcher ausgenommen (schützt sich via CRON_SECRET).
 */

const WINDOW_MS = 5 * 60_000; // 5 Minuten
const MAX_FAILS = 10; // danach 429
const fails = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, now: number): boolean {
  const e = fails.get(ip);
  if (!e || now > e.resetAt) return false;
  return e.count >= MAX_FAILS;
}
function recordFail(ip: string, now: number) {
  const e = fails.get(ip);
  if (!e || now > e.resetAt) fails.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else e.count++;
  // Defensiv gegen unbegrenztes Wachstum der Map.
  if (fails.size > 5000) {
    for (const [k, v] of fails) if (now > v.resetAt) fails.delete(k);
  }
}

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // ── Fail-closed: Production ohne Passwort = komplett dicht ──
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Server misconfiguration: APP_PASSWORD missing.",
        { status: 503 },
      );
    }
    return NextResponse.next(); // dev: kein Gate
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();

  if (isRateLimited(ip, now)) {
    return new NextResponse("Zu viele Fehlversuche. Bitte später erneut.", {
      status: 429,
      headers: { "Retry-After": "300" },
    });
  }

  const expectedUser = process.env.APP_USER || "aw";
  if (verifyBasicAuth(req.headers.get("authorization"), expectedUser, password)) {
    fails.delete(ip);
    return NextResponse.next();
  }

  recordFail(ip, now);
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
