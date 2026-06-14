/**
 * API-Helfer für Route-Handler: Defense-in-Depth-Auth, Same-Origin-Schutz,
 * einheitliche Fehlerausgabe (ohne Roh-Fehler an den Client) und
 * Zod-Eingabevalidierung.
 *
 * Nutzung in jedem daten-führenden Handler:
 *   const denied = requireAuth(req);
 *   if (denied) return denied;
 */

import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { verifyBasicAuth } from "./auth";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function unauthorized(): NextResponse {
  return new NextResponse("Anmeldung erforderlich.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AW Digital OS", charset="UTF-8"',
    },
  });
}

/**
 * Blockt zustandsändernde Cross-Origin-Requests (Origin-Host != Request-Host).
 * Lese-Requests und Requests ohne Origin-Header (z.B. Server-zu-Server) passieren.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  if (!MUTATING.has(req.method)) return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("host");
    if (host && originHost !== host) {
      return new NextResponse("Cross-origin request blocked.", { status: 403 });
    }
  } catch {
    return new NextResponse("Invalid origin.", { status: 403 });
  }
  return null;
}

/**
 * Zweite Verteidigungslinie hinter der Middleware. Prüft Basic-Auth erneut
 * direkt im Handler (falls die Middleware umgangen/fehlkonfiguriert ist) und
 * setzt den Same-Origin-Schutz für mutierende Methoden durch.
 *
 * Rückgabe: NextResponse (= abgelehnt, direkt zurückgeben) oder null (= ok).
 */
export function requireAuth(req: NextRequest): NextResponse | null {
  const password = process.env.APP_PASSWORD;

  // Fail-closed: in Production MUSS ein Passwort gesetzt sein.
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Server misconfiguration: APP_PASSWORD missing.", {
        status: 503,
      });
    }
    return null; // lokale Entwicklung: offen
  }

  const expectedUser = process.env.APP_USER || "aw";
  if (
    !verifyBasicAuth(req.headers.get("authorization"), expectedUser, password)
  ) {
    return unauthorized();
  }

  return assertSameOrigin(req);
}

/** Einheitliche 500-Antwort: Details serverseitig loggen, dem Client nur generisch. */
export function serverError(context: string, err: unknown): NextResponse {
  console.error(`[${context}]`, err);
  return NextResponse.json(
    { ok: false, error: "Interner Serverfehler." },
    { status: 500 },
  );
}

/** Einheitliche 400-Antwort. */
export function badRequest(message = "Ungültige Eingabe."): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

/**
 * Liest und validiert den JSON-Body gegen ein Zod-Schema.
 * Bei Erfolg: { data }. Bei Fehler: { response } (400) zum direkten Zurückgeben.
 */
export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<{ data: T; response?: undefined } | { data?: undefined; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: badRequest("Body ist kein gültiges JSON.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path?.join(".") || "body";
    return { response: badRequest(`Validierung fehlgeschlagen: ${where}`) };
  }
  return { data: result.data };
}
