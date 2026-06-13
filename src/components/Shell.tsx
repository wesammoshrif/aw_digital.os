import { Sidebar } from "./Sidebar";
import { isMockMode } from "@/lib/mode";
import { STREAK } from "@/lib/mock/data";

export function Shell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar streak={isMockMode ? STREAK : { current: 0, record: 0 }} />
      <main className="flex-1 min-w-0">
        {(title || eyebrow || actions) && (
          <header className="vibrancy-bar sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[var(--color-hairline)] px-8">
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
        <div className="px-8 py-8 rise">{children}</div>
      </main>
    </div>
  );
}
