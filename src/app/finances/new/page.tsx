"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { isMockMode } from "@/lib/mode";

const TYPE_OPTIONS = [
  { value: "one_time", label: "Einmalig" },
  { value: "deposit", label: "Anzahlung" },
  { value: "recurring_maintenance", label: "Wartung" },
  { value: "recurring_hosting", label: "Hosting" },
] as const;

const QUOTE_STATUS = [
  { value: "draft", label: "Entwurf" },
  { value: "sent", label: "Versendet" },
  { value: "accepted", label: "Angenommen" },
  { value: "declined", label: "Abgelehnt" },
] as const;

const INVOICE_STATUS = [
  { value: "draft", label: "Entwurf" },
  { value: "sent", label: "Versendet" },
  { value: "paid", label: "Bezahlt" },
  { value: "overdue", label: "Überfällig" },
] as const;

export default function NewInvoicePage() {
  const router = useRouter();
  const [kind, setKind] = useState<"quote" | "invoice">("quote");
  const [form, setForm] = useState({
    invoiceNumber: "",
    leadId: "",
    type: "one_time",
    amount: "",
    status: "draft",
    dueDate: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function switchKind(next: "quote" | "invoice") {
    setKind(next);
    // Status zurücksetzen, falls er im neuen Kontext ungültig wäre.
    const allowed = next === "quote" ? QUOTE_STATUS : INVOICE_STATUS;
    if (!allowed.some((s) => s.value === form.status)) {
      set("status", "draft");
    }
  }

  const statusOptions = kind === "quote" ? QUOTE_STATUS : INVOICE_STATUS;
  const numberPlaceholder = kind === "quote" ? "AN-2026-00X" : "RE-2026-00X";
  const dueLabel = kind === "quote" ? "Gültig bis" : "Fällig am";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoiceNumber.trim()) {
      setError("Belegnummer ist Pflicht.");
      return;
    }
    if (!form.leadId.trim()) {
      setError("Lead-ID ist Pflicht.");
      return;
    }
    if (!form.amount.trim()) {
      setError("Betrag ist Pflicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          invoiceNumber: form.invoiceNumber.trim(),
          leadId: form.leadId.trim(),
          type: form.type,
          amount: form.amount,
          status: form.status,
          dueDate: form.dueDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error ?? res.message ?? "Anlegen fehlgeschlagen");
      router.push("/finances");
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell eyebrow="Neuanlage" title={kind === "quote" ? "Neues Angebot" : "Neue Rechnung"}>
      <Card className="max-w-2xl">
        <CardHeader title="Beleg" eyebrow="Angebot oder Rechnung" />
        <form className="space-y-4 px-5 py-5" onSubmit={submit}>
          {isMockMode && (
            <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#7a5e1f]">
              Demo-Modus — Speichern deaktiviert, bis Supabase verbunden ist.
            </div>
          )}

          <div>
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Art
            </span>
            <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 p-0.5">
              <KindToggle active={kind === "quote"} onClick={() => switchKind("quote")}>
                Angebot
              </KindToggle>
              <KindToggle active={kind === "invoice"} onClick={() => switchKind("invoice")}>
                Rechnung
              </KindToggle>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Belegnummer *"
              value={form.invoiceNumber}
              onChange={(e) => set("invoiceNumber", e.target.value)}
              placeholder={numberPlaceholder}
              autoFocus
              required
            />
            <Input
              label="Lead-ID *"
              value={form.leadId}
              onChange={(e) => set("leadId", e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              required
            />
            <Select
              label="Typ"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              options={TYPE_OPTIONS}
            />
            <Input
              label="Betrag (€) *"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              required
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              options={statusOptions}
            />
            <Input
              label={dueLabel}
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </div>

          <Textarea
            label="Notiz"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Leistungsumfang, Konditionen, Kontext…"
          />

          {error && (
            <div className="rounded-md bg-[#fff0ef] px-3 py-2 text-[12.5px] text-[#a40012]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" disabled={busy || isMockMode}>
              {busy ? "Speichern…" : kind === "quote" ? "Angebot anlegen" : "Rechnung anlegen"}
            </Button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}

function KindToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-[calc(var(--radius-md)-2px)] px-4 py-1.5 text-[13px] transition-colors " +
        (active
          ? "bg-[var(--color-surface)] font-semibold text-[var(--color-fg)] shadow-sm"
          : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]")
      }
    >
      {children}
    </button>
  );
}

function Input({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
        {label}
      </span>
      <input
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-copper-500)] focus:bg-[var(--color-surface)]"
        {...rest}
      />
    </label>
  );
}

function Select({
  label,
  options,
  ...rest
}: {
  label: string;
  options: readonly { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
        {label}
      </span>
      <select
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-500)]"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  ...rest
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
        {label}
      </span>
      <textarea
        rows={3}
        className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-copper-500)] focus:bg-[var(--color-surface)]"
        {...rest}
      />
    </label>
  );
}
