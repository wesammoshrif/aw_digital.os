"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogOut, Users } from "lucide-react";

type Me = {
  name: string | null;
  email: string;
  role: "admin" | "agent" | "pending";
};

export function UserMenu() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user && setMe(d.user))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  if (!me) return null;
  const isAdmin = me.role === "admin";

  return (
    <div className="rounded-[var(--radius-lg)] bg-white/70 p-3 shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[11px] font-semibold text-[var(--color-ink)]">
          {(me.name ?? me.email).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium text-[var(--color-fg)]">
            {me.name ?? me.email}
          </div>
          <div className="flex items-center gap-1 text-[10.5px] text-[var(--color-fg-mute)]">
            {isAdmin && <Shield className="h-3 w-3 text-[var(--color-copper-500)]" />}
            {isAdmin ? "Admin" : "Mitarbeiter"}
          </div>
        </div>
      </div>

      {isAdmin && (
        <Link
          href="/team"
          className="mt-2.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-[var(--color-fg-dim)] transition hover:bg-black/[0.04]"
        >
          <Users className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
          Team verwalten
        </Link>
      )}
      <button
        onClick={logout}
        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-[var(--color-fg-dim)] transition hover:bg-black/[0.04]"
      >
        <LogOut className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
        Abmelden
      </button>
    </div>
  );
}
