/**
 * PATCH /api/admin/users — Admin-Aktionen auf Mitarbeiter.
 * Body: { id: uuid, action: "approve"|"makeAdmin"|"makeAgent"|"deactivate" }
 *
 * Läuft über withRls(adminUser): so sieht die RLS-Policy UND der
 * Eskalations-Trigger den Admin (is_admin()=true) und lässt role/approved
 * ändern. Nur Rolle=admin darf hier rein.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db/rls";

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "makeAdmin", "makeAgent", "deactivate"]),
});

export async function PATCH(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Nur Admins." }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }
  const { id, action } = parsed.data;

  // Sich selbst nicht herabstufen/sperren (kein Aussperren).
  if (id === me.id && (action === "deactivate" || action === "makeAgent")) {
    return NextResponse.json(
      { ok: false, error: "Dich selbst kannst du nicht herabstufen oder sperren." },
      { status: 400 },
    );
  }

  try {
    const { profiles } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await withRls(me, async (tx) => {
      // Letzten Admin schützen: ein admin darf nicht herabgestuft/gesperrt
      // werden, wenn er der einzige freigegebene Admin ist (Aussperr-Schutz
      // auch über die Selbst-Sperre hinaus).
      if (action === "makeAgent" || action === "deactivate") {
        const [target] = await tx
          .select({ role: profiles.role })
          .from(profiles)
          .where(eq(profiles.id, id))
          .limit(1);
        if (target?.role === "admin") {
          const admins = await tx
            .select({ id: profiles.id })
            .from(profiles)
            .where(and(eq(profiles.role, "admin"), eq(profiles.approved, true)));
          if (admins.length <= 1) throw new Error("LAST_ADMIN");
        }
      }

      let patch: { role?: "admin" | "agent"; approved: boolean };
      if (action === "approve") {
        // Freigeben/Reaktivieren: pending → agent, vorhandene Rolle
        // (Admin/Agent) bleibt erhalten — kein stilles Degradieren.
        const [cur] = await tx
          .select({ role: profiles.role })
          .from(profiles)
          .where(eq(profiles.id, id))
          .limit(1);
        patch = {
          role: cur && cur.role !== "pending" ? cur.role : "agent",
          approved: true,
        };
      } else if (action === "makeAdmin") {
        patch = { role: "admin", approved: true };
      } else if (action === "makeAgent") {
        patch = { role: "agent", approved: true };
      } else {
        patch = { approved: false }; // deactivate
      }
      await tx
        .update(profiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(profiles.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "LAST_ADMIN") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Das ist der einzige Admin — vorher jemand anderen zum Admin machen.",
        },
        { status: 400 },
      );
    }
    console.error("[admin/users]", err);
    return NextResponse.json(
      { ok: false, error: "Aktion fehlgeschlagen." },
      { status: 500 },
    );
  }
}
