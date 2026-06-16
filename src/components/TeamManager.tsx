"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type U = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "agent" | "pending";
  approved: boolean;
};

export function TeamManager({ users, meId }: { users: U[]; meId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: string) {
    setBusy(id + action);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <p className="text-[13px] text-[var(--color-fg-mute)]">
        Noch keine Mitarbeiter registriert.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => {
        const self = u.id === meId;
        const status = !u.approved
          ? { label: u.role === "pending" ? "Wartet auf Freigabe" : "Gesperrt", cls: "bg-[#fff7ed] text-[#b25000]" }
          : u.role === "admin"
            ? { label: "Admin", cls: "bg-[#eef2ff] text-[#3730a3]" }
            : { label: "Mitarbeiter", cls: "bg-[#e6f7ea] text-[#1a7f37]" };
        return (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-white/70 p-3 ring-1 ring-black/[0.04]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium text-[var(--color-fg)]">
                {u.name ?? "—"}{" "}
                {self && (
                  <span className="text-[11px] text-[var(--color-fg-mute)]">(du)</span>
                )}
              </div>
              <div className="truncate text-[12px] text-[var(--color-fg-mute)]">
                {u.email}
              </div>
            </div>

            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", status.cls)}>
              {status.label}
            </span>

            <div className="flex flex-wrap gap-1.5">
              {!u.approved && (
                <ActionBtn
                  onClick={() => act(u.id, "approve")}
                  busy={busy === u.id + "approve"}
                  primary
                >
                  Freigeben
                </ActionBtn>
              )}
              {u.approved && u.role === "agent" && !self && (
                <ActionBtn onClick={() => act(u.id, "makeAdmin")} busy={busy === u.id + "makeAdmin"}>
                  Zu Admin
                </ActionBtn>
              )}
              {u.approved && u.role === "admin" && !self && (
                <ActionBtn onClick={() => act(u.id, "makeAgent")} busy={busy === u.id + "makeAgent"}>
                  Zu Mitarbeiter
                </ActionBtn>
              )}
              {u.approved && !self && (
                <ActionBtn onClick={() => act(u.id, "deactivate")} busy={busy === u.id + "deactivate"} danger>
                  Sperren
                </ActionBtn>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  busy,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "rounded-full px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50",
        primary
          ? "bg-[var(--color-copper-500)] text-[var(--color-ink)] hover:bg-[var(--color-copper-400)]"
          : danger
            ? "bg-[#ffeceb] text-[#d70015] hover:bg-[#ffd1cf]"
            : "bg-[var(--color-surface-3)] text-[var(--color-fg-dim)] hover:bg-[var(--color-hairline)]",
      )}
    >
      {busy ? "…" : children}
    </button>
  );
}
