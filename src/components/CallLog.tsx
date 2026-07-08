"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone, ArrowUpRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CallLogRow = {
  id: string;
  startedAt: string; // ISO
  durationSec: number | null;
  dispo: string | null;
  sentiment: string | null;
  note: string | null;
  leadId: string;
  company: string | null;
  phone: string | null;
  trade: string | null;
  city: string | null;
  agentId: string;
  agentName: string | null;
  agentEmail: string | null;
};

// Disposition = „Kategorie" eines Anrufs. Reihenfolge der Filter-Chips.
const DISPO_META: Record<string, { label: string; tone: Tone }> = {
  appointment: { label: "Termin", tone: "success" },
  interested: { label: "Interesse", tone: "copper" },
  callback: { label: "Rückruf", tone: "neutral" },
  not_interested: { label: "Kein Interesse", tone: "danger" },
  voicemail: { label: "Mailbox", tone: "neutral" },
  no_answer: { label: "Nicht erreicht", tone: "neutral" },
  busy: { label: "Besetzt", tone: "neutral" },
  wrong_number: { label: "Falsche Nr.", tone: "danger" },
};
const DISPO_ORDER = [
  "appointment",
  "interested",
  "callback",
  "not_interested",
  "voicemail",
  "no_answer",
  "busy",
  "wrong_number",
];

type Tone = "success" | "copper" | "neutral" | "danger" | "warn";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[#e8f6ee] text-[#1a7f43]",
  copper: "bg-[#eef5ff] text-[#0a4ea3]",
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)]",
  danger: "bg-[#ffeceb] text-[#c4262e]",
  warn: "bg-[#fff4e5] text-[#b25000]",
};

type Range = "today" | "7" | "30" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "7", label: "7 Tage" },
  { key: "30", label: "30 Tage" },
  { key: "all", label: "Alle" },
];

// Tages-Schlüssel in Europe/Berlin (sonst kippen Abend-/Morgen-Anrufe auf den
// falschen Tag).
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
// Tagebuch-Kopfzeile: „Montag, 23. Juni".
const longDateFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "numeric",
  month: "long",
});

// Voller Farbpunkt je Kategorie (Tagebuch-Zeitstrahl).
const DOT_CLASS: Record<Tone, string> = {
  success: "bg-[var(--color-success)]",
  copper: "bg-[var(--color-copper-500)]",
  neutral: "bg-[var(--color-fg-faint)]",
  danger: "bg-[var(--color-danger)]",
  warn: "bg-[var(--color-warm)]",
};

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function catOf(dispo: string | null): string {
  return dispo && DISPO_META[dispo] ? dispo : "none";
}

