/**
 * POST /api/souffleur/deepgram-token
 *
 * Mintet einen kurzlebigen Deepgram-Token für die Browser-WebSocket-
 * Verbindung (damit der echte Key nicht im Client landet).
 * Fällt auf den Roh-Key zurück, falls /auth/grant nicht verfügbar ist
 * (Self-Hosting, Einzelnutzer — akzeptabel).
 *
 * Ohne DEEPGRAM_API_KEY → freundlicher Hinweis, der Souffleur läuft
 * weiter lokal (Mic + Playbook).
 */

import { NextResponse } from "next/server";

export async function POST() {
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
    // Fallback: Roh-Key (Single-User-Self-Hosting)
    console.warn(
      "[deepgram-token] /auth/grant fehlgeschlagen (Status " +
        res.status +
        ") — Roh-Key geht an den Browser. Nur für Single-User-Betrieb ok.",
    );
    return NextResponse.json({ ok: true, token: key, fallback: true });
  } catch {
    console.warn(
      "[deepgram-token] /auth/grant nicht erreichbar — Roh-Key geht an den Browser.",
    );
    return NextResponse.json({ ok: true, token: key, fallback: true });
  }
}
