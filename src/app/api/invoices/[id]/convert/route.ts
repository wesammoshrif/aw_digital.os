/**
 * POST /api/invoices/[id]/convert
 *
 * Wandelt ein angenommenes Angebot (kind = "quote") in eine Rechnung
 * (kind = "invoice") um. Owner-gescoped (IDOR-Schutz).
 * Im Mock-Modus ist die Umwandlung deaktiviert (kein Insert möglich).
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { OWNER_ID } from "@/lib/utils";
import { requireAuth, serverError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id } = await params;

  if (isMockMode) {
    return NextResponse.json(
      { ok: false, mock: true, message: "Demo: Umwandlung aktiv ab Supabase." },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const scope = and(eq(invoices.id, id), eq(invoices.ownerId, OWNER_ID));

    // Angebot laden (owner-gescoped)
    const [quote] = await db.select().from(invoices).where(scope).limit(1);

    if (!quote || quote.kind !== "quote") {
      return NextResponse.json(
        { ok: false, error: "Angebot nicht gefunden." },
        { status: 404 },
      );
    }

    // Belegnummer: AN-… → RE-…, sonst Suffix "-RE".
    const invoiceNumber = quote.invoiceNumber.startsWith("AN-")
      ? `RE-${quote.invoiceNumber.slice(3)}`
      : `${quote.invoiceNumber}-RE`;

    // Neue Rechnung anlegen
    const [created] = await db
      .insert(invoices)
      .values({
        ownerId: OWNER_ID,
        leadId: quote.leadId,
        projectId: quote.projectId,
        invoiceNumber,
        kind: "invoice",
        status: "draft",
        type: quote.type,
        amount: quote.amount,
        currency: quote.currency,
      })
      .returning({ id: invoices.id });

    if (!created) {
      return NextResponse.json(
        { ok: false, error: "Rechnung konnte nicht angelegt werden." },
        { status: 500 },
      );
    }

    // Angebot als angenommen markieren und verknüpfen (owner-gescoped)
    await db
      .update(invoices)
      .set({
        status: "accepted",
        convertedInvoiceId: created.id,
        updatedAt: new Date(),
      })
      .where(scope);

    return NextResponse.json({ ok: true, invoiceId: created.id });
  } catch (err) {
    return serverError("invoices/[id]/convert", err);
  }
}
