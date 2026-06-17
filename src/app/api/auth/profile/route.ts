/**
 * POST /api/auth/profile — legt das Profil des eingeloggten Nutzers an
 * (idempotent). Die Rolle wird serverseitig aus ADMIN_EMAILS bestimmt:
 * Admin-Mails → admin + freigegeben, alle anderen → pending.
 *
 * Insert läuft bewusst über die (Superuser-)db, nicht über RLS: ein brandneuer
 * Admin ist noch nicht is_admin(), die RLS-Insert-Policy würde role=admin sonst
 * ablehnen. Der User ist per getUser() validiert, die Rolle kommt aus dem Env.
 */

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensureProfile";

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const role = await ensureProfile(user);
    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error("[auth/profile]", err);
    return NextResponse.json(
      { ok: false, error: "Profil konnte nicht angelegt werden." },
      { status: 500 },
    );
  }
}
