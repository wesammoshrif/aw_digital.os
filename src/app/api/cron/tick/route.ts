/**
 * Automatik-Tick — wird von Vercel-Cron (stündlich) aufgerufen.
 *
 * Aufgaben:
 *  a) Fällige Termin-Erinnerungen per E-Mail versenden.
 *  b) (TODO) Wiederkehrende Wartungsrechnungen erzeugen.
 *
 * Schutz: optionaler Header `x-cron-secret` muss `CRON_SECRET` matchen.
 * Mock-Modus (ohne DATABASE_URL): schreibt NICHTS, liefert nur eine Vorschau.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import { sendEmail } from "@/lib/email";
import { listAppointments, listInvoices, nowAnchor } from "@/lib/store";
import { timingSafeEqualStr } from "@/lib/auth";

const RECURRING_TYPES = ["recurring_maintenance", "recurring_hosting"];

async function handle(req: NextRequest) {
  // ── Schutz: x-cron-secret ODER „Authorization: Bearer …" (timing-safe) ──
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail-closed: in Production MUSS ein CRON_SECRET gesetzt sein.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }
    // lokale Entwicklung: ohne Secret erlaubt
  } else {
    const headerSecret = req.headers.get("x-cron-secret");
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
    const ok =
      (!!headerSecret && timingSafeEqualStr(headerSecret, secret)) ||
      (!!bearer && timingSafeEqualStr(bearer, secret));
    if (!ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = nowAnchor();

    // ── Mock-Modus: nur Vorschau, keine DB-Writes ──────────────────
    if (isMockMode) {
      const appts = await listAppointments();
      const invoices = await listInvoices();

      const remindersDue = appts.filter(
        (a) =>
          a.status === "scheduled" &&
          !a.reminderSentAt &&
          a.reminderAt &&
          a.reminderAt.getTime() <= now.getTime(),
      ).length;

      const recurringDue = invoices.filter(
        (i) => i.kind === "invoice" && RECURRING_TYPES.includes(i.type),
      ).length;

      return NextResponse.json({
        ok: true,
        mock: true,
        preview: { remindersDue, recurringDue },
        message: `Demo: würde ${remindersDue} Erinnerungen senden, ${recurringDue} Wartungsrechnungen erzeugen — aktiv ab Supabase.`,
      });
    }

    // ── DB-Modus ───────────────────────────────────────────────────
    let reminders = 0;

    // a) Fällige Termin-Erinnerungen
    try {
      const { db } = await import("@/db");
      const { appointments, leads } = await import("@/db/schema");
      const { eq, and, lte, isNull } = await import("drizzle-orm");

      // System-Job (kein eingeloggter User) → über ALLE Owner, via Superuser-db.
      const due = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.status, "scheduled"),
            isNull(appointments.reminderSentAt),
            lte(appointments.reminderAt, now),
          ),
        );

      for (const appt of due) {
        try {
          // Lead für E-Mail-Adresse laden
          const [lead] = await db
            .select()
            .from(leads)
            .where(eq(leads.id, appt.leadId))
            .limit(1);

          const email = lead?.email?.trim();
          if (email) {
            const when = appt.startsAt
              ? appt.startsAt.toLocaleString("de-DE", {
                  dateStyle: "full",
                  timeStyle: "short",
                })
              : "demnächst";
            const company = lead?.company ?? "Ihr Termin";
            await sendEmail({
              to: email,
              subject: "Termin-Erinnerung",
              text: `Erinnerung an Ihren Termin (${company}): ${appt.title ?? "Termin"} am ${when}${appt.location ? ` · ${appt.location}` : ""}.`,
            });
          }

          // Markieren als „erinnert" — auch wenn keine E-Mail-Adresse vorlag,
          // damit nicht in jedem Tick erneut versucht wird.
          await db
            .update(appointments)
            .set({ reminderSentAt: now })
            .where(eq(appointments.id, appt.id));

          reminders++;
        } catch (innerErr) {
          // Defensiv: ein kaputter Termin darf den ganzen Tick nicht killen.
          console.error(`[cron/tick] Reminder fehlgeschlagen (${appt.id}):`, innerErr);
        }
      }
    } catch (reminderErr) {
      console.error("[cron/tick] Reminder-Block fehlgeschlagen:", reminderErr);
    }

    // b) Wiederkehrende Wartungsrechnungen
    // TODO: Sobald an den won-Leads ein Wartungs-Intervall-Feld existiert
    // (z.B. leads.maintenanceIntervalMonths + leads.lastMaintenanceInvoiceAt),
    // hier monatlich für jeden won-Lead mit aktiver Wartung eine neue invoice
    // (kind="invoice", type="recurring_maintenance", amount=leads.maintenance)
    // erzeugen, wenn die letzte Wartungsrechnung > 1 Intervall her ist.
    // Bis das Feld existiert: bewusst NICHTS erzeugen, um keine falschen
    // Rechnungen zu generieren.

    return NextResponse.json({ ok: true, processed: { reminders } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Nur POST — ein versehentlicher GET (Link/Prefetch) darf den Tick (Mailversand)
// nicht auslösen.
export async function POST(req: NextRequest) {
  return handle(req);
}
