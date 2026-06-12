import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/* iOS grouped inset list — white rounded group, hairline dividers
   inset from the left past the leading icon. */
export function IOSGroup({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {header && (
        <div className="mb-1.5 px-4 text-[12px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
          {header}
        </div>
      )}
      <div className="overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
        {children}
      </div>
      {footer && (
        <div className="mt-1.5 px-4 text-[12px] leading-snug text-[var(--color-fg-mute)]">
          {footer}
        </div>
      )}
    </div>
  );
}

export function IOSRow({
  icon,
  iconBg,
  title,
  subtitle,
  trailing,
  chevron = false,
}: {
  icon?: React.ReactNode;
  iconBg?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--color-hairline)]">
      {icon && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-white"
          style={{ background: iconBg ?? "var(--color-copper-500)" }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[14px] text-[var(--color-fg)]">{title}</div>
        {subtitle && (
          <div className="truncate text-[12px] text-[var(--color-fg-mute)]">
            {subtitle}
          </div>
        )}
      </div>
      {trailing && (
        <div className="shrink-0 text-[13px] text-[var(--color-fg-mute)]">
          {trailing}
        </div>
      )}
      {chevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-fg-faint)]" />
      )}
    </div>
  );
}

/* Static iOS switch (visual state). */
export function IOSSwitch({ on = false }: { on?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-[26px] w-[42px] items-center rounded-full transition",
        on ? "bg-[var(--color-success)]" : "bg-[#e3e3e8]",
      )}
    >
      <span
        className={cn(
          "absolute h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all",
          on ? "left-[18px]" : "left-[2px]",
        )}
      />
    </span>
  );
}
