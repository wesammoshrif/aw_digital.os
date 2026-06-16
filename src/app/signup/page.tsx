"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes("already")
          ? "Diese E-Mail ist bereits registriert."
          : "Registrierung fehlgeschlagen. Bitte Eingaben prüfen.",
      );
      setBusy(false);
      return;
    }
    // Profil serverseitig anlegen (Rolle wird aus ADMIN_EMAILS bestimmt).
    await fetch("/api/auth/profile", { method: "POST" }).catch(() => {});
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
          <h1 className="text-display mt-2 text-[26px]">Konto erstellen</h1>
          <p className="mt-2 text-[12px] text-[var(--color-fg-mute)]">
            Nach der Registrierung gibt ein Admin dich frei.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-copper-500)]"
          />
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
            autoComplete="new-password"
            placeholder="Passwort (min. 8 Zeichen)"
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
            {busy ? "Erstelle…" : "Registrieren"}
          </button>
        </form>
        <p className="mt-5 text-center text-[12px] text-[var(--color-fg-mute)]">
          Schon ein Konto?{" "}
          <Link href="/login" className="text-[var(--color-copper-500)] hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
