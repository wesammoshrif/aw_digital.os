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

  const patch =
    action === "approve"
      ? { role: "agent" as const, approved: true }
      : action === "makeAdmin"
        ? { role: "admin" as const, approved: true }
        : action === "makeAgent"
          ? { role: "agent" as const, approved: true }
          : { approved: false }; // deactivate

  try {
    const { profiles } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await withRls(me, async (tx) => {
      await tx
        .update(profiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(profiles.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json(
      { ok: false, error: "Aktion fehlgeschlagen." },
      { status: 500 },
    );
  }
}
