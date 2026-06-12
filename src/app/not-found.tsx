import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
          404
        </div>
        <h1 className="text-display mt-2 text-[28px]">Nicht gefunden</h1>
        <p className="mt-2 text-[13px] text-[var(--color-fg-mute)]">
          Diese Seite existiert nicht — oder noch nicht.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-copper-400)]"
        >
          Zurück zur Heute-Ansicht
        </Link>
      </div>
    </div>
  );
}
