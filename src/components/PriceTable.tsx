"use client";

import { useMemo, useState } from "react";
import { Search, Repeat, Tag, TrendingDown, Info } from "lucide-react";
import {
  PRICING,
  isRecurring,
  formatAwPrice,
  formatEuro,
  type PriceItem,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PriceTable() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [showMarket, setShowMarket] = useState(false);

  const categories = PRICING.map((c) => c.name);

  // Suche + Kategorie-Filter.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRICING.map((c) => ({
      name: c.name,
      items: c.items.filter((it) => {
        if (cat !== "all" && c.name !== cat) return false;
        if (!needle) return true;
        return (
          it.position.toLowerCase().includes(needle) ||
          it.note.toLowerCase().includes(needle)
        );
      }),
    })).filter((c) => c.items.length > 0);
  }, [q, cat]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      {/* ── Neuling-Legende: das Wichtigste in 3 Sätzen ─────────────── */}
      <div className="mb-5 rounded-[16px] border border-[var(--color-hairline)] bg-[#fbfcff] p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--color-copper-700)]">
          <Info className="h-3.5 w-3.5" /> So liest du die Preise
        </div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
          <li>
            <b className="text-[var(--color-fg)]">Spanne (z. B. 120–160 €)</b> ={" "}
            je nach Aufwand. Im Zweifel die <b>untere Zahl</b> nennen und „ab"
            sagen.
          </li>
          <li>
            <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-semibold text-[#b25000]">
              <Repeat className="h-3 w-3" /> monatlich
            </span>
            = läuft <b>jeden Monat</b> weiter (wiederkehrender Umsatz).{" "}
            <span className="mx-1 inline-flex items-center gap-1 rounded-full bg-[#eef5ff] px-2 py-0.5 text-[11px] font-semibold text-[#0a4ea3]">
              <Tag className="h-3 w-3" /> einmalig
            </span>
            = wird <b>einmal</b> bezahlt.
          </li>
          <li>
            <b className="text-[var(--color-fg)]">Marktvergleich</b> einschalten,
            um zu sehen, was andere verlangen — gutes Argument: „andere nehmen X,
            bei uns Y".
          </li>
        </ul>
      </div>

      {/* ── Steuerung: Suche + Marktvergleich ──────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-mute)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen … (z. B. Logo, Termin, SEO, Shop)"
            className="w-full rounded-full border border-[var(--color-hairline)] bg-white py-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-copper-400)]"
          />
        </div>
        <button
          onClick={() => setShowMarket((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium transition-colors",
            showMarket
              ? "bg-[var(--color-fg)] text-white"
              : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
          )}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          Marktvergleich {showMarket ? "an" : "aus"}
        </button>
      </div>

      {/* ── Kategorie-Chips ─────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          Alle
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {total === 0 && (
        <div className="rounded-[16px] bg-white p-10 text-center text-[14px] text-[var(--color-fg-mute)] shadow-[var(--shadow-1)]">
          Nichts gefunden für „{q}".
        </div>
      )}

      {/* ── Preis-Karten je Kategorie ───────────────────────────────── */}
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.name}>
            <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-fg)]">
              {g.name}
              <span className="ml-2 text-[12px] font-normal text-[var(--color-fg-mute)]">
                {g.items.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-[16px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
              {g.items.map((it, i) => (
                <PriceRow
                  key={it.position}
                  item={it}
                  showMarket={showMarket}
                  first={i === 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function PriceRow({
  item,
  showMarket,
  first,
}: {
  item: PriceItem;
  showMarket: boolean;
  first: boolean;
}) {
  const recurring = isRecurring(item.unit);
  // Wie viel günstiger als der Markt? (nur wenn sinnvoll)
  const cheaper =
    item.marketTypical && !item.included
      ? Math.round((1 - item.awFrom / item.marketTypical) * 100)
      : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 px-4 py-3.5 sm:flex-nowrap",
        !first && "border-t border-[var(--color-hairline)]",
      )}
    >
      {/* Position + Erklärung */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[14px] text-[var(--color-fg)]">
            {item.position}
          </span>
          <UnitBadge unit={item.unit} recurring={recurring} />
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg-mute)]">
          {item.note}
        </p>
        {showMarket && item.marketTypical !== null && (
          <p className="mt-1 text-[12px] text-[var(--color-fg-dim)]">
            Markt typisch: <b>{formatEuro(item.marketTypical)}</b>
            {cheaper !== null && cheaper >= 10 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1a7f43]">
                <TrendingDown className="h-3 w-3" /> ~{cheaper}% günstiger
              </span>
            )}
          </p>
        )}
      </div>

      {/* AW-Preis groß */}
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "text-[18px] font-semibold tabular-nums leading-tight",
            item.included
              ? "text-[var(--color-success)]"
              : "text-[var(--color-fg)]",
          )}
        >
          {formatAwPrice(item)}
        </div>
        <div className="text-[11px] text-[var(--color-fg-mute)]">{item.unit}</div>
      </div>
    </div>
  );
}

function UnitBadge({ unit, recurring }: { unit: string; recurring: boolean }) {
  if (unit === "inklusive")
    return (
      <span className="inline-flex items-center rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1a7f43]">
        inklusive
      </span>
    );
  if (recurring)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-semibold text-[#b25000]">
        <Repeat className="h-3 w-3" /> monatlich
      </span>
    );
  if (unit === "einmalig")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5ff] px-2 py-0.5 text-[11px] font-semibold text-[#0a4ea3]">
        <Tag className="h-3 w-3" /> einmalig
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-fg-dim)]">
      {unit}
    </span>
  );
}

function Chip({
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
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active
          ? "bg-[var(--color-fg)] text-white"
          : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
      )}
    >
      {children}
    </button>
  );
}
