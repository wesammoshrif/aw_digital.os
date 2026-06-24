"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_OPTIONS = [
  { v: "new", l: "Neu", dot: "var(--color-copper-500)" },
  { v: "contacted", l: "Angesprochen", dot: "var(--color-fg-mute)" },
  { v: "reached", l: "Erreicht", dot: "var(--color-copper-500)" },
  { v: "audit_sent", l: "Audit/Termin", dot: "var(--color-copper-500)" },
  { v: "proposal", l: "Angebot", dot: "var(--color-copper-500)" },
  { v: "won", l: "Gewonnen", dot: "var(--color-success)" },
  { v: "lost", l: "Verloren", dot: "var(--color-danger)" },
  { v: "frozen", l: "Eis", dot: "var(--color-fg-mute)" },
] as const;

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.v, o.l]),
);
const STATUS_DOT: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.v, o.dot]),
);

export function StatusMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: r.left });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // Das Portal-Menü liegt an festen Pixel-Koordinaten — beim Scrollen/Resize
    // schließen, damit es nicht vom Button wegschwebt (capture: auch innere
    // Scroll-Container).
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] py-0.5 pl-2 pr-1.5 text-[12px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-3)]",
          open && "bg-[var(--color-surface-3)]",
        )}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: STATUS_DOT[value] }}
        />
        {STATUS_LABEL[value] ?? value}
        <ChevronDown className="h-3 w-3 text-[var(--color-fg-faint)]" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className="z-50 w-52 rounded-[12px] bg-white/95 p-1 shadow-[var(--shadow-3)] ring-1 ring-black/[0.06] backdrop-blur-xl"
          >
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  onChange(o.v);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[13px] text-[var(--color-fg)] transition hover:bg-[var(--color-surface-2)]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: o.dot }}
                />
                <span className="flex-1 text-left">{o.l}</span>
                {o.v === value && (
                  <Check className="h-3.5 w-3.5 text-[var(--color-copper-500)]" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
