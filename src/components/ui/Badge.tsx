import { cn } from "@/lib/utils";

/* Apple-style pills: calm tints, sentence case, no heavy uppercase. */
const VARIANTS = {
  neutral: "bg-[#f0f0f2] text-[var(--color-fg-dim)]",
  copper: "bg-[#e9f2fe] text-[var(--color-copper-700)]",
  hot: "bg-[#ffeceb] text-[#d70015]",
  warm: "bg-[#fff2e3] text-[#b25000]",
  cold: "bg-[#eef0f2] text-[#6e6e73]",
  success: "bg-[#e6f7ea] text-[#1a7f37]",
  danger: "bg-[#ffeceb] text-[#d70015]",
} as const;

const DOT: Record<string, string> = {
  hot: "bg-[var(--color-hot)]",
  warm: "bg-[var(--color-warm)]",
  cold: "bg-[var(--color-cold)]",
  success: "bg-[var(--color-success)]",
  danger: "bg-[var(--color-danger)]",
  copper: "bg-[var(--color-copper-500)]",
  neutral: "bg-[var(--color-fg-mute)]",
};

export function Badge({
  variant = "neutral",
  children,
  className,
  dot = false,
}: {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        VARIANTS[variant],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[variant])} />}
      {children}
    </span>
  );
}
