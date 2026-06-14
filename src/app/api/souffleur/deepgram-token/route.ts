/**
 * POST /api/souffleur/deepgram-token
 *
 * Mintet einen kurzlebigen Deepgram-Token für die Browser-WebSocket-
 * Verbindung. Der echte DEEPGRAM_API_KEY verlässt NIEMALS den Server —
 * schlägt /auth/grant fehl, läuft der Souffleur lokal weiter (Mic + Playbook).
 *
 * Hinter requireAuth: nur authentifizierte Nutzer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message:
        "Kunden-Transkription inaktiv — DEEPGRAM_API_KEY in .env.local setzen.",
    });
  }

  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });

    if (res.ok) {
      const data = (await res.json()) as { access_token: string };
      return NextResponse.json({ ok: true, token: data.access_token });
    }

    // KEIN Roh-Key-Fallback mehr — der Account-Key würde sonst im Browser landen.
    console.error(
      "[deepgram-token] /auth/grant fehlgeschlagen (Status " + res.status + ")",
    );
    return NextResponse.json({
      ok: false,
      message:
        "Transkription momentan nicht verfügbar (Deepgram-Grant fehlgeschlagen). Der Souffleur läuft lokal weiter.",
    });
  } catch (err) {
    console.error("[deepgram-token] /auth/grant nicht erreichbar", err);
    return NextResponse.json({
      ok: false,
      message:
        "Transkription momentan nicht erreichbar. Der Souffleur läuft lokal weiter.",
    });
  }
}
