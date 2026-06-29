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
import { getSessionUser } from "@/lib/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const user = (await getSessionUser())!;
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
    const { eq, and, sql } = await import("drizzle-orm");
    // Admin darf jeden Lead, Agent nur seine eigenen (IDOR-Schutz).
    const scope =
      user.role === "admin"
        ? eq(leads.id, id)
        : and(eq(leads.id, id), eq(leads.ownerId, user.id));

    // Vorher-Status (+ Lead-Owner) merken, um einen echten Status-Wechsel als
    // Activity zu protokollieren — owner = Lead-Besitzer, damit es in dessen
    // RLS-Timeline auftaucht (auch wenn ein Admin den Status dreht).
    let prevStatus: string | null = null;
    let leadOwnerId: string | null = null;
    if (body.status || body.dnc) {
      const [cur] = await db
        .select({ status: leads.status, ownerId: leads.ownerId })
        .from(leads)
        .where(scope);
      prevStatus = cur?.status ?? null;
      leadOwnerId = cur?.ownerId ?? null;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) patch.status = body.status;
    if (body.email !== undefined) patch.email = body.email;
    // Atomares Inkrement hat Vorrang (kein Lost-Update bei Stale/Doppel-Dispo).
    if (body.attemptsIncrement) {
      patch.attempts = sql`${leads.attempts} + 1`;
    } else if (typeof body.attempts === "number") {
      patch.attempts = body.attempts;
    }
    if (body.nextStep) patch.nextStep = body.nextStep;
    if (body.nextStepAt) {
      const d = new Date(body.nextStepAt);
      if (!isNaN(d.getTime())) patch.nextStepAt = d;
    }
    if (typeof body.locked === "boolean") patch.locked = body.locked;
    // Wartungs-Opt-in (MRR-Automat). Leerer Betrag/0-Intervall = ausschalten.
    if (body.maintenance !== undefined) {
      const m = body.maintenance;
      patch.maintenance =
        m === null || String(m).trim() === "" ? null : String(m);
    }
    if (body.maintenanceIntervalMonths !== undefined) {
      const iv = body.maintenanceIntervalMonths;
      patch.maintenanceIntervalMonths = iv && iv > 0 ? iv : null;
    }
    // ── Compliance / DNC + Erstkontakt-Rechtsgrundlage ──────────────
    if (typeof body.dnc === "boolean") {
      patch.dnc = body.dnc;
      if (body.dnc) {
        // DNC an → dauerhaft sperren (raus aus jeder Queue) + Zeitstempel.
        patch.locked = true;
        patch.dncAt = new Date();
        patch.dncReason = body.dncReason?.trim() || "Manuell als DNC markiert";
      } else {
        patch.dncAt = null;
        patch.dncReason = null;
      }
    } else if (body.dncReason !== undefined) {
      patch.dncReason = body.dncReason?.trim() || null;
    }
    if (body.firstContactChannel !== undefined) {
      patch.firstContactChannel = body.firstContactChannel; // 'brief'|'telefon'|null
    }
    if (typeof body.consentDocumented === "boolean") {
      patch.consentDocumented = body.consentDocumented;
      patch.consentAt = body.consentDocumented ? new Date() : null;
    }
    if (body.consentSource !== undefined) {
      patch.consentSource = body.consentSource?.trim() || null;
    }
    if (body.note?.trim()) {
      const stamp = new Date().toLocaleDateString("de-DE");
      const entry = `[${stamp}] ${body.note.trim()}`;
      // Atomar anhängen statt read-modify-write (sonst Lost-Update bei
      // parallelem PATCH — eine Notiz würde überschrieben).
      patch.notes = sql`coalesce(${leads.notes} || E'\n', '') || ${entry}`;
    }

    await db.update(leads).set(patch).where(scope);

    // DNC-Setzung in die Timeline schreiben (defensiv).
    if (body.dnc === true) {
      try {
        const { activities } = await import("@/db/schema");
        await db.insert(activities).values({
          ownerId: leadOwnerId ?? user.id,
          leadId: id,
          type: "status_change" as never,
          title: "🚫 Nicht mehr anrufen (DNC) gesetzt",
          payload: {
            dnc: true,
            reason: patch.dncReason ?? body.dncReason ?? null,
          },
        });
      } catch (e) {
        console.error("[leads/[id] PATCH] DNC-Activity:", e);
      }
    }

    // Status-Wechsel in die Lead-Timeline schreiben (nur bei echter Änderung).
    // Defensiv — darf das Update nie kippen.
    if (body.status && body.status !== prevStatus) {
      try {
        const { activities } = await import("@/db/schema");
        await db.insert(activities).values({
          ownerId: leadOwnerId ?? user.id,
          leadId: id,
          type: "status_change" as never,
          title: `Status: ${prevStatus ?? "—"} → ${body.status}`,
          payload: { from: prevStatus, to: body.status },
        });
      } catch (e) {
        console.error("[leads/[id] PATCH] status_change-Activity:", e);
      }
    }

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

  const user = (await getSessionUser())!;
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
      .where(
        user.role === "admin"
          ? eq(leads.id, id)
          : and(eq(leads.id, id), eq(leads.ownerId, user.id)),
      )
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
