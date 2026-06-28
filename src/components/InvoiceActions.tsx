"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Aktions-Zelle für die Finanzen-Tabelle.
 *  - Angebot (kind=quote): „In Rechnung umwandeln" → POST /convert.
 *  - Rechnung (kind=invoice): „Als bezahlt" → PATCH {status:"paid"} (stempelt paidAt).
 * Nach Erfolg router.refresh() (Server-Component lädt neu).
 */
export function InvoiceActions({
  id,
  kind,
  status,
  converted,
}: {
  id: string;
  kind: "quote" | "invoice";
  status: string;
  converted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function run(fn: () => Promise<Response>) {
    setBusy(true);
    setErr(false);
    try {
      const res = await fn().then((r) => r.json());
      if (!res.ok) throw new Error(res.error ?? "Fehler");
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50";

  if (kind === "quote") {
    if (converted)
      return (
        <span className="text-[12px] text-[var(--color-fg-mute)]">
          umgewandelt
        </span>
      );
    if (status === "declined")
      return <span className="text-[12px] text-[var(--color-fg-mute)]">—</span>;
    return (
      <button
        onClick={() =>
          run(() => fetch(`/api/invoices/${id}/convert`, { method: "POST" }))
        }
        disabled={busy}
        className={`${btn} bg-[var(--color-copper-500)] text-white hover:bg-[#0077ed]`}
        title="Angebot in Rechnung umwandeln (Lead → gewonnen)"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Receipt className="h-3.5 w-3.5" />
        )}
        {err ? "Nochmal" : "In Rechnung"}
      </button>
    );
  }

  // kind === "invoice"
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-success)]">
        <CheckCircle2 className="h-3.5 w-3.5" /> bezahlt
      </span>
    );
  if (status === "cancelled")
    return <span className="text-[12px] text-[var(--color-fg-mute)]">—</span>;
  return (
    <button
      onClick={() =>
        run(() =>
          fetch(`/api/invoices/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "paid" }),
          }),
        )
      }
      disabled={busy}
      className={`${btn} bg-[#e6f7ea] text-[#1a7f37] hover:bg-[#d6f0de]`}
      title="Rechnung als bezahlt markieren (zählt zum Umsatz)"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {err ? "Nochmal" : "Als bezahlt"}
    </button>
  );
}
