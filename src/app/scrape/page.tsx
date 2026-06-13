"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Globe2, Loader2 } from "lucide-react";

const TRADES = [
  "dachdecker",
  "shk",
  "galabau",
  "fensterbauer",
  "kfz",
  "elektriker",
  "maler",
  "fliesenleger",
  "tischler",
  "zimmerer",
  "maurer",
  "bauunternehmer",
  "metallbau",
  "geruestbau",
  "stuckateur",
  "trockenbau",
  "bodenleger",
  "schornsteinfeger",
  "estrichleger",
  "physio",
  "friseur",
  "kosmetik",
  "fahrschule",
  "gebaeudereinigung",
  "schaedlingsbekaempfung",
];

export default function ScrapePage() {
  const [city, setCity] = useState("Hannover");
  const [selected, setSelected] = useState<string[]>(["dachdecker", "maler"]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/scrape/osm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, trades: selected }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    }
    setRunning(false);
  }

  return (
    <Shell eyebrow="Quelle" title="OSM Scraper">
      <p className="mb-6 max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
        Zieht Handwerksbetriebe via OpenStreetMap Overpass — komplett kostenlos,
        ODbL-Lizenz. 100–200 Treffer pro deutscher Stadt, Telefonnummer-Quote
        ~30–40 %.
      </p>

      <Card className="max-w-2xl">
        <CardHeader title="Konfiguration" eyebrow="Overpass" />
        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Stadt
            </span>
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2">
              <Globe2 className="mr-2 h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
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
                const active = selected.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setSelected((s) =>
                        active ? s.filter((x) => x !== t) : [...s, t],
                      )
                    }
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

          <div className="flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
            <div className="text-[11.5px] text-[var(--color-fg-mute)]">
              Erwartet: {selected.length * 80}–{selected.length * 150} Roh-Leads
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={running || selected.length === 0}
              onClick={run}
            >
              {running ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Läuft…
                </>
              ) : (
                "Scrape starten"
              )}
            </Button>
          </div>

          {result !== null && (
            <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink)] p-3 text-[11px] text-[var(--color-fg-dim)]">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </Card>

      <div className="mt-4 max-w-2xl">
        <Badge variant="neutral">
          Hinweis: ohne DATABASE_URL läuft der Scrape, aber speichert nur im
          Speicher. Supabase verbinden, um Persistenz zu aktivieren.
        </Badge>
      </div>
    </Shell>
  );
}
