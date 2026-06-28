/**
 * PATCH /api/invoices/[id] — Status einer Rechnung/eines Angebots ändern.
 *
 * Vor allem: „Als bezahlt markieren" — setzt status=paid UND stempelt `paidAt`
 * (das vorher von keiner Route gesetzt wurde, weshalb die Umsatz-KPI strukturell
 * 0 blieb). Bezahlte Rechnung = gewonnener Deal → Funnel auf `won`.
 * Owner-gescoped (IDOR-Schutz); raw db umgeht RLS.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isMockMode } from "@/lib/mode";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { invoicePatchSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;
  const { id } = await params;

  const parsed = await parseJson(req, invoicePatchSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (isMockMode) {
    return NextResponse.json(
      { ok: false, mock: true, message: "Demo: Speichern aktiv ab Supabase." },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const scope =
      user.role === "admin"
        ? eq(invoices.id, id)
        : and(eq(invoices.id, id), eq(invoices.ownerId, user.id));

    const [inv] = await db
      .select({
        id: invoices.id,
        kind: invoices.kind,
        leadId: invoices.leadId,
        status: invoices.status,
        paidAt: invoices.paidAt,
        number: invoices.invoiceNumber,
      })
      .from(invoices)
      .where(scope)
      .limit(1);
    if (!inv) {
      return NextResponse.json(
        { ok: false, error: "Beleg nicht gefunden." },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = body.notes.trim() || null;
    if (body.dueDate) {
      const d = new Date(body.dueDate);
      if (!isNaN(d.getTime())) patch.dueDate = d;
    }
    // Bezahlt → paidAt setzen (nur falls noch nicht gestempelt).
    if (body.status === "paid" && !inv.paidAt) {
      patch.paidAt = new Date();
    }

    await db.update(invoices).set(patch).where(scope);

    // Bezahlte Rechnung = gewonnener Deal → Funnel mitziehen (defensiv).
    if (body.status === "paid" && inv.kind === "invoice") {
      const { advanceLeadStatus } = await import("@/lib/funnel");
      await advanceLeadStatus(inv.leadId, "won", `Rechnung ${inv.number} bezahlt`);
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("invoices/[id] PATCH", err);
  }
}
