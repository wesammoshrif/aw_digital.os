"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { isMockMode } from "@/lib/mode";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planung" },
  { value: "design", label: "Design" },
  { value: "development", label: "Entwicklung" },
  { value: "review", label: "Review" },
  { value: "live", label: "Live" },
  { value: "on_hold", label: "Pausiert" },
] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    leadId: "",
    status: "planning",
    description: "",
    deadline: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Projektname ist Pflicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.message ?? res.error ?? "Anlegen fehlgeschlagen");
      router.push("/projects");
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell eyebrow="Neuanlage" title="Neues Projekt">
      <Card className="max-w-2xl">
        <CardHeader title="Projektdaten" eyebrow="Manuell" />
        <form className="space-y-4 px-5 py-5" onSubmit={submit}>
          {isMockMode && (
            <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#7a5e1f]">
              Demo-Modus — Speichern ist deaktiviert, bis Supabase verbunden ist.
            </div>
          )}

          <Input
            label="Projektname *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Website-Relaunch Müller GmbH"
            autoFocus
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lead-ID"
              value={form.leadId}
              onChange={(e) => set("leadId", e.target.value)}
              placeholder="optional"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Beschreibung"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Umfang, Ziele, Kontext…"
          />

          <Input
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
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
              {busy ? "Anlegen…" : "Projekt anlegen"}
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
  children,
  ...rest
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
        {label}
      </span>
      <select
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-500)]"
        {...rest}
      >
        {children}
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
