"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Search, MapPin, Star } from "lucide-react";
import {
  SOURCE_LABELS,
  type FinderLead,
  type FinderResponse,
  type FinderSourceId,
} from "@/lib/finder/types";

const TRADES = [
  "dachdecker",
  "maler",
  "elektriker",
  "shk",
  "tischler",
  "fliesenleger",
  "maurer",
  "galabau",
];

/** Quellen, die der Nutzer wählen kann. `enabled:false` → sichtbar, aber „bald". */
const SOURCES: Array<{ id: FinderSourceId; enabled: boolean }> = [
  { id: "osm", enabled: true },
  { id: "google_places", enabled: true },
  { id: "kleinanzeigen", enabled: false },
  { id: "branchenbuch", enabled: false },
];

type ImportResponse = {
  ok: boolean;
  inserted: number;
  skipped: number;
  mock?: boolean;
};

/** Stabiler Schlüssel pro Lead (für Auswahl-Set). */
function leadKey(l: FinderLead): string {
  return `${l.source}:${l.externalId ?? ""}:${l.company}`;
}

function statusBadge(s: {
  status: string;
  count: number;
}): { variant: "success" | "neutral" | "warm" | "danger"; label: string } {
  switch (s.status) {
    case "ok":
      return { variant: "success", label: `${s.count} Treffer` };
    case "no-key":
      return { variant: "warm", label: "Key fehlt" };
    case "unavailable":
      return { variant: "neutral", label: "bald" };
    case "error":
      return { variant: "danger", label: "Fehler" };
    default:
      return { variant: "neutral", label: s.status };
  }
}

