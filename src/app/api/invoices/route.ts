/**
 * POST /api/invoices — Anlegen eines Angebots oder einer Rechnung aus dem Neu-Formular.
 * Ohne DATABASE_URL: 503 mit klarer Meldung (Demo-Modus).
 */

import { NextRequest, NextResponse } from "next/server";
import { OWNER_ID } from "@/lib/utils";
import { isMockMode } from "@/lib/mode";

interface NewInvoiceInput {
  leadId?: string;
  invoiceNumber?: string;
  kind?: "quote" | "invoice";
  type?: string;
  amount?: string | number;
  status?: string;
  dueDate?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as NewInvoiceInput;

  if (
    !body.leadId?.toString().trim() ||
    !body.invoiceNumber?.toString().trim() ||
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
    const { invoices } = await import("@/db/schema");
    const ownerId = req.headers.get("x-owner-id") ?? OWNER_ID;

    const [row] = await db
      .insert(invoices)
      .values({
        ownerId,
        leadId: body.leadId!.toString().trim(),
        invoiceNumber: body.invoiceNumber!.toString().trim(),
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
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
