"use client";

/**
 * Route-Error-Boundary. Zeigt eine generische Meldung — niemals die rohe
 * Fehlermeldung (kann interne Details leaken). Details landen nur im Log.
 */
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] Render-Fehler:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          Fehler
        </div>
        <h1 className="text-display mt-2 text-[28px]">Etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-[13px] text-[var(--color-fg-mute)]">
          Bitte erneut versuchen. Falls es bleibt, lade die Seite neu.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-block rounded-md bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-copper-400)]"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
