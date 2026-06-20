"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth
      .getSession()
      .then(({ data }) => setHasSession(!!data.session))
      .catch(() => setHasSession(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        "Konnte das Passwort nicht ändern. Komm über den Reset-Link oder melde dich neu an.",
      );
      return;
    }
    setOk(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            AW Digital OS
          </div>
          <h1 className="text-display mt-2 text-[26px]">Neues Passwort</h1>
        </div>

        {hasSession === false && (
          <div className="mb-3 rounded-md bg-[#fff7ed] px-4 py-3 text-[12.5px] text-[#b25000]">
            Keine aktive Sitzung. Öffne den Link aus der Reset-Mail oder melde
            dich an, um das Passwort zu ändern.
          </div>
        )}

        {ok ? (
          <div className="rounded-md bg-[#e6f7ea] px-4 py-3 text-[13px] text-[#1a7f37]">
            Passwort geändert. Du wirst weitergeleitet…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Neues Passwort (min. 8 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-copper-500)]"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-copper-500)]"
            />
            {error && <p className="text-[12px] text-[#d70015]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[var(--color-copper-500)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-copper-400)] disabled:opacity-50"
            >
              {busy ? "Speichere…" : "Passwort speichern"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-[12px] text-[var(--color-fg-mute)]">
          <Link href="/" className="text-[var(--color-copper-500)] hover:underline">
            Zurück
          </Link>
        </p>
      </div>
    </div>
  );
}
