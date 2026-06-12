import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TargetRing, WeekSparkline } from "@/components/TargetRing";
import { QueueItem } from "@/components/QueueItem";
import { GeminiChat } from "@/components/GeminiChat";
import { dashboardSummary, isMockMode } from "@/lib/store";
import { Phone, Calendar, TrendingUp, ArrowRight, Briefcase, Euro, Sparkles, Zap } from "lucide-react";

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
      <GeminiStrategy />

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
            <h2 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-[var(--color-fg)]">
              Noch {remaining} Anrufe.
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
            <Badge variant="neutral">Ziel 100</Badge>
          </div>
          <div className="h-[118px]">
            <WeekSparkline values={data.weeklyCalls} target={20} />
          </div>
        </Card>
      </section>

      {/* ── KPI row ────────────────────────────────────────────────── */}
      <section className="mb-8 grid grid-cols-4 gap-5">
        <Kpi
          icon={Phone}
          label="Leads gesamt"
          value={String(data.total)}
          hint={`${data.proposalCount} im Angebot`}
        />
        <Kpi
          icon={Calendar}
          label="Termine offen"
          value={String(data.upcomingAppointments)}
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
          value={`${data.mrr.toFixed(0)} €`}
          hint={`${data.won} Bestandskunden`}
        />
        <Kpi
          icon={Euro}
          label="Umsatz (lfd. Monat)"
          value={`${data.revenueThisMonth.toFixed(0)} €`}
          hint="Bezahlte Rechnungen"
        />
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
          <GeminiChat />
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

async function GeminiStrategy() {
  return (
    <section className="mb-8 rise">
      <Card className="relative overflow-hidden border-none gemini-card text-white p-0 shadow-2xl">
        <div className="absolute top-[-20px] right-[-20px] p-4 opacity-20 animate-float">
          <Sparkles className="h-40 w-40" />
        </div>
        <div className="relative px-8 py-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/80">Claude 3.5 AI</span>
                <span className="block text-[18px] font-bold tracking-tight">Agentur-Strategie</span>
              </div>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-md">Live Analyse</Badge>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-2 group cursor-default">
              <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wider opacity-70">Akquise-Hebel</div>
              <p className="text-[15px] font-medium leading-relaxed group-hover:text-blue-200 transition-colors">
                "Die Neugründungen in Hannover sind heute heiß. 3 Malerbetriebe haben gerade erst eröffnet – perfekter Hook!"
              </p>
            </div>
            <div className="space-y-2 border-x border-white/10 px-8 group cursor-default">
              <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider opacity-70">Projekt-Turbo</div>
              <p className="text-[15px] font-medium leading-relaxed group-hover:text-purple-200 transition-colors">
                "Pavlić wartet auf das Design-Update. Schick es raus, um die Abschlusszahlung von 2.400€ zu triggern."
              </p>
            </div>
            <div className="space-y-2 group cursor-default">
              <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider opacity-70">Finanz-Check</div>
              <p className="text-[15px] font-medium leading-relaxed group-hover:text-emerald-200 transition-colors">
                "Du hast 950€ an offenen Anzahlungen. Ein kurzer Check bei Sushi Sun sichert dir den Cashflow für das Wochenende."
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
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
      <div className="text-mono mt-3 text-[30px] font-semibold leading-none tracking-tight tabular text-[var(--color-fg)]">
        {value}
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
