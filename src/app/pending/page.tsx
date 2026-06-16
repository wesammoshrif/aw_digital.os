"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();

  async function signout() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          Konto angelegt
        </div>
        <h1 className="text-display mt-2 text-[24px]">Fast geschafft</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-fg-mute)]">
          Dein Konto wartet auf die Freigabe durch einen Admin. Sobald du
          freigeschaltet bist, kannst du dich anmelden und loslegen.
        </p>
        <button
          onClick={signout}
          className="mt-6 text-[12px] text-[var(--color-copper-500)] hover:underline"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}
