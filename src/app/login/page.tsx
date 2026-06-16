"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setError("Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            AW Digital OS
          </div>
          <h1 className="text-display mt-2 text-[26px]">Anmelden</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-copper-500)]"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-copper-500)]"
          />
          {error && <p className="text-[12px] text-[#d70015]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[var(--color-copper-500)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-copper-400)] disabled:opacity-50"
          >
            {busy ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
        <p className="mt-5 text-center text-[12px] text-[var(--color-fg-mute)]">
          Noch kein Konto?{" "}
          <Link href="/signup" className="text-[var(--color-copper-500)] hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
