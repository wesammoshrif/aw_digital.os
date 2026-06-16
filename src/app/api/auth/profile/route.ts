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
import { isAdminEmail } from "@/lib/auth/admins";

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  const email = (user.email ?? "").toLowerCase();
  const admin = isAdminEmail(email);
  const name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;

  try {
    const { db } = await import("@/db");
    const { profiles } = await import("@/db/schema");
    await db
      .insert(profiles)
      .values({
        id: user.id,
        email,
        name,
        role: admin ? "admin" : "pending",
        approved: admin,
      })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true, role: admin ? "admin" : "pending" });
  } catch (err) {
    console.error("[auth/profile]", err);
    return NextResponse.json(
      { ok: false, error: "Profil konnte nicht angelegt werden." },
      { status: 500 },
    );
  }
}
