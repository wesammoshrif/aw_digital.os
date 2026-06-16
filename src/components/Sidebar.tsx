"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone,
  Users,
  LayoutGrid,
  Radio,
  Gauge,
  Wand2,
  Settings,
  Search,
  Briefcase,
  Euro,
  CalendarClock,
  Radar,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./ui/Logo";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Heute", icon: Phone },
  { href: "/leads/finder", label: "Leads finden", icon: Radar },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: LayoutGrid },
  { href: "/projects", label: "Projekte", icon: Briefcase },
  { href: "/termine", label: "Termine", icon: CalendarClock },
  { href: "/finances", label: "Finanzen", icon: Euro },
  { href: "/triggers", label: "Trigger", icon: Radio },
  { href: "/audits", label: "Audits", icon: Gauge },
  { href: "/mockups", label: "Mockups", icon: Wand2 },
];

export function Sidebar({
  streak,
}: {
  streak: { current: number; record: number };
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Längster passender Nav-Pfad gewinnt (sonst leuchten /leads UND /leads/finder).
  const activeHref = NAV.reduce((best, item) => {
    const match =
      item.href === "/"
        ? path === "/"
        : path === item.href || path.startsWith(item.href + "/");
    return match && item.href.length > best.length ? item.href : best;
  }, "");

  return (
    <>
      {/* Hamburger — nur Handy/iPad-Hochkant (unter md) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        className="vibrancy fixed left-3 top-2.5 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-hairline)] text-[var(--color-fg-dim)] shadow-[var(--shadow-1)] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "vibrancy fixed inset-y-0 left-0 z-50 flex h-screen w-[264px] flex-col border-r border-[var(--color-hairline)] px-3 py-4 transition-transform duration-200",
          "md:sticky md:top-0 md:z-auto md:w-[240px] md:shrink-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-2.5 pt-1 pb-5">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menü schließen"
            className="text-[var(--color-fg-mute)] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

      <button
        type="button"
        className="mb-5 flex w-full items-center gap-2 rounded-[var(--radius-md)] bg-black/[0.05] px-3 py-2 text-[13px] text-[var(--color-fg-mute)] transition hover:bg-black/[0.07]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Suchen</span>
        <kbd className="ml-auto text-[11px] text-[var(--color-fg-faint)]">⌘K</kbd>
      </button>

      <nav className="flex-1 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-black/[0.06] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-dim)] hover:bg-black/[0.04]",
              )}
            >
              <Icon
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  active
                    ? "text-[var(--color-copper-500)]"
                    : "text-[var(--color-fg-mute)]",
                )}
                strokeWidth={2}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 pt-3">
        <StreakCard streak={streak} />
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13.5px] font-medium transition-colors",
            path === "/settings"
              ? "bg-black/[0.06] text-[var(--color-fg)]"
              : "text-[var(--color-fg-dim)] hover:bg-black/[0.04]",
          )}
        >
          <Settings
            className="h-[17px] w-[17px] text-[var(--color-fg-mute)]"
            strokeWidth={2}
          />
          <span>Einstellungen</span>
        </Link>
        <UserMenu />
      </div>
      </aside>
    </>
  );
}

function StreakCard({
  streak,
}: {
  streak: { current: number; record: number };
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-white/70 p-3.5 shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-medium text-[var(--color-fg-mute)]">
          Streak
        </div>
        <div className="text-[11px] text-[var(--color-fg-faint)]">
          Rekord {streak.record}
        </div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="num text-[28px] font-semibold leading-none text-[var(--color-fg)]">
          {streak.current}
        </span>
        <span className="text-[12px] text-[var(--color-fg-mute)]">Tage</span>
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {Array.from({ length: 14 }).map((_, i) => {
          const filled = i >= 14 - streak.current;
          return (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition",
                filled
                  ? "bg-[var(--color-copper-500)]"
                  : "bg-[var(--color-surface-3)]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
