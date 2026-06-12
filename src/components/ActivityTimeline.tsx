import {
  Phone,
  Mail,
  MessageSquare,
  StickyNote,
  CalendarDays,
  ClipboardCheck,
  FileText,
  PenLine,
  RefreshCw,
} from "lucide-react";
import type { Activity } from "@/db/schema";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  note: StickyNote,
  meeting: CalendarDays,
  audit: ClipboardCheck,
  proposal: FileText,
  contract: PenLine,
  status_change: RefreshCw,
};

const TONES: Record<string, string> = {
  call: "text-[var(--color-copper-600)] bg-[#eff5ff] border-[#cfe0fd]",
  email: "text-[#2563eb] bg-[#eff5ff] border-[#cfe0fd]",
  audit: "text-[#b45309] bg-[#fffbeb] border-[#fde68a]",
  proposal:
    "text-[var(--color-fg-dim)] bg-[var(--color-surface-2)] border-[var(--color-hairline)]",
  note: "text-[var(--color-fg-mute)] bg-[var(--color-surface-2)] border-[var(--color-hairline)]",
  meeting: "text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0]",
};

const fmt = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0)
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline)] px-4 py-8 text-center text-[12px] text-[var(--color-fg-mute)]">
        Noch keine Aktivität.
      </div>
    );

  return (
    <ol className="relative space-y-3.5 pl-7">
      <span
        aria-hidden
        className="absolute left-[12px] top-1 bottom-1 w-px bg-[var(--color-hairline)]"
      />
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? StickyNote;
        const tone = TONES[a.type] ?? TONES.note;
        return (
          <li key={a.id} className="relative">
            <span
              className={cn(
                "absolute -left-7 top-0.5 flex items-center justify-center rounded-full border",
                tone,
              )}
              style={{ width: 24, height: 24 }}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[12.5px] font-medium text-[var(--color-fg)]">
                {a.title ?? a.type}
              </div>
              <div className="text-mono text-[10.5px] tabular text-[var(--color-fg-mute)]">
                {fmt.format(new Date(a.createdAt))}
              </div>
            </div>
            {/* Payload Details */}
            {a.payload && typeof a.payload === "object" && (
              <div className="mt-1 space-y-1">
                {(a.payload as any).note && (
                  <p className="rounded-md bg-[var(--color-surface-2)] px-2 py-1.5 text-[12px] italic text-[var(--color-fg-dim)]">
                    „{(a.payload as any).note}"
                  </p>
                )}
                {(a.payload as any).nextStep && (
                  <p className="text-[11px] text-[var(--color-fg-mute)]">
                    Nächster Schritt: <span className="text-[var(--color-fg-dim)]">{(a.payload as any).nextStep}</span>
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
