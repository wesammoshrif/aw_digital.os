import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TargetRing, WeekSparkline } from "@/components/TargetRing";
import { QueueItem } from "@/components/QueueItem";
import { CountUp } from "@/components/CountUp";
import { dashboardSummary, isMockMode } from "@/lib/store";
import { Phone, Calendar, TrendingUp, ArrowRight, Euro, Clock, FileText, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await dashboardSummary();
  const today = isMockMode ? new Date("2026-06-06") : new Date();
  const dateLabel = today.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const remaining = Math.max(
    0,
    data.streak.todayTarget - data.streak.todayProgress,
  );

  return (
    <Shell
      title="Heute"
      eyebrow={dateLabel}
      actions={
        <>
          {isMockMode && <Badge variant="copper" dot>Demo · ohne DB</Badge>}
          <ButtonLink href="/leads" variant="ghost" size="sm">
            Alle Leads
          </ButtonLink>
          <ButtonLink href="/leads/new" variant="primary" size="sm">
            + Neuer Lead
          </ButtonLink>
        </>
      }
    >
      {/* ── Hero band: focus on today ──────────────────────────────── */}
      <section className="mb-6 grid grid-cols-12 gap-5">
        <Card className="col-span-7 flex items-center gap-8 px-8 py-7">
          <TargetRing
            current={data.streak.todayProgress}
            target={data.streak.todayTarget}
            size={150}
          />
          <div className="flex-1">
            <div className="text-[12.5px] font-medium text-[var(--color-fg-mute)]">
              Tagesziel
            </div>
            <h2 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-fg)]">
              Noch <CountUp value={remaining} /> Anrufe.
            </h2>
            <p className="mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
              Du bist seit {data.streak.current} Tagen dran — Rekord ist{" "}
              {data.streak.record}. Kette nicht reißen lassen.
            </p>
            <ButtonLink
              href="#queue"
              variant="primary"
              size="md"
              className="mt-5"
            >
              <Phone className="h-4 w-4" />
              Nächsten anrufen
            </ButtonLink>
          </div>
        </Card>

        <Card className="col-span-5 px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[12.5px] font-medium text-[var(--color-fg)]">
              Diese Woche
            </div>
            <Badge variant="neutral">Ziel {data.streak.todayTarget}/Tag</Badge>
          </div>
          <div className="h-[118px]">
            <WeekSparkline values={data.weeklyCalls} target={data.streak.todayTarget} />
          </div>
        </Card>
      </section>

      {/* ── KPI row ────────────────────────────────────────────────── */}
      <section className="mb-8 grid grid-cols-4 gap-5">
        <Kpi
          icon={Phone}
          label="Leads gesamt"
          num={data.total}
          hint={`${data.proposalCount} im Angebot`}
        />
        <Kpi
          icon={Calendar}
          label="Termine offen"
          num={data.upcomingAppointments}
          hint={
            data.nextAppt
              ? data.nextAppt.startsAt.toLocaleDateString("de-DE", {
                  weekday: "long",
                }) +
                " " +
                data.nextAppt.startsAt.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Keine geplant"
          }
        />
        <Kpi
          icon={TrendingUp}
          label="Wartungs-MRR"
          num={data.mrr}
          numSuffix=" €"
          hint={`${data.won} Bestandskunden`}
        />
        <Kpi
          icon={Euro}
          label="Umsatz (lfd. Monat)"
          num={data.revenueThisMonth}
          numSuffix=" €"
          hint="Bezahlte Rechnungen"
        />
      </section>

      {/* ── Anruf-Statistik ────────────────────────────────────────── */}
      <section className="mb-8">
        <Card className="grid grid-cols-4 divide-x divide-[var(--color-hairline)] p-0">
          <CallStat label="Anrufe" num={data.callStats.total} hint="protokolliert" />
          <CallStat
            label="Connect-Rate"
            num={data.callStats.connectRate}
            numSuffix=" %"
            hint={`${data.callStats.connected} erreicht`}
          />
          <CallStat
            label="Ø Gesprächsdauer"
            value={`${Math.floor(data.callStats.avgDuration / 60)}:${String(
              data.callStats.avgDuration % 60,
            ).padStart(2, "0")} min`}
            hint="je erreichtem Anruf"
          />
          <CallStat
            label="Termine / Interesse"
            value={`${data.callStats.appointments} / ${data.callStats.interested}`}
            hint="aus Anrufen"
          />
        </Card>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-display text-[19px]">Aktive Projekte</h2>
            <p className="mt-1 text-[13px] text-[var(--color-fg-mute)]">
              Laufende Webdesign-Projekte
            </p>
          </div>
          <ButtonLink href="/projects" variant="ghost" size="sm">
            Alle Projekte <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>

        {data.activeProjects.length === 0 ? (
          <Card className="px-6 py-8 text-center">
            <div className="text-[14px] text-[var(--color-fg)]">
              Keine aktiven Projekte.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data.activeProjects.map((prj) => (
              <Card key={prj.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-fg)]">{prj.name}</h3>
                    <p className="mt-1 text-[12px] text-[var(--color-fg-mute)] line-clamp-1">
                      {prj.description}
                    </p>
                  </div>
                  <Badge variant="copper">{prj.status}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
                  <div className="text-[11px] text-[var(--color-fg-dim)]">
                    {prj.deadline ? `Deadline: ${prj.deadline.toLocaleDateString("de-DE")}` : "Keine Deadline"}
                  </div>
                  <ButtonLink href={`/projects/${prj.id}`} variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                    Details
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Queue ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 items-start">
        <section id="queue" className="col-span-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-display text-[19px]">Anruf-Queue</h2>
              <p className="mt-1 text-[13px] text-[var(--color-fg-mute)]">
                Nach Pain-Score sortiert · niedriger = größerer Hebel
              </p>
            </div>
            <Badge variant="copper" dot>
              {data.queue.length} fällig
            </Badge>
          </div>

          {data.queue.length === 0 ? (
            <Card className="px-6 py-16 text-center">
              <div className="text-[14px] text-[var(--color-fg)]">
                Queue ist leer.
              </div>
              <div className="mt-1.5 text-[12.5px] text-[var(--color-fg-mute)]">
                Neue Leads über <span className="text-[var(--color-copper-600)]">Scrapen</span> ziehen.
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              {data.queue.map((lead, i) => (
                <QueueItem key={lead.id} lead={lead} index={i} />
              ))}
            </Card>
          )}
        </section>

        <aside className="col-span-4 mt-[46px]">
          <TodayGlance data={data} />
        </aside>
      </div>

      {/* ── Pipeline strip ─────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-display text-[15px]">Pipeline</h2>
          <ButtonLink href="/pipeline" variant="ghost" size="sm">
            Öffnen <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
        <PipelineFunnel pipeline={data.pipeline} />
      </section>
    </Shell>
  );
}

function TodayGlance({
  data,
}: {
  data: Awaited<ReturnType<typeof dashboardSummary>>;
}) {
  const appt = data.nextAppt;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b border-[var(--color-hairline)] px-5 py-3.5">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
          Heute im Blick
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[#eff5ff] text-[var(--color-copper-600)]">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-[var(--color-fg)]">
              {appt ? "Nächster Termin" : "Keine Termine heute"}
            </div>
            {appt && (
              <div className="text-[12px] text-[var(--color-fg-mute)]">
                {appt.startsAt.toLocaleDateString("de-DE", { weekday: "short" })}{" "}
                {appt.startsAt.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {appt.location ?? "—"}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[#eff5ff] text-[var(--color-copper-600)]">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <div className="text-[12.5px] text-[var(--color-fg)]">
            {data.callStats.total} Anrufe protokolliert ·{" "}
            <span className="text-[var(--color-fg-mute)]">
              {data.callStats.connectRate}% erreicht
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1 border-t border-[var(--color-hairline)] px-3 py-3">
        <GlanceLink href="/termine" icon={Calendar} label="Termine & Erinnerungen" />
        <GlanceLink href="/finances" icon={FileText} label="Angebote & Rechnungen" />
        <GlanceLink href="/scrape" icon={Radio} label="Neue Leads scrapen" />
      </div>
    </Card>
  );
}

function GlanceLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[12.5px] font-medium text-[var(--color-fg-dim)] transition-colors hover:bg-black/[0.04]"
    >
      <Icon className="h-[15px] w-[15px] text-[var(--color-fg-mute)]" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
    </a>
  );
}

function CallStat({
  label,
  value,
  num,
  numSuffix,
  hint,
}: {
  label: string;
  value?: string;
  num?: number;
  numSuffix?: string;
  hint?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
        {label}
      </div>
      <div className="text-mono mt-2 text-[24px] font-semibold leading-none tabular text-[var(--color-fg)]">
        {num !== undefined ? <CountUp value={num} suffix={numSuffix} /> : value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11.5px] text-[var(--color-fg-mute)]">{hint}</div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  num,
  numSuffix,
  hint,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  num?: number;
  numSuffix?: string;
  hint?: string;
  trend?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-fg-mute)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[#eff5ff] text-[var(--color-copper-600)]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </div>
        {trend && (
          <span className="text-mono text-[11px] tabular text-[var(--color-success)]">
            {trend}
          </span>
        )}
      </div>
      <div className="text-mono mt-3 text-[31px] font-semibold leading-none tracking-[-0.02em] tabular text-[var(--color-fg)]">
        {num !== undefined ? <CountUp value={num} suffix={numSuffix} /> : value}
      </div>
      {hint && (
        <div className="mt-2 text-[12px] text-[var(--color-fg-mute)]">{hint}</div>
      )}
    </Card>
  );
}

function PipelineFunnel({
  pipeline,
}: {
  pipeline: Record<string, { count: number; value: number }>;
}) {
  const STAGES = [
    { key: "new", label: "Neu" },
    { key: "contacted", label: "Angesprochen" },
    { key: "reached", label: "Erreicht" },
    { key: "audit_sent", label: "Audit/Termin" },
    { key: "proposal", label: "Angebot" },
    { key: "won", label: "Gewonnen" },
    { key: "frozen", label: "Eis" },
  ];
  const max = Math.max(1, ...STAGES.map((s) => pipeline[s.key]?.count ?? 0));

  return (
    <Card className="grid grid-cols-7 divide-x divide-[var(--color-hairline)] p-0">
      {STAGES.map((s) => {
        const c = pipeline[s.key]?.count ?? 0;
        const v = pipeline[s.key]?.value ?? 0;
        const h = (c / max) * 100;
        const isWon = s.key === "won";
        return (
          <div key={s.key} className="flex flex-col px-4 py-4">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
              {s.label}
            </div>
            <div className="text-mono mt-2 flex items-baseline gap-1.5 tabular">
              <span className="text-[22px] font-semibold leading-none text-[var(--color-fg)]">
                {c}
              </span>
              {v > 0 && (
                <span className="text-[10.5px] text-[var(--color-fg-mute)]">
                  {(v / 1000).toFixed(1)}k €
                </span>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
              <div
                className={
                  isWon
                    ? "h-full rounded-full bg-[var(--color-success)] transition-all"
                    : "h-full rounded-full bg-[var(--color-copper-500)] transition-all"
                }
                style={{ width: `${h}%` }}
              />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
