"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ReviewRow = {
  id: string;
  rating: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  failurePoints: string[] | null;
  summary: string | null;
  coaching: string | null;
  callsAnalyzed: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

const PERIODS = [
  { days: 7, label: "7 Tage" },
  { days: 30, label: "30 Tage" },
  { days: 90, label: "90 Tage" },
];

function ratingTone(r: number | null) {
  const v = r ?? 0;
  if (v >= 70) return { text: "text-[#1a7f37]", bar: "bg-[#1a7f37]", ring: "ring-[#1a7f37]/20" };
  if (v >= 40) return { text: "text-[#b25000]", bar: "bg-[#b25000]", ring: "ring-[#b25000]/20" };
  return { text: "text-[#d70015]", bar: "bg-[#d70015]", ring: "ring-[#d70015]/20" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function AgentReviewPanel({
  agentId,
  agentName,
  reviews,
}: {
  agentId: string;
  agentName: string;
  reviews: ReviewRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/agent-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, periodDays }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data?.message || data?.error || "Bewertung fehlgeschlagen.");
      } else {
        setNotice(
          data.generatedBy === "ai"
            ? "KI-Bewertung erstellt."
            : "Rechnerische Bewertung erstellt (kein KI-Key aktiv).",
        );
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  const latest = reviews[0];
  const older = reviews.slice(1);

  return (
    <div className="space-y-5">
      {/* Steuerung */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--color-fg)]">
              KI-Leistungsbewertung
            </div>
            <div className="text-[12px] text-[var(--color-fg-mute)]">
              Vertraulich — nur Admins. {agentName} sieht das nie.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-[var(--color-surface-2)] p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setPeriodDays(p.days)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    periodDays === p.days
                      ? "bg-white text-[var(--color-fg)] shadow-sm"
                      : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={generate} disabled={busy}>
              {busy ? "Analysiere…" : latest ? "Neu bewerten" : "Bewertung generieren"}
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-[10px] bg-[#fff0ef] px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="mt-3 rounded-[10px] bg-[#e6f7ea] px-3 py-2 text-[12px] text-[#1a7f37]">
            {notice}
          </p>
        )}
      </Card>

      {/* Aktuellste Bewertung */}
      {latest ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-5 border-b border-[var(--color-hairline)] p-5">
            <RatingDial value={latest.rating} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-mute)]">
                Einschätzung · {fmtDate(latest.createdAt)} · {latest.callsAnalyzed ?? 0} Anrufe
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-fg)]">
                {latest.summary || "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-px bg-[var(--color-hairline)] sm:grid-cols-2">
            <Section title="Stärken" items={latest.strengths} tone="success" />
            <Section title="Schwächen" items={latest.weaknesses} tone="warm" />
            <Section title="Scheiterpunkte" items={latest.failurePoints} tone="danger" />
            <CoachingSection coaching={latest.coaching} />
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-[13.5px] text-[var(--color-fg-mute)]">
            Noch keine Bewertung. Wähle einen Zeitraum und generiere die erste Einschätzung.
          </p>
        </Card>
      )}

      {/* Verlauf */}
      {older.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-[12px] font-semibold text-[var(--color-fg-mute)]">
            Frühere Bewertungen
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {older.map((r) => {
              const tone = ratingTone(r.rating);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <span className={cn("w-8 shrink-0 text-[15px] font-semibold tabular-nums", tone.text)}>
                    {r.rating ?? "–"}
                  </span>
                  <span className="w-24 shrink-0 text-[12px] text-[var(--color-fg-mute)]">
                    {fmtDate(r.createdAt)}
                  </span>
                  <span className="truncate text-[12.5px] text-[var(--color-fg-dim)]">
                    {r.summary || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function RatingDial({ value }: { value: number | null }) {
  const v = value ?? 0;
  const tone = ratingTone(value);
  return (
    <div className={cn("flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-white ring-4", tone.ring)}>
      <span className={cn("text-[26px] font-semibold leading-none tabular-nums", tone.text)}>{v}</span>
      <span className="text-[10px] text-[var(--color-fg-mute)]">/ 100</span>
    </div>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[] | null;
  tone: "success" | "warm" | "danger";
}) {
  const dot =
    tone === "success" ? "bg-[#1a7f37]" : tone === "warm" ? "bg-[#b25000]" : "bg-[#d70015]";
  return (
    <div className="bg-white p-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-mute)]">
        {title}
      </div>
      <ul className="space-y-1.5">
        {(items && items.length ? items : ["—"]).map((it, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-[var(--color-fg)]">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoachingSection({ coaching }: { coaching: string | null }) {
  return (
    <div className="bg-[#f5faff] p-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-copper-700)]">
        Coaching nächste Woche
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--color-fg)]">{coaching || "—"}</p>
    </div>
  );
}
