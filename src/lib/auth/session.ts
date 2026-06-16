import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "agent" | "pending";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  approved: boolean;
};

/**
 * Liefert den eingeloggten Nutzer inkl. Rolle/Freigabe — oder null.
 * supabase.auth.getUser() validiert das JWT serverseitig (nicht getSession,
 * das dem Client vertrauen würde). Das Profil wird server-intern geladen.
 *
 * Per React cache() pro Request dedupliziert: auch wenn Layout + mehrere
 * store-Funktionen + die Route ihn abfragen, läuft die Auflösung nur einmal.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fallback: SessionUser = {
    id: user.id,
    email: user.email ?? "",
    name: null,
    role: "pending",
    approved: false,
  };

  try {
    const { db } = await import("@/db");
    const { profiles } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [p] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (!p) return fallback;
    return {
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      approved: p.approved,
    };
  } catch {
    return fallback;
  }
});
