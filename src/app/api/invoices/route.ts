/**
 * POST /api/invoices — Anlegen eines Angebots oder einer Rechnung aus dem Neu-Formular.
 * Ohne DATABASE_URL: 503 mit klarer Meldung (Demo-Modus).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isMockMode } from "@/lib/mode";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { invoiceCreateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const parsed = await parseJson(req, invoiceCreateSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (
    !body.leadId.toString().trim() ||
    !body.invoiceNumber.toString().trim() ||
    body.amount === undefined ||
    body.amount === null ||
    body.amount.toString().trim() === ""
  ) {
    return NextResponse.json(
      { ok: false, error: "Lead-ID, Belegnummer und Betrag sind Pflicht." },
      { status: 400 },
    );
  }

  if (isMockMode) {
    return NextResponse.json(
      {
        ok: false,
        mock: true,
        message: "Demo-Modus: ohne DATABASE_URL wird nicht gespeichert.",
      },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { invoices, leads } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    // Owner-Check: nur an eigene Leads anhängen (raw db umgeht RLS).
    const leadId = body.leadId.toString().trim();
    const [owned] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        user.role === "admin"
          ? eq(leads.id, leadId)
          : and(eq(leads.id, leadId), eq(leads.ownerId, user.id)),
      )
      .limit(1);
    if (!owned) {
      return NextResponse.json(
        { ok: false, error: "Lead nicht gefunden." },
        { status: 404 },
      );
    }

    const [row] = await db
      .insert(invoices)
      .values({
        ownerId: user.id,
        leadId,
        invoiceNumber: body.invoiceNumber.toString().trim(),
        kind: (body.kind ?? "quote") as "quote" | "invoice",
        type: (body.type ?? "one_time") as
          | "one_time"
          | "deposit"
          | "recurring_maintenance"
          | "recurring_hosting",
        status: (body.status ?? "draft") as
          | "draft"
          | "sent"
          | "paid"
          | "overdue"
          | "cancelled"
          | "accepted"
          | "declined",
        amount: String(body.amount),
        currency: "EUR",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes?.toString().trim() || null,
      })
      .returning({ id: invoices.id });

    if (!row) {
      return NextResponse.json({ ok: false, error: "Insert ohne Ergebnis" }, { status: 500 });
    }

    // Funnel mitführen: Angebot → proposal, direkt erstellte Rechnung → won.
    // (Defensiv, darf den Insert nicht kippen.)
    const kind = (body.kind ?? "quote") as "quote" | "invoice";
    const num = body.invoiceNumber.toString().trim();
    const { advanceLeadStatus } = await import("@/lib/funnel");
    await advanceLeadStatus(
      leadId,
      kind === "invoice" ? "won" : "proposal",
      `${kind === "invoice" ? "Rechnung" : "Angebot"} ${num} angelegt`,
    );

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return serverError("invoices POST", err);
  }
}
