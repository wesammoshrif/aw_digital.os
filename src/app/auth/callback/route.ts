/**
 * GET /auth/callback — Supabase-Auth-Rückleitung.
 *
 * Ziel des Bestätigungs-Links (E-Mail-Confirm) bzw. OAuth-Redirects. Tauscht den
 * `code` gegen eine Session (setzt die Auth-Cookies), stellt das Profil sicher
 * (idempotent, Rolle aus ADMIN_EMAILS) und leitet weiter.
 *
 * Ohne diese Route würde der Bestätigungslink ins Leere laufen, sobald in
 * Supabase „Confirm email" aktiv ist.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensureProfile";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await ensureProfile(user);
  } catch (err) {
    // Profil-Anlage darf den Login nicht blockieren — beim nächsten Request
    // greift das Layout/Pending erneut.
    console.error("[auth/callback] ensureProfile:", err);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
