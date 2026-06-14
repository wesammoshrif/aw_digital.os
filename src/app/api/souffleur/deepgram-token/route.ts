/**
 * POST /api/souffleur/deepgram-token
 *
 * Liefert dem Browser einen Token für die Deepgram-Live-Transkription.
 *
 * Reihenfolge (sicher zuerst):
 *  1) /auth/grant → kurzlebiger Token (braucht einen Owner/Admin-Key).
 *  2) Nur wenn DEEPGRAM_ALLOW_RAW_KEY=true: Roh-Key an den Browser
 *     (UNSICHER, nur für lokale Tests — Key ist dann in der Netzwerkkonsole
 *     sichtbar). NIEMALS in Production setzen.
 *  3) Sonst: ok:false mit klarer Handlungsanweisung.
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

  // 1) Sicherster Weg: kurzlebigen Token minten (Owner/Admin-Key nötig).
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
    console.error(
      "[deepgram-token] /auth/grant fehlgeschlagen (Status " +
        res.status +
        "). Vermutlich Member-Key statt Owner-Key (keys:write fehlt).",
    );
  } catch (err) {
    console.error("[deepgram-token] /auth/grant nicht erreichbar", err);
  }

  // 2) Ausdrücklicher Test-Notausgang (opt-in). Standard: AUS.
  if (process.env.DEEPGRAM_ALLOW_RAW_KEY === "true") {
    console.warn(
      "[deepgram-token] DEEPGRAM_ALLOW_RAW_KEY=true → Roh-Key geht an den " +
        "Browser. NUR für lokales Testen, NICHT in Production.",
    );
    return NextResponse.json({ ok: true, token: key, fallback: true });
  }

  // 3) Sicher per Default: keine Transkription, klare Anweisung.
  return NextResponse.json({
    ok: false,
    message:
      "Transkription aus: Dein DEEPGRAM_API_KEY hat nur Member-Rechte. " +
      "Erstelle in der Deepgram-Console einen Owner/Admin-Key (dann mintet " +
      "/auth/grant sichere Kurzzeit-Tokens) — oder setze für lokale Tests " +
      "DEEPGRAM_ALLOW_RAW_KEY=true.",
  });
}
