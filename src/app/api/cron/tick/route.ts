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
          // Atomar „claimen": nur wer reminderSentAt von NULL auf jetzt dreht,
          // verschickt die Mail → keine doppelten Erinnerungen bei
          // überlappenden Ticks (Retry / zweiter POST).
          const claimed = await db
            .update(appointments)
            .set({ reminderSentAt: now })
            .where(
              and(
                eq(appointments.id, appt.id),
                isNull(appointments.reminderSentAt),
              ),
            )
            .returning({ id: appointments.id });
          if (claimed.length === 0) continue;

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

          reminders++;
        } catch (innerErr) {
          // Defensiv: ein kaputter Termin darf den ganzen Tick nicht killen.
          console.error(`[cron/tick] Reminder fehlgeschlagen (${appt.id}):`, innerErr);
        }
      }
    } catch (reminderErr) {
      console.error("[cron/tick] Reminder-Block fehlgeschlagen:", reminderErr);
    }

    // b) Wiederkehrende Wartungsrechnungen — OPT-IN pro Kunde.
    //    Es wird NUR für gewonnene Leads abgerechnet, bei denen jemand bewusst
    //    ein Intervall (maintenanceIntervalMonths) UND einen Betrag (maintenance)
    //    gesetzt hat. Ohne Intervall passiert garantiert nichts → keine
    //    versehentlichen Rechnungen.
    let recurringInvoices = 0;
    try {
      const { db } = await import("@/db");
      const { leads, invoices, activities } = await import("@/db/schema");
      const { eq, and, or, isNull, isNotNull, sql } = await import("drizzle-orm");

      // „Fällig" = letzte Wartungsrechnung ist NULL oder älter als das Intervall.
      const dueCond = or(
        isNull(leads.lastMaintenanceInvoiceAt),
        sql`${leads.lastMaintenanceInvoiceAt} <= now() - (${leads.maintenanceIntervalMonths} || ' months')::interval`,
      );

      const dueLeads = await db
        .select({
          id: leads.id,
          ownerId: leads.ownerId,
          maintenance: leads.maintenance,
          interval: leads.maintenanceIntervalMonths,
        })
        .from(leads)
        .where(
          and(
            eq(leads.status, "won"),
            isNotNull(leads.maintenanceIntervalMonths),
            isNotNull(leads.maintenance),
            dueCond,
          ),
        );

      for (const l of dueLeads) {
        const amount = Number(l.maintenance);
        if (!l.interval || l.interval < 1 || !(amount > 0)) continue;
        try {
          // Atomar claimen: nur wer last_maintenance_invoice_at jetzt setzt
          // (Fälligkeits-Bedingung erneut geprüft), erzeugt die Rechnung — so
          // doppeln überlappende Ticks keine Rechnung.
          const claimed = await db
            .update(leads)
            .set({ lastMaintenanceInvoiceAt: now })
            .where(and(eq(leads.id, l.id), dueCond))
            .returning({ id: leads.id });
          if (claimed.length === 0) continue;

          const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
          const invoiceNumber = `RE-W-${ym}-${l.id.slice(0, 8)}`;
          const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

          await db.insert(invoices).values({
            ownerId: l.ownerId,
            leadId: l.id,
            invoiceNumber,
            kind: "invoice",
            type: "recurring_maintenance",
            status: "sent",
            amount: String(l.maintenance),
            currency: "EUR",
            dueDate,
            notes: `Automatische Wartungsrechnung (${l.interval}-Monats-Intervall).`,
          });

          // In die Timeline (Activity-Spine), damit der Verlauf vollständig ist.
          try {
            await db.insert(activities).values({
              ownerId: l.ownerId,
              leadId: l.id,
              type: "note" as never,
              title: `Wartungsrechnung erzeugt · ${invoiceNumber}`,
              payload: { amount: String(l.maintenance), invoiceNumber, auto: true },
            });
          } catch {
            /* Timeline-Eintrag optional */
          }

          recurringInvoices++;
        } catch (innerErr) {
          console.error(
            `[cron/tick] Wartungsrechnung fehlgeschlagen (${l.id}):`,
            innerErr,
          );
        }
      }
    } catch (recErr) {
      console.error("[cron/tick] Wartungsrechnungs-Block fehlgeschlagen:", recErr);
    }

    return NextResponse.json({
      ok: true,
      processed: { reminders, recurringInvoices },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Nur POST — ein versehentlicher GET (Link/Prefetch) darf den Tick (Mailversand)
// nicht auslösen.
export async function POST(req: NextRequest) {
  return handle(req);
}
