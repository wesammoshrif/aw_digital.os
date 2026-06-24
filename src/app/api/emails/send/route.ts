/**
 * POST /api/emails/send — Verkäufer schickt aus dem Cockpit eine Follow-up-Mail
 * an den Lead. Nutzt die bestehende sendEmail()-Funktion (Resend, No-Op ohne
 * Key). Empfänger wird IMMER aus der DB geladen (nie aus dem Client-Body →
 * kein offener Relay). Werbe-Mails nur mit dokumentierter Einwilligung aus dem
 * Anruf (UWG §7). Jeder Versand wird als activity (type=email) protokolliert.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { emailSendSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { EMAIL_KIND_IS_AD } from "@/lib/email/templates";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const parsed = await parseJson(req, emailSendSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true, sent: false });
  }

  const leadId = body.leadId.trim();
  if (!UUID_RE.test(leadId)) {
    return NextResponse.json({ ok: false, error: "Ungültige Lead-ID" }, { status: 400 });
  }

  // Werbe-Mail braucht die im Anruf erteilte Einwilligung (UWG §7).
  if (EMAIL_KIND_IS_AD[body.kind] && body.consentFromCall !== true) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Einwilligung fehlt: Werbe-Mails nur, wenn der Kunde im Anruf um die Zusendung gebeten hat.",
      },
      { status: 422 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { leads, activities } = await import("@/db/schema");
    const { and, eq, desc } = await import("drizzle-orm");

    // IDOR-Schutz + Empfänger aus der DB (nicht aus dem Body).
    const scope =
      user.role === "admin"
        ? eq(leads.id, leadId)
        : and(eq(leads.id, leadId), eq(leads.ownerId, user.id));
    const [lead] = await db
      .select({ id: leads.id, email: leads.email, company: leads.company })
      .from(leads)
      .where(scope)
      .limit(1);
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
    }
    const to = lead.email?.trim();
    if (!to) {
      return NextResponse.json(
        { ok: false, error: "Lead hat keine E-Mail-Adresse hinterlegt." },
        { status: 422 },
      );
    }

    // Idempotenz: identischer Schnell-Doppelklick (letzte Mail < 10s) abblocken.
    const [last] = await db
      .select({ createdAt: activities.createdAt })
      .from(activities)
      .where(and(eq(activities.leadId, leadId), eq(activities.type, "email")))
      .orderBy(desc(activities.createdAt))
      .limit(1);
    if (last?.createdAt && Date.now() - new Date(last.createdAt).getTime() < 10_000) {
      return NextResponse.json(
        { ok: false, error: "Gerade eben schon eine Mail an diesen Lead gesendet." },
        { status: 429 },
      );
    }

    const result = await sendEmail({
      to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    });

    // Versand IMMER protokollieren (auch No-Op/Fehler → Nachvollziehbarkeit +
    // Einwilligungs-Nachweis). type=email aktiviert die vorhandene Aktivitätsart.
    await db.insert(activities).values({
      ownerId: user.id,
      leadId,
      type: "email" as never,
      title: body.subject,
      payload: {
        kind: body.kind,
        sent: result.sent,
        reason: result.reason ?? null,
        consentBasis: EMAIL_KIND_IS_AD[body.kind]
          ? "telefonische Anfrage"
          : "Termin-Bestätigung",
        callId: body.callId ?? null,
      },
    });

    return NextResponse.json({ ok: true, sent: result.sent, reason: result.reason });
  } catch (err) {
    return serverError("emails/send POST", err);
  }
}
