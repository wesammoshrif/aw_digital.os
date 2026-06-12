import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: { delta: number; suffix?: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-white px-5 py-4 shadow-[var(--shadow-1)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          {label}
        </div>
        {trend && (
          <div
            className={cn(
              "text-mono text-[10.5px] tabular",
              trend.delta >= 0
                ? "text-[var(--color-success)]"
                : "text-[var(--color-danger)]",
            )}
          >
            {trend.delta >= 0 ? "+" : ""}
            {trend.delta}
            {trend.suffix ?? "%"}
          </div>
        )}
      </div>
      <div className="text-mono mt-2 text-[26px] font-semibold leading-none tracking-tight tabular">
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] text-[var(--color-fg-mute)]">
          {hint}
        </div>
      )}
    </div>
  );
}