export function CallLog({
  rows,
  nowMs: nowMsProp,
}: {
  rows: CallLogRow[];
  nowMs?: number;
}) {
  const [range, setRange] = useState<Range>("today");
  const [cat, setCat] = useState<string>("all");
  const [agent, setAgent] = useState<string>("all");
  const [view, setView] = useState<"diary" | "table">("diary");

  // Jetzt-Zeit als State: serverseitig geseedet (kein Hydration-Mismatch an der
  // Tagesgrenze), nach dem Mount + minütlich aktualisiert (Mitternachts-
  // Rollover ohne Nutzer-Interaktion korrekt).
  const [nowMs, setNowMs] = useState(nowMsProp ?? Date.now());
  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const now = nowMs;
  const todayKey = dayFmt.format(new Date(nowMs));
  const yesterdayKey = dayFmt.format(new Date(nowMs - 86_400_000));

  // Agenten aus den Daten (für den Agent-Filter, nur wenn mehrere).
  const agents = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows)
      if (!m.has(r.agentId))
        m.set(r.agentId, r.agentName || r.agentEmail || "Unbekannt");
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  // 1. Zeitraum + Agent (bestimmt die Grundmenge für Kategorie-Zähler).
  const inScope = useMemo(() => {
    return rows.filter((r) => {
      if (agent !== "all" && r.agentId !== agent) return false;
      const t = new Date(r.startedAt).getTime();
      if (range === "today") return dayFmt.format(new Date(r.startedAt)) === todayKey;
      if (range === "7") return now - t <= 7 * 86_400_000;
      if (range === "30") return now - t <= 30 * 86_400_000;
      return true;
    });
  }, [rows, range, agent, todayKey, now]);

  // 2. Kategorie-Zähler innerhalb des Zeitraums.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inScope.length };
    for (const r of inScope) {
      const k = catOf(r.dispo);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [inScope]);

  // 3. Auf Kategorie filtern.
  const visible = useMemo(() => {
    if (cat === "all") return inScope;
    return inScope.filter((r) => catOf(r.dispo) === cat);
  }, [inScope, cat]);

  // Tagebuch: nach Tag gruppieren (visible ist bereits absteigend sortiert).
  const byDay = useMemo(() => {
    const map = new Map<string, CallLogRow[]>();
    for (const r of visible) {
      const k = dayFmt.format(new Date(r.startedAt));
      const arr = map.get(k);
      if (arr) arr.push(r);
      else map.set(k, [r]);
    }
    return [...map.entries()];
  }, [visible]);

  const noResult = counts["none"] ?? 0;

  // Kategorie-Chips: Alle, Ohne Ergebnis, dann vorhandene Dispos.
  const catChips: { key: string; label: string; tone: Tone }[] = [
    { key: "all", label: "Alle", tone: "neutral" },
    { key: "none", label: "Ohne Ergebnis", tone: "warn" },
    ...DISPO_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => ({
      key: k,
      label: DISPO_META[k].label,
      tone: DISPO_META[k].tone,
    })),
  ];

  const showAgentCol = agents.length > 1;

  return (
    <>
      {/* Zeitraum + Zusammenfassung */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-[var(--color-surface-2)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                range === r.key
                  ? "bg-white text-[var(--color-fg)] shadow-[var(--shadow-1)]"
                  : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Ansicht umschalten: Tagebuch (nach Tag) oder klassische Tabelle */}
        <div className="flex rounded-full bg-[var(--color-surface-2)] p-0.5">
          {(
            [
              { key: "diary", label: "Tagebuch" },
              { key: "table", label: "Tabelle" },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                view === v.key
                  ? "bg-white text-[var(--color-fg)] shadow-[var(--shadow-1)]"
                  : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="ml-1 text-[13px] text-[var(--color-fg-dim)]">
          <span className="font-semibold text-[var(--color-fg)]">
            {inScope.length}
          </span>{" "}
          {inScope.length === 1 ? "Anruf" : "Anrufe"}
          {noResult > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-[#b25000]">{noResult}</span>{" "}
              ohne Ergebnis
            </>
          )}
        </div>

        {/* Agent-Filter (nur wenn mehrere Agents in den Daten) */}
        {showAgentCol && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setAgent("all")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                agent === "all"
                  ? "bg-black/[0.07] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-mute)] hover:bg-black/[0.04]",
              )}
            >
              Alle Agents
            </button>
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => setAgent(a.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                  agent === a.id
                    ? "bg-black/[0.07] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-mute)] hover:bg-black/[0.04]",
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kategorie-Chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {catChips.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "bg-[var(--color-fg)] text-white"
                  : cn(TONE_CLASS[c.tone], "hover:opacity-80"),
              )}
            >
              {c.key === "none" && !active && (
                <AlertTriangle className="h-3 w-3" />
              )}
              {c.label}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-white/70" : "opacity-60",
                )}
              >
                {counts[c.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ansicht: Tagebuch (nach Tag) oder klassische Tabelle */}
      {view === "diary" ? (
        <DiaryView
          byDay={byDay}
          todayKey={todayKey}
          yesterdayKey={yesterdayKey}
          showAgent={showAgentCol}
          empty={visible.length === 0}
        />
      ) : (
      <div className="overflow-x-auto rounded-[18px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--color-hairline)] text-left text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
              <th className="px-4 py-2.5">Zeit</th>
              {showAgentCol && <th className="px-4 py-2.5">Agent</th>}
              <th className="px-4 py-2.5">Firma</th>
              <th className="px-4 py-2.5">Kategorie</th>
              <th className="px-4 py-2.5">Notiz</th>
              <th className="px-4 py-2.5 text-right">Dauer</th>
              <th className="px-4 py-2.5 text-right">Öffnen</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const d = new Date(r.startedAt);
              const meta = r.dispo ? DISPO_META[r.dispo] : null;
              return (
                <tr
                  key={r.id}
                  className="group border-b border-[var(--color-hairline)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--color-fg-dim)]">
                    <span className="text-[var(--color-fg)]">
                      {timeFmt.format(d)}
                    </span>
                    <span className="ml-2 text-[12px] text-[var(--color-fg-mute)]">
                      {dateFmt.format(d)}
                    </span>
                  </td>
                  {showAgentCol && (
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-fg-dim)]">
                      {r.agentName || r.agentEmail || "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${r.leadId}`}
                      className="font-medium text-[var(--color-fg)] group-hover:text-[var(--color-copper-600)]"
                    >
                      {r.company || "Unbekannt"}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--color-fg-mute)]">
                      {r.phone && <span>{r.phone}</span>}
                      {r.trade && <span>· {r.trade}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {meta ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium",
                          TONE_CLASS[meta.tone],
                        )}
                      >
                        {meta.label}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium",
                          TONE_CLASS.warn,
                        )}
                      >
                        <AlertTriangle className="h-3 w-3" /> Ohne Ergebnis
                      </span>
                    )}
                  </td>
                  <td className="max-w-[34ch] px-4 py-3 text-[12.5px] text-[var(--color-fg-dim)]">
                    {r.note ? (
                      <span className="line-clamp-2">{r.note}</span>
                    ) : (
                      <span className="text-[var(--color-fg-faint)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[var(--color-fg-dim)]">
                    {fmtDuration(r.durationSec)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          title={`Anrufen · ${r.phone}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-white shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition hover:bg-[#0077ed] active:scale-95"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link
                        href={`/leads/${r.leadId}`}
                        title="Lead öffnen"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-mute)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={showAgentCol ? 7 : 6}
                  className="px-4 py-16 text-center text-[13px] text-[var(--color-fg-mute)]"
                >
                  Keine Anrufe in diesem Zeitraum.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <p className="mt-3 px-1 text-[12px] text-[var(--color-fg-mute)]">
        „Ohne Ergebnis" = Anruf gestartet, aber nach dem Gespräch nicht bewertet.
        Seit dem letzten Update ist die Bewertung nach jedem Anruf Pflicht.
      </p>
    </>
  );
}

// ── Tagebuch-Ansicht: Anrufe nach Tag gruppiert, als Zeitstrahl ────────────
function DiaryView({
  byDay,
  todayKey,
  yesterdayKey,
  showAgent,
  empty,
}: {
  byDay: [string, CallLogRow[]][];
  todayKey: string;
  yesterdayKey: string;
  showAgent: boolean;
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-[18px] bg-white px-4 py-16 text-center text-[13px] text-[var(--color-fg-mute)] shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
        Keine Anrufe in diesem Zeitraum.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {byDay.map(([key, items]) => {
        const first = new Date(items[0].startedAt);
        const apptN = items.filter((r) => r.dispo === "appointment").length;
        const heading =
          key === todayKey
            ? "Heute"
            : key === yesterdayKey
              ? "Gestern"
              : longDateFmt.format(first);
        const showFullDate = key === todayKey || key === yesterdayKey;
        return (
          <div key={key}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2 px-1">
              <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">
                {heading}
              </h3>
              <span className="text-[12px] text-[var(--color-fg-mute)]">
                {showFullDate ? longDateFmt.format(first) + " · " : ""}
                {items.length} {items.length === 1 ? "Anruf" : "Anrufe"}
              </span>
              {apptN > 0 && (
                <span className="text-[12px] font-medium text-[var(--color-success)]">
                  · {apptN} {apptN === 1 ? "Termin" : "Termine"}
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-[16px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
              {items.map((r) => (
                <DiaryRow key={r.id} r={r} showAgent={showAgent} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DiaryRow({ r, showAgent }: { r: CallLogRow; showAgent: boolean }) {
  const d = new Date(r.startedAt);
  const meta = r.dispo ? DISPO_META[r.dispo] : null;
  return (
    <div className="group flex items-start gap-3 border-b border-[var(--color-hairline)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]">
      <div className="w-[52px] shrink-0 pt-0.5 text-right">
        <div className="tabular-nums text-[13px] font-medium text-[var(--color-fg)]">
          {timeFmt.format(d)}
        </div>
        <div className="tabular-nums text-[11px] text-[var(--color-fg-mute)]">
          {fmtDuration(r.durationSec)}
        </div>
      </div>
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          DOT_CLASS[meta?.tone ?? "warn"],
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/leads/${r.leadId}`}
            className="truncate font-medium text-[var(--color-fg)] group-hover:text-[var(--color-copper-600)]"
          >
            {r.company || "Unbekannt"}
          </Link>
          {meta ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                TONE_CLASS[meta.tone],
              )}
            >
              {meta.label}
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                TONE_CLASS.warn,
              )}
            >
              <AlertTriangle className="h-3 w-3" /> Ohne Ergebnis
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--color-fg-mute)]">
          {r.phone && <span>{r.phone}</span>}
          {r.trade && <span>· {r.trade}</span>}
          {showAgent && (r.agentName || r.agentEmail) && (
            <span>· {r.agentName || r.agentEmail}</span>
          )}
        </div>
        {r.note && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--color-fg-dim)]">
            {r.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
        {r.phone && (
          <a
            href={`tel:${r.phone}`}
            title={`Anrufen · ${r.phone}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-white shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition hover:bg-[#0077ed] active:scale-95"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        <Link
          href={`/leads/${r.leadId}`}
          title="Lead öffnen"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-mute)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
