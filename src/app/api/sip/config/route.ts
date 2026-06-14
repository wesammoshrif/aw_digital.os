/**
 * GET /api/sip/config
 *
 * Gibt die SIP-Konfiguration an das Browser-Softphone. Enthält Zugangsdaten,
 * daher hinter requireAuth (nur authentifizierte Nutzer).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  // ── Bevorzugt: eigene Asterisk-Brücke (echtes In-Browser-Telefonieren) ──
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
