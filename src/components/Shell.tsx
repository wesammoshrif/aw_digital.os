import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

export function Shell({
  children,
  title,
  eyebrow,
  actions,
  streak,
}: {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  streak?: { current: number; record: number };
}) {
  const hasHeader = Boolean(title || eyebrow || actions);
  return (
    <div className="flex min-h-screen">
      <Sidebar streak={streak ?? { current: 0, record: 0 }} />
      <main className="flex-1 min-w-0">
        {hasHeader && (
          <header className="vibrancy-bar sticky top-0 z-20 flex min-h-[52px] flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] py-2 pl-16 pr-4 md:px-8">
            <div className="flex items-baseline gap-3">
              {title && (
                <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-fg)]">
                  {title}
                </h1>
              )}
              {eyebrow && (
                <span className="text-[12.5px] text-[var(--color-fg-mute)]">
                  {eyebrow}
                </span>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <div
          className={cn(
            "rise px-4 md:px-8 md:py-8",
            // Ohne Header oben Platz fürs schwebende Hamburger-Icon (mobil).
            hasHeader ? "py-5" : "pb-6 pt-16 md:pt-8",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
