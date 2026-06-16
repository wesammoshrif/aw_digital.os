/**
 * PATCH  /api/leads/[id] — Quick-Update einzelner Felder.
 * DELETE /api/leads/[id] — Löschung eines Leads (DSGVO Art. 17).
 *
 * Beide sind auf den Owner gescoped (eq id AND ownerId), damit fremde
 * Datensätze nicht über die rohe ID erreichbar sind (IDOR-Schutz).
 *
 * ⚠️ DELETE kaskadiert laut Schema auf activities, calls, appointments,
 *    projects und invoices dieses Leads. Bei steuerrelevanten Belegen die
 *    Aufbewahrungspflicht (§147 AO) beachten (siehe SICHERHEIT.md).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { leadPatchSchema } from "@/lib/validation";
import { OWNER_ID } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const parsed = await parseJson(req, leadPatchSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  // Kein DB verbunden → optimistic UI im Client genügt.
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true, id, ...body });
  }

  try {
    const { db } = await import("@/db");
    const { leads } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const scope = and(eq(leads.id, id), eq(leads.ownerId, OWNER_ID));

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) patch.status = body.status;
    if (typeof body.attempts === "number") patch.attempts = body.attempts;
    if (body.nextStep) patch.nextStep = body.nextStep;
    if (body.nextStepAt) {
      const d = new Date(body.nextStepAt);
      if (!isNaN(d.getTime())) patch.nextStepAt = d;
    }
    if (typeof body.locked === "boolean") patch.locked = body.locked;
    if (body.note?.trim()) {
      // Notiz anhängen statt überschreiben
      const [row] = await db
        .select({ notes: leads.notes })
        .from(leads)
        .where(scope);
      const stamp = new Date().toLocaleDateString("de-DE");
      const entry = `[${stamp}] ${body.note.trim()}`;
      patch.notes = row?.notes ? `${row.notes}\n${entry}` : entry;
    }

    await db.update(leads).set(patch).where(scope);

    // Abschluss-Automatik: Lead auf "won" → automatisch ein Projekt anlegen,
    // falls noch keines für diesen Lead existiert. Darf das Status-Update
    // niemals scheitern lassen (defensiv).
    if (body.status === "won") {
      try {
        const { getProjectByLeadId, createProject } = await import("@/lib/store");
        const existing = await getProjectByLeadId(id);
        if (!existing) {
          const [lead] = await db
            .select({ company: leads.company })
            .from(leads)
            .where(scope);
          await createProject({
            leadId: id,
            name: `Website ${lead?.company ?? ""}`.trim(),
            status: "planning",
          });
        }
      } catch {
        // Projekt-Anlage ist optional – Fehler bewusst verschlucken.
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("leads/[id] PATCH", err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true, id });
  }

  try {
    const { db } = await import("@/db");
    const { leads } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const deleted = await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.ownerId, OWNER_ID)))
      .returning({ id: leads.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Lead nicht gefunden." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, id, deleted: deleted.length });
  } catch (err) {
    return serverError("leads/[id] DELETE", err);
  }
}
