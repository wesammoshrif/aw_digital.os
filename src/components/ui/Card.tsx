import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[18px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  right,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between border-b border-[var(--color-hairline)] px-5 py-3.5",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <div className="text-[11px] font-medium text-[var(--color-fg-mute)]">
            {eyebrow}
          </div>
        )}
        {title && (
          <div className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-fg)]">
            {title}
          </div>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
