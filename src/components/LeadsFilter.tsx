"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = [
  { v: "all", l: "Alle" },
  { v: "new", l: "Neu" },
  { v: "contacted", l: "Angesprochen" },
  { v: "reached", l: "Erreicht" },
  { v: "audit_sent", l: "Audit" },
  { v: "proposal", l: "Angebot" },
  { v: "won", l: "Gewonnen" },
  { v: "lost", l: "Verloren" },
  { v: "frozen", l: "Eis" },
];

export function LeadsFilter({
  activeStatus,
  onStatusChange,
  onSearch,
  count,
}: {
  activeStatus: string;
  onStatusChange: (s: string) => void;
  onSearch: (q: string) => void;
  count: number;
}) {
  const [q, setQ] = useState("");
  return (
    <div className="mb-5 flex items-center gap-3">
      {/* Search field — iOS rounded inset */}
      <div className="flex items-center rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2">
        <Search className="mr-2 h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Suchen"
          className="w-56 bg-transparent text-[13.5px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-mute)]"
        />
      </div>

      {/* iOS segmented control */}
      <div className="flex items-center gap-0.5 rounded-[11px] bg-[var(--color-surface-2)] p-[3px]">
        {STATUSES.map((s) => {
          const active = activeStatus === s.v;
          return (
            <button
              key={s.v}
              onClick={() => onStatusChange(s.v)}
              className={cn(
                "rounded-[8px] px-3 py-1 text-[12.5px] font-medium transition",
                active
                  ? "bg-white text-[var(--color-fg)] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                  : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]",
              )}
            >
              {s.l}
            </button>
          );
        })}
      </div>

      <div className="ml-auto text-[12.5px] text-[var(--color-fg-mute)]">
        {count} Leads
      </div>
    </div>
  );
}
