import Link from "next/link";
import { Phone, ChevronRight } from "lucide-react";
import { Badge } from "./ui/Badge";
import type { Lead } from "@/db/schema";
import { cn } from "@/lib/utils";
import { displayTrade, painInfo } from "@/lib/enrich";

function scoreVariant(score: Lead["score"]): "hot" | "warm" | "cold" | "neutral" {
  if (score === "hot") return "hot";
  if (score === "warm") return "warm";
  if (score === "cold") return "cold";
  return "neutral";
}

export function QueueItem({ lead, index }: { lead: Lead; index: number }) {
  // Gewerk raten, wenn die Quelle keins geliefert hat (keine „—" mehr).
  const tradeLabel = displayTrade(lead) ?? "Branche unklar";
  // Meta-Zeile ohne leere „—"-Segmente zusammenbauen.
  const metaParts = [tradeLabel];
  if (lead.city) metaParts.push(lead.city);
  metaParts.push(lead.phone ?? "Keine Nummer");
  const pain = painInfo(lead);

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
          {metaParts.join(" · ")}
        </div>
        {lead.auditHook && (
          <div className="mt-1.5 line-clamp-1 text-[12px] italic text-[var(--color-copper-700)]">
            „{lead.auditHook}"
          </div>
        )}
      </div>

      <HebelCell level={pain.level} />

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

// Hebel-Score 1–5 als 5 Punkte (5 gefüllt = größter Hebel). Höher = heißer.
function HebelCell({ level }: { level: number }) {
  const color =
    level >= 4
      ? "bg-[var(--color-hot)]"
      : level === 3
        ? "bg-[var(--color-warm)]"
        : "bg-[var(--color-fg-faint)]";
  return (
    <div className="w-16 shrink-0" title={`Hebel ${level}/5 — höher = heißer`}>
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-mono tabular text-[12.5px] font-semibold text-[var(--color-fg-dim)]">
          {level}/5
        </span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1 rounded-full",
                i <= level ? color : "bg-[var(--color-surface-3)]",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
