import { Shell } from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { listLeads } from "@/lib/store";
import type { Lead } from "@/db/schema";
import Link from "next/link";
import { Phone, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const COLUMNS: Array<{ key: Lead["status"]; label: string; weight: number }> = [
  { key: "new", label: "Neu", weight: 0.1 },
  { key: "contacted", label: "Angesprochen", weight: 0.15 },
  { key: "reached", label: "Erreicht", weight: 0.25 },
  { key: "audit_sent", label: "Audit/Termin", weight: 0.4 },
  { key: "proposal", label: "Angebot", weight: 0.6 },
  { key: "won", label: "Gewonnen", weight: 1.0 },
  { key: "frozen", label: "Eis", weight: 0 },
];

export default async function PipelinePage() {
  const leads = await listLeads({ limit: 500 });
  const buckets = COLUMNS.map((c) => ({
    ...c,
    leads: leads.filter((l) => l.status === c.key),
  }));

  return (
    <Shell
      eyebrow="Konversion"
      title="Pipeline"
      actions={
        <Badge variant="copper" dot>
          {leads.length} Leads im Trichter
        </Badge>
      }
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {buckets.map((col) => {
          const value = col.leads.reduce(
            (s, l) => s + parseFloat(l.value ?? "0"),
            0,
          );
          const weighted = value * col.weight;
          return (
            <div
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-ink)]/40"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="text-[12px] font-semibold text-[var(--color-fg)]">
                    {col.label}
                  </div>
                  <span className="text-mono text-[11px] tabular text-[var(--color-fg-mute)]">
                    {col.leads.length}
                  </span>
                </div>
                {col.weight > 0 && (
                  <div className="text-mono text-[10.5px] tabular text-[var(--color-fg-mute)]">
                    {(col.weight * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 p-2.5">
                {col.leads.map((l) => (
                  <KanbanCard key={l.id} lead={l} />
                ))}
                {col.leads.length === 0 && (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline)] py-6 text-center text-[11px] text-[var(--color-fg-mute)]">
                    Leer
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--color-hairline)] px-3.5 py-2 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
                <div className="flex justify-between">
                  <span>Pipeline</span>
                  <span className="text-mono tabular text-[var(--color-fg-dim)]">
                    {value.toLocaleString("de-DE")} €
                  </span>
                </div>
                {col.weight > 0 && col.weight < 1 && (
                  <div className="flex justify-between text-[var(--color-copper-400)]">
                    <span>Forecast</span>
                    <span className="text-mono tabular">
                      {weighted.toLocaleString("de-DE", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      €
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function KanbanCard({ lead }: { lead: Lead }) {
  const overdue =
    lead.nextStepAt && lead.nextStepAt.getTime() < Date.now();
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/80 p-3 transition hover:border-[var(--color-fg-faint)] hover:bg-[var(--color-surface-2)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {lead.score && (
              <span
                className={
                  lead.score === "hot"
                    ? "h-1.5 w-1.5 rounded-full bg-[var(--color-hot)]"
                    : lead.score === "warm"
                      ? "h-1.5 w-1.5 rounded-full bg-[var(--color-warm)]"
                      : "h-1.5 w-1.5 rounded-full bg-[var(--color-cold)]"
                }
              />
            )}
            <div className="truncate text-[12.5px] font-medium text-[var(--color-fg)]">
              {lead.company}
            </div>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--color-fg-mute)]">
            {lead.trade ?? "—"} · {lead.city ?? "—"}
          </div>
        </div>
        {lead.value && (
          <div className="text-mono shrink-0 text-[11px] tabular text-[var(--color-fg-dim)]">
            {parseFloat(lead.value).toLocaleString("de-DE")} €
          </div>
        )}
      </div>

      {lead.nextStep && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          {overdue ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-hot)]">
              <Clock className="h-3 w-3" /> {lead.nextStep}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--color-fg-mute)]">
              <Calendar className="h-3 w-3" /> {lead.nextStep}
            </span>
          )}
        </div>
      )}

      {lead.painScore !== null && lead.painScore < 30 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-hot)]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--color-hot)]">
          <Phone className="h-2.5 w-2.5" /> Pain {lead.painScore}
        </div>
      )}
    </Link>
  );
}
