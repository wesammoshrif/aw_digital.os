"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        // Link führt über /auth/callback (tauscht code→Session) weiter zur
        // „Neues Passwort"-Seite.
        redirectTo: `${window.location.origin}/auth/callback?next=/account/password`,
      },
    );
    setBusy(false);
    if (error) {
      setError("Konnte die Reset-Mail gerade nicht senden. Bitte später erneut versuchen.");
      return;
    }
    // Aus Datenschutzgründen verrät Supabase nicht, ob die Mail existiert —
    // wir zeigen immer dieselbe Bestätigung.
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            AW Digital OS
          </div>
          <h1 className="text-display mt-2 text-[26px]">Passwort zurücksetzen</h1>
          <p className="mt-2 text-[12px] text-[var(--color-fg-mute)]">
            Wir schicken dir einen Link, mit dem du ein neues Passwort vergibst.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md bg-[#e6f7ea] px-4 py-3 text-[13px] text-[#1a7f37]">
            Wenn ein Konto zu dieser E-Mail existiert, ist die Reset-Mail
            unterwegs. Prüfe dein Postfach (auch den Spam-Ordner) und klick den
            Link.
          </div>
        ) : (
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
            {error && <p className="text-[12px] text-[#d70015]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[var(--color-copper-500)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-copper-400)] disabled:opacity-50"
            >
              {busy ? "Sende…" : "Reset-Link senden"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-[12px] text-[var(--color-fg-mute)]">
          <Link href="/login" className="text-[var(--color-copper-500)] hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </div>
  );
}