export default function LeadsFinderPage() {
  const [city, setCity] = useState("Hannover");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([
    "dachdecker",
    "maler",
  ]);
  const [selectedSources, setSelectedSources] = useState<FinderSourceId[]>([
    "osm",
    "google_places",
  ]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FinderResponse | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{
    tone: "success" | "info";
    text: string;
  } | null>(null);

  function toggleTrade(t: string) {
    setSelectedTrades((s) =>
      s.includes(t) ? s.filter((x) => x !== t) : [...s, t],
    );
  }

  function toggleSource(id: FinderSourceId) {
    setSelectedSources((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  const leads = response?.leads ?? [];

  const canFind =
    !loading && selectedTrades.length > 0 && selectedSources.length > 0;

  async function onFind() {
    setLoading(true);
    setResponse(null);
    setSelectedRows(new Set());
    setImportMsg(null);
    try {
      const res = await fetch("/api/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          trades: selectedTrades,
          sources: selectedSources,
        }),
      });
      const data = (await res.json()) as FinderResponse;
      setResponse(data);
    } catch (err) {
      setResponse({
        ok: false,
        leads: [],
        sources: [],
        total: 0,
      });
      setImportMsg({ tone: "info", text: `Fehler beim Laden: ${String(err)}` });
    }
    setLoading(false);
  }

  function toggleRow(key: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allKeys = leads.map(leadKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedRows.has(k));

  function toggleAll() {
    setSelectedRows(allSelected ? new Set() : new Set(allKeys));
  }

  async function onImport() {
    const selectedLeadObjects = leads.filter((l) => selectedRows.has(leadKey(l)));
    if (selectedLeadObjects.length === 0) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch("/api/finder/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeadObjects }),
      });
      if (res.status === 503) {
        setImportMsg({
          tone: "info",
          text: "Pipeline noch nicht verbunden — ohne Datenbank werden Leads nicht persistiert.",
        });
      } else {
        const data = (await res.json()) as ImportResponse;
        if (data.mock) {
          setImportMsg({
            tone: "info",
            text: `Demo-Modus: ${data.inserted} übernommen, ${data.skipped} Duplikate übersprungen (nicht persistiert).`,
          });
        } else {
          setImportMsg({
            tone: "success",
            text: `${data.inserted} übernommen, ${data.skipped} Duplikate übersprungen.`,
          });
        }
        setSelectedRows(new Set());
      }
    } catch (err) {
      setImportMsg({ tone: "info", text: `Fehler beim Übernehmen: ${String(err)}` });
    }
    setImporting(false);
  }

  const selectedCount = selectedRows.size;

  return (
    <Shell eyebrow="Akquise" title="Leads finden">
      <p className="mb-6 max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
        Bündelt mehrere Quellen in einem System. Stadt und Gewerke wählen,
        Quellen aktivieren, Treffer prüfen und ausgewählte Betriebe in die
        Pipeline übernehmen.
      </p>

      {/* Such-Karte */}
      <Card className="max-w-3xl">
        <CardHeader title="Suche" eyebrow="Quellen bündeln" />
        <div className="space-y-5 px-5 py-5">
          <label className="block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Stadt
            </span>
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2">
              <MapPin className="mr-2 h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-[var(--color-fg)] outline-none"
              />
            </div>
          </label>

          <div>
            <span className="mb-2 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Gewerke
            </span>
            <div className="flex flex-wrap gap-2">
              {TRADES.map((t) => {
                const active = selectedTrades.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTrade(t)}
                    className={
                      active
                        ? "rounded-full border border-[#cfe0fd] bg-[#eff5ff] px-3 py-1 text-[11.5px] text-[var(--color-copper-700)]"
                        : "rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-1 text-[11.5px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Quellen
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              {SOURCES.map(({ id, enabled }) => {
                const checked = selectedSources.includes(id);
                return (
                  <label
                    key={id}
                    className={
                      "flex items-center gap-2 text-[12.5px] " +
                      (enabled
                        ? "cursor-pointer text-[var(--color-fg-dim)]"
                        : "cursor-not-allowed text-[var(--color-fg-mute)]")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={enabled ? checked : false}
                      disabled={!enabled}
                      onChange={() => enabled && toggleSource(id)}
                      className="h-3.5 w-3.5 accent-[var(--color-copper-500)]"
                    />
                    {SOURCE_LABELS[id]}
                    {!enabled && (
                      <Badge variant="neutral" className="ml-0.5">
                        bald
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
            <div className="text-[11.5px] text-[var(--color-fg-mute)]">
              {selectedTrades.length} Gewerke · {selectedSources.length} Quellen
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={!canFind}
              onClick={onFind}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Suche…
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  Finden
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quellen-Status */}
      {response && response.sources.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {response.sources.map((s) => {
            const b = statusBadge(s);
            return (
              <Badge key={s.source} variant={b.variant} dot>
                {SOURCE_LABELS[s.source]}: {b.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Übernehmen-Leiste */}
      {leads.length > 0 && (
        <div className="sticky top-[52px] z-10 mt-5 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)]/80 px-4 py-2.5 backdrop-blur">
          <div className="text-[12.5px] text-[var(--color-fg-dim)]">
            {selectedCount} ausgewählt · {leads.length} Treffer
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={importing || selectedCount === 0}
            onClick={onImport}
          >
            {importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Übernehme…
              </>
            ) : (
              "In Pipeline übernehmen"
            )}
          </Button>
        </div>
      )}

      {/* Import-Meldung */}
      {importMsg && (
        <div
          className={
            "mt-3 rounded-[var(--radius-md)] px-4 py-2.5 text-[12.5px] " +
            (importMsg.tone === "success"
              ? "bg-[#e6f7ea] text-[#1a7f37]"
              : "bg-[#fff2e3] text-[#b25000]")
          }
        >
          {importMsg.text}
        </div>
      )}

      {/* Ergebnis-Tabelle */}
      {leads.length > 0 && (
        <Card className="mt-4 overflow-hidden p-0">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alle auswählen"
                    className="h-3.5 w-3.5 accent-[var(--color-copper-500)]"
                  />
                </Th>
                <Th>Firma</Th>
                <Th>Gewerk</Th>
                <Th>Quelle</Th>
                <Th>Telefon</Th>
                <Th>Website</Th>
                <Th>Ort</Th>
                <Th>Bewertung</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {leads.map((l) => {
                const key = leadKey(l);
                const checked = selectedRows.has(key);
                const dim = !l.phone;
                return (
                  <tr
                    key={key}
                    className={
                      "transition-colors hover:bg-black/[0.02] " +
                      (dim ? "opacity-60" : "")
                    }
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(key)}
                        aria-label={`${l.company} auswählen`}
                        className="h-3.5 w-3.5 accent-[var(--color-copper-500)]"
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-fg)]">
                      {l.company}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[var(--color-fg-dim)]">
                      {l.trade ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{SOURCE_LABELS[l.source]}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-[var(--color-fg-dim)]">
                      {l.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12.5px]">
                      {l.website ? (
                        <a
                          href={l.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-copper-600)] hover:underline"
                        >
                          {l.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        <span className="text-[var(--color-fg-mute)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[var(--color-fg-dim)]">
                      {[l.postalCode, l.city].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[var(--color-fg-dim)]">
                      {l.rating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-[#f5a623] text-[#f5a623]" />
                          {l.rating.toFixed(1)}
                          {l.userRatingsTotal != null && (
                            <span className="text-[var(--color-fg-mute)]">
                              ({l.userRatingsTotal})
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Leerzustand nach Suche */}
      {response && leads.length === 0 && (
        <Card className="mt-4 px-6 py-10 text-center text-[14px] text-[var(--color-fg-mute)]">
          Keine Treffer. Andere Stadt, Gewerke oder Quellen versuchen.
        </Card>
      )}
    </Shell>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-mute)] " +
        className
      }
    >
      {children}
    </th>
  );
}
