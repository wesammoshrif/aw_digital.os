"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { isMockMode } from "@/lib/mode";

const TRADES = [
  "dachdecker",
  "maler",
  "elektriker",
  "shk",
  "tischler",
  "fliesenleger",
  "maurer",
  "galabau",
  "solar",
] as const;

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company: "",
    trade: "dachdecker",
    phone: "",
    email: "",
    city: "",
    postalCode: "",
    website: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) {
      setError("Firma ist Pflicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error ?? "Anlegen fehlgeschlagen");
      router.push(`/leads/${res.id}`);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell eyebrow="Neuanlage" title="Neuer Lead">
      <Card className="max-w-2xl">
        <CardHeader title="Stammdaten" eyebrow="Manuell" />
        <form className="space-y-4 px-5 py-5" onSubmit={submit}>
          {isMockMode && (
            <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#7a5e1f]">
              Demo ohne Datenbank — Anlegen ist deaktiviert, bis Supabase
              verbunden ist. Daten testweise eingeben geht, gespeichert wird
              nichts.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Firma *"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Müller Bedachungen GmbH"
              autoFocus
              required
            />
            <Select
              label="Gewerk"
              value={form.trade}
              onChange={(e) => set("trade", e.target.value)}
              options={TRADES as unknown as string[]}
            />
            <Input
              label="Telefon"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+49 511 …"
              inputMode="tel"
            />
            <Input
              label="E-Mail"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@…"
            />
            <Input
              label="Stadt"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Hannover"
            />
            <Input
              label="PLZ"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              placeholder="30159"
            />
          </div>
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://…"
            type="url"
          />
          <Textarea
            label="Notiz"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Kontext, Trigger, Hook…"
          />

          {error && (
            <div className="rounded-md bg-[#fff0ef] px-3 py-2 text-[12.5px] text-[#a40012]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || isMockMode}
            >
              {busy ? "Anlegen…" : "Lead anlegen"}
            </Button>
          </div>
        </form>
      </Card>
    </Shell>
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
  options: string[];
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
          <option key={o} value={o}>
            {o}
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
