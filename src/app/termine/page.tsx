import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { listAppointmentsWithLead, nowAnchor, type AppointmentWithLead } from "@/lib/store";
import { Calendar, MapPin, Phone, Bell, BellRing, BellOff, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date) {
  return (
    d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  );
}

type ReminderState = "sent" | "due" | "scheduled" | "none";

function reminderState(a: AppointmentWithLead, now: Date): ReminderState {
  if (a.reminderSentAt) return "sent";
  if (!a.reminderAt) return "none";
  return a.reminderAt.getTime() <= now.getTime() ? "due" : "scheduled";
}

export default async function TerminePage() {
  const appts = await listAppointmentsWithLead();
  const now = nowAnchor();

  const sorted = [...appts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = sorted.filter(
    (a) => a.status === "scheduled" && a.startsAt.getTime() >= now.getTime(),
  );
  const past = sorted
    .filter((a) => a.status !== "scheduled" || a.startsAt.getTime() < now.getTime())
    .reverse();

  // Erinnerungen, die jetzt fällig sind (noch nicht raus)
  const dueReminders = upcoming.filter((a) => reminderState(a, now) === "due");

  return (
    <Shell
      title="Termine"
      eyebrow="Kalender & Erinnerungen"
      actions={
        <ButtonLink href="/leads" variant="ghost" size="sm">
          Termin im Anruf vereinbaren →
        </ButtonLink>
      }
    >
      {/* ── Fällige Erinnerungen Banner ───────────────────────────── */}
      {dueReminders.length > 0 && (
        <Card className="mb-6 flex items-center gap-3 border-l-[3px] border-[var(--color-copper-500)] bg-[#eff5ff] px-5 py-4">
          <BellRing className="h-5 w-5 text-[var(--color-copper-600)]" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[var(--color-copper-700)]">
              {dueReminders.length} Termin-Erinnerung{dueReminders.length > 1 ? "en" : ""} fällig
            </div>
            <div className="text-[12.5px] text-[var(--color-copper-700)]/80">
              {dueReminders
                .map((a) => `${a.lead?.company ?? "—"} (${fmtDateTime(a.startsAt)})`)
                .join(" · ")}
            </div>
          </div>
        </Card>
      )}

      {/* ── Anstehende Termine ────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--color-copper-600)]" />
          <h2 className="text-display text-[17px]">Anstehend</h2>
          <Badge variant="copper" dot>{upcoming.length}</Badge>
        </div>

        {upcoming.length === 0 ? (
          <Card className="px-6 py-10 text-center text-[14px] text-[var(--color-fg-mute)]">
            Keine anstehenden Termine.
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <TerminCard key={a.id} a={a} now={now} />
            ))}
          </div>
        )}
      </section>

      {/* ── Vergangene / Erledigte ────────────────────────────────── */}
      {past.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-fg-mute)]" />
            <h2 className="text-display text-[17px]">Vergangen</h2>
            <Badge variant="neutral">{past.length}</Badge>
          </div>
          <div className="space-y-3 opacity-75">
            {past.map((a) => (
              <TerminCard key={a.id} a={a} now={now} />
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}

function ReminderBadge({ a, now }: { a: AppointmentWithLead; now: Date }) {
  const state = reminderState(a, now);
  if (state === "sent")
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[#1a7f37]">
        <Bell className="h-3.5 w-3.5" /> Erinnerung gesendet
      </span>
    );
  if (state === "due")
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-copper-700)]">
        <BellRing className="h-3.5 w-3.5" /> Erinnerung fällig
      </span>
    );
  if (state === "scheduled")
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-fg-mute)]">
        <Bell className="h-3.5 w-3.5" /> Erinnerung {a.reminderAt ? fmtDateTime(a.reminderAt) : ""}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-fg-faint)]">
      <BellOff className="h-3.5 w-3.5" /> Keine Erinnerung
    </span>
  );
}

function TerminCard({ a, now }: { a: AppointmentWithLead; now: Date }) {
  const isPhone = (a.location ?? "").toLowerCase().includes("telefon");
  const statusLabel =
    a.status === "done" ? "Erledigt" : a.status === "cancelled" ? "Abgesagt" : "Geplant";
  const statusVariant = a.status === "done" ? "success" : a.status === "cancelled" ? "danger" : "copper";

  return (
    <Card className="flex items-center gap-5 px-5 py-4">
      {/* Datum-Block */}
      <div className="flex w-[88px] shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] py-2.5">
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-fg-mute)]">
          {a.startsAt.toLocaleDateString("de-DE", { weekday: "short" })}
        </div>
        <div className="text-mono text-[22px] font-semibold leading-none text-[var(--color-fg)]">
          {a.startsAt.toLocaleDateString("de-DE", { day: "2-digit" })}
        </div>
        <div className="text-[11px] text-[var(--color-fg-mute)]">
          {a.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Inhalt */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-[var(--color-fg)]">
            {a.lead?.company ?? "Unbekannter Kontakt"}
          </span>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <div className="mt-0.5 text-[13px] text-[var(--color-fg-dim)]">{a.title ?? "Termin"}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-fg-mute)]">
            {isPhone ? <Phone className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {a.location ?? "—"}
          </span>
          <ReminderBadge a={a} now={now} />
        </div>
      </div>

      {/* Aktion */}
      {a.lead && (
        <ButtonLink href={`/leads/${a.lead.id}`} variant="secondary" size="sm">
          Lead öffnen
        </ButtonLink>
      )}
    </Card>
  );
}
