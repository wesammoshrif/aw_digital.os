import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { getProject, getLead, listTasks } from "@/lib/store";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  Calendar,
  GitBranch,
  Globe,
  FlaskConical,
  KeyRound,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planung",
  design: "Design",
  development: "Entwicklung",
  review: "Review",
  live: "Live",
  on_hold: "Pausiert",
};

const STEPS = ["planning", "design", "development", "review", "live"] as const;

function statusVariant(s: string): "success" | "danger" | "copper" | "neutral" | "warm" {
  if (s === "live") return "success";
  if (s === "on_hold") return "warm";
  if (s === "review") return "copper";
  return "neutral";
}

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("de-DE") : "—";
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const [lead, tasks] = await Promise.all([
    getLead(project.leadId),
    listTasks(id),
  ]);

  const doneCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const currentStepIndex = STEPS.indexOf(project.status as (typeof STEPS)[number]);
  const isOnHold = project.status === "on_hold";

  return (
    <Shell
      title={project.name}
      eyebrow={lead?.company ?? "Projekt"}
      actions={
        <>
          <ButtonLink href="/projects" variant="ghost" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück
          </ButtonLink>
          {project.liveUrl && (
            <ButtonLink href={project.liveUrl} variant="primary" size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Live ansehen
            </ButtonLink>
          )}
        </>
      }
    >
      <div className="mb-6 flex items-center gap-2">
        <Badge variant={statusVariant(project.status)}>
          {STATUS_LABEL[project.status] ?? project.status}
        </Badge>
        {project.description && (
          <span className="text-[13px] text-[var(--color-fg-mute)]">
            {project.description}
          </span>
        )}
      </div>

      {/* Status-Stepper */}
      <Card className="mb-6 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-display text-[15px]">Status</h2>
          {isOnHold && <Badge variant="warm">Pausiert</Badge>}
        </div>
        <div className="flex items-center">
          {STEPS.map((step, i) => {
            const reached = !isOnHold && currentStepIndex >= 0 && i <= currentStepIndex;
            const isCurrent = !isOnHold && i === currentStepIndex;
            return (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-colors " +
                      (isCurrent
                        ? "bg-[var(--color-copper-500)] text-white"
                        : reached
                          ? "bg-[#e6f7ea] text-[#1a7f37]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-fg-mute)]")
                    }
                  >
                    {reached && !isCurrent ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={
                      "text-[11px] font-medium " +
                      (reached
                        ? "text-[var(--color-fg)]"
                        : "text-[var(--color-fg-mute)]")
                    }
                  >
                    {STATUS_LABEL[step]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={
                      "mx-2 h-[2px] flex-1 rounded-full " +
                      (!isOnHold && i < currentStepIndex
                        ? "bg-[#1a7f37]/40"
                        : "bg-[var(--color-hairline)]")
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Task-Liste */}
        <div className="col-span-2">
          <Card className="p-0 overflow-hidden">
            <CardHeader
              title="Aufgaben"
              eyebrow="To-dos"
              right={
                <span className="text-[12px] font-medium text-[var(--color-fg-mute)]">
                  {doneCount} von {totalCount} erledigt
                </span>
              }
            />
            <div className="px-5 pt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full bg-[#1a7f37] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="px-6 py-10 text-center text-[14px] text-[var(--color-fg-mute)]">
                Noch keine Aufgaben.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-hairline)]">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    {t.isCompleted ? (
                      <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#1a7f37]" />
                    ) : (
                      <Circle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-fg-mute)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          "text-[13.5px] " +
                          (t.isCompleted
                            ? "text-[var(--color-fg-mute)] line-through"
                            : "text-[var(--color-fg)]")
                        }
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="mt-0.5 text-[12px] text-[var(--color-fg-mute)]">
                          {t.description}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[12px] text-[var(--color-fg-dim)]">
                      {fmtDate(t.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Projekt-Meta-Karte */}
        <div>
          <Card className="p-0 overflow-hidden">
            <CardHeader title="Projekt-Details" eyebrow="Meta" />
            <dl className="divide-y divide-[var(--color-hairline)]">
              <MetaRow icon={Calendar} label="Deadline" value={fmtDate(project.deadline)} />
              <MetaRow icon={Calendar} label="Start" value={fmtDate(project.startDate)} />
              <MetaLink icon={GitBranch} label="Repository" href={project.repoUrl} />
              <MetaLink icon={FlaskConical} label="Staging" href={project.stagingUrl} />
              <MetaLink icon={Globe} label="Live" href={project.liveUrl} />
              {project.accessNotes && (
                <div className="px-5 py-3.5">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
                    <KeyRound className="h-3.5 w-3.5" /> Zugang
                  </div>
                  <div className="text-[12.5px] text-[var(--color-fg-dim)] whitespace-pre-wrap">
                    {project.accessNotes}
                  </div>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="flex items-center gap-2 text-[12.5px] text-[var(--color-fg-mute)]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-[12.5px] font-medium text-[var(--color-fg)]">
        {value}
      </span>
    </div>
  );
}

function MetaLink({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string | null;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="flex items-center gap-2 text-[12.5px] text-[var(--color-fg-mute)]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-copper-600)] hover:underline"
        >
          Öffnen <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-[12.5px] text-[var(--color-fg-mute)]">—</span>
      )}
    </div>
  );
}
