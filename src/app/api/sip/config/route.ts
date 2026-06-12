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
  const cfg = {
    username: process.env.EASYBELL_SIP_USERNAME ?? null,
    password: process.env.EASYBELL_SIP_PASSWORD ?? null,
    registrar: process.env.EASYBELL_SIP_REGISTRAR ?? null,
    wss:
      process.env.EASYBELL_SIP_WSS ??
      "wss://webrtc.easybell.de:7443",
    displayName: process.env.EASYBELL_SIP_DISPLAYNAME ?? "AW Digital",
    clip: process.env.EASYBELL_CLIP ?? null,
  };

  if (!cfg.username || !cfg.password || !cfg.registrar) {
    return NextResponse.json({
      ok: false,
      message:
        "SIP-Zugangsdaten fehlen — EASYBELL_SIP_USERNAME/PASSWORD/REGISTRAR in .env.local setzen.",
    });
  }

  return NextResponse.json({ ok: true, cfg });
}
