import "server-only";
import { isAdminEmail } from "@/lib/auth/admins";

/**
 * Legt das Profil eines frisch registrierten/bestätigten Nutzers an (idempotent).
 * Rolle aus ADMIN_EMAILS: Admin-Mail → admin + freigegeben, sonst → pending.
 *
 * Insert läuft bewusst über die (Superuser-)db, nicht über RLS: ein brandneuer
 * Admin ist noch nicht is_admin(), die RLS-Insert-Policy würde role=admin sonst
 * ablehnen. Wird sowohl von /api/auth/profile (Signup ohne Confirm) als auch von
 * /auth/callback (Signup MIT E-Mail-Bestätigung / OAuth) genutzt.
 */
export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: { name?: unknown } | null;
}): Promise<"admin" | "pending"> {
  const email = (user.email ?? "").toLowerCase();
  const admin = isAdminEmail(email);
  const name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;

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

  return admin ? "admin" : "pending";
}
