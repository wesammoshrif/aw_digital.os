import Link from "next/link";
import { Phone, ChevronRight } from "lucide-react";
import { Badge } from "./ui/Badge";
import type { Lead } from "@/db/schema";
import { cn } from "@/lib/utils";

const TRADE_LABEL: Record<string, string> = {
  dachdecker: "Dachdecker",
  maler: "Maler",
  elektriker: "Elektriker",
  shk: "SHK",
  tischler: "Tischler",
  fliesenleger: "Fliesenleger",
  maurer: "Maurer",
  galabau: "GaLaBau",
  bauunternehmer: "Bauunternehmen",
  solar: "Solar",
  gastronomie: "Gastronomie",
  hausmeister: "Hausmeister",
};

function scoreVariant(score: Lead["score"]): "hot" | "warm" | "cold" | "neutral" {
  if (score === "hot") return "hot";
  if (score === "warm") return "warm";
  if (score === "cold") return "cold";
  return "neutral";
}

export function QueueItem({ lead, index }: { lead: Lead; index: number }) {
  const tradeLabel = lead.trade
    ? (TRADE_LABEL[lead.trade] ?? lead.trade)
    : "—";

  return (
    <Link
      href={`/leads/${lead.id}`}
      className={cn(
        "group flex items-center gap-4 border-b border-[var(--color-hairline)] px-5 py-4 transition",
        "hover:bg-[var(--color-surface-2)]",
        "last:border-b-0",
      )}
    >
      <div className="text-mono tabular w-6 shrink-0 text-[11px] text-[var(--color-fg-faint)]">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[14px] font-semibold text-[var(--color-fg)]">
            {lead.company}
          </div>
          {lead.score && (
            <Badge variant={scoreVariant(lead.score)} dot>
              {lead.score}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--color-fg-mute)]">
          {tradeLabel} · {lead.city ?? "—"} · {lead.phone ?? "Keine Nummer"}
        </div>
        {lead.auditHook && (
          <div className="mt-1.5 line-clamp-1 text-[12px] italic text-[var(--color-copper-700)]">
            „{lead.auditHook}"
          </div>
        )}
      </div>

      <PainScoreCell score={lead.painScore} />

      <div className="text-mono w-10 shrink-0 text-right text-[11px] tabular text-[var(--color-fg-mute)]">
        {lead.attempts}/5
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-copper-500)] px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(37,99,235,0.3)] group-hover:flex">
          <Phone className="h-3.5 w-3.5" />
          Anrufen
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--color-fg-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-fg-mute)]" />
      </div>
    </Link>
  );
}

function PainScoreCell({ score }: { score: number | null }) {
  if (score === null)
    return (
      <div className="text-mono w-16 shrink-0 text-right text-[11px] text-[var(--color-fg-mute)]">
        —
      </div>
    );
  const hot = score < 20;
  const mid = score < 50;
  return (
    <div className="w-16 shrink-0">
      <div className="flex items-center justify-end gap-1.5">
        <span
          className={cn(
            "text-mono tabular text-[12.5px] font-semibold",
            hot
              ? "text-[var(--color-hot)]"
              : mid
                ? "text-[var(--color-warm)]"
                : "text-[var(--color-fg-mute)]",
          )}
        >
          {score}
        </span>
        <div className="flex h-1.5 w-8 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
          <div
            className={cn(
              "h-full transition-all",
              hot
                ? "bg-[var(--color-hot)]"
                : mid
                  ? "bg-[var(--color-warm)]"
                  : "bg-[var(--color-fg-faint)]",
            )}
            style={{ width: `${100 - score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
