/**
 * GET /api/sip/config
 *
 * Gibt die easybell-SIP-Konfiguration an den Browser-Softphone.
 *
 * Für Single-User-Self-Hosting akzeptabel — sobald Auth dran ist,
 * sollte hier ein Auth-Check + kurzlebige Tokens stehen.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // ── Bevorzugt: eigene Asterisk-Brücke (echtes In-Browser-Telefonieren) ──
  // Asterisk registriert den easybell-TRUNK und bietet dem Browser ein WSS-
  // Gateway — das, was easybell selbst nicht hergibt (Vapi-Nachbau).
  if (
    process.env.ASTERISK_WSS &&
    process.env.ASTERISK_SIP_USER &&
    process.env.ASTERISK_SIP_PASSWORD
  ) {
    return NextResponse.json({
      ok: true,
      via: "asterisk",
      cfg: {
        username: process.env.ASTERISK_SIP_USER,
        password: process.env.ASTERISK_SIP_PASSWORD,
        registrar: process.env.ASTERISK_SIP_DOMAIN ?? "",
        wss: process.env.ASTERISK_WSS,
        displayName: process.env.EASYBELL_SIP_DISPLAYNAME ?? "AW Digital",
        clip: process.env.EASYBELL_CLIP ?? null,
      },
    });
  }

  // ── Fallback: easybell direkt (nur falls easybell je ein WSS-Gateway böte) ──
  const cfg = {
    username: process.env.EASYBELL_SIP_USERNAME ?? null,
    password: process.env.EASYBELL_SIP_PASSWORD ?? null,
    registrar: process.env.EASYBELL_SIP_REGISTRAR ?? null,
    wss: process.env.EASYBELL_SIP_WSS ?? "wss://webrtc.easybell.de:7443",
    displayName: process.env.EASYBELL_SIP_DISPLAYNAME ?? "AW Digital",
    clip: process.env.EASYBELL_CLIP ?? null,
  };

  if (!cfg.username || !cfg.password || !cfg.registrar) {
    return NextResponse.json({
      ok: false,
      message:
        "Keine Telefonie konfiguriert — ASTERISK_WSS/USER/PASSWORD (Brücke) oder EASYBELL_SIP_* in .env.local setzen.",
    });
  }

  return NextResponse.json({ ok: true, via: "easybell", cfg });
}
