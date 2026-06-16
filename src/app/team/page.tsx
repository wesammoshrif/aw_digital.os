import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Shell } from "@/components/Shell";
import { TeamManager } from "@/components/TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/");

  const { db } = await import("@/db");
  const { profiles } = await import("@/db/schema");
  const { desc } = await import("drizzle-orm");

  const rows = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  const users = rows.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    approved: p.approved,
  }));

  return (
    <Shell title="Team" eyebrow="Mitarbeiter & Freigaben">
      <TeamManager users={users} meId={me.id} />
    </Shell>
  );
}
