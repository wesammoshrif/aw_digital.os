/**
 * Tagesziel-Ring — Conic SVG mit Animationsverlauf.
 * Linear-Style: rein, ohne Glow, mit Tabular-Zahl in der Mitte.
 */
import { cn } from "@/lib/utils";

export function TargetRing({
  current,
  target,
  size = 160,
  stroke = 10,
  label = "Anrufe heute",
}: {
  current: number;
  target: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const pct = Math.min(1, target === 0 ? 0 : current / target);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-surface-3)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-copper-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={cn(
            "text-mono tabular text-[34px] font-semibold leading-none tracking-tight",
          )}
        >
          {current}
        </div>
        <div className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          / {target} {label}
        </div>
      </div>
    </div>
  );
}

export function WeekSparkline({ values, target }: { values: number[]; target: number }) {
  const max = Math.max(target, ...values) * 1.1;
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return (
    <div className="flex h-full items-end gap-1.5">
      {values.map((v, i) => {
        const h = max === 0 ? 0 : (v / max) * 100;
        const ok = v >= target;
        const zero = v === 0;
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div
              className={cn(
                "w-full rounded-sm transition-all",
                zero
                  ? "bg-[var(--color-surface-3)]/60"
                  : ok
                    ? "bg-[var(--color-copper-500)]"
                    : "bg-[var(--color-copper-700)]/70",
              )}
              style={{ height: `${Math.max(4, h)}%` }}
            />
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-fg-mute)]">
              {days[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
