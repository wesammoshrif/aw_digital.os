"use client";

import { useState } from "react";
import { Repeat, Check } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

const INTERVALS = [
  { v: 0, label: "Aus" },
  { v: 1, label: "Monatlich" },
  { v: 3, label: "Quartalsweise" },
  { v: 6, label: "Halbjährlich" },
  { v: 12, label: "Jährlich" },
];

// Opt-in für den MRR-Automaten: Betrag + Intervall pro gewonnenem Kunden.
// Solange „Aus" gewählt ist, erzeugt der Cron KEINE Rechnung.
export function MaintenanceOptIn({
  leadId,
  maintenance,
  intervalMonths,
}: {
  leadId: string;
  maintenance: string | null;
  intervalMonths: number | null;
}) {
  const [amount, setAmount] = useState(maintenance ?? "");
  const [interval, setInterval] = useState<number>(intervalMonths ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const active =
    !!intervalMonths && intervalMonths > 0 && !!maintenance && Number(maintenance) > 0;

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance: amount.trim() === "" ? null : amount.trim(),
          maintenanceIntervalMonths: interval > 0 ? interval : null,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error ?? "Speichern fehlgeschlagen");
      setSaved(true);
      // Seite neu laden, damit der Aktiv-Status (Serverdaten) stimmt.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Wartung (MRR)"
        eyebrow="Wiederkehrend"
        right={<Repeat className="h-4 w-4 text-[var(--color-copper-400)]" />}
      />
      <div className="space-y-3 px-5 py-4">
        <p className="text-[12px] leading-snug text-[var(--color-fg-mute)]">
          {active ? (
            <>
              Aktiv: <b>{maintenance} €</b> alle{" "}
              <b>{intervalMonths}</b>{" "}
              {intervalMonths === 1 ? "Monat" : "Monate"}. Der Cron erzeugt die
              Rechnungen automatisch.
            </>
          ) : (
            "Aus. Setze Betrag + Intervall, dann werden Wartungsrechnungen automatisch erzeugt — bis dahin passiert nichts."
          )}
        </p>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="z. B. 49"
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-white py-2 pl-3 pr-8 text-[14px] outline-none focus:border-[var(--color-copper-400)]"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--color-fg-mute)]">
              €
            </span>
          </div>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--color-copper-400)]"
          >
            {INTERVALS.map((i) => (
              <option key={i.v} value={i.v}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Gespeichert
            </>
          ) : saving ? (
            "Speichert…"
          ) : (
            "Wartung speichern"
          )}
        </button>
        {err && <p className="text-[12px] text-[var(--color-danger)]">{err}</p>}
      </div>
    </Card>
  );
}
