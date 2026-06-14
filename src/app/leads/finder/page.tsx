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

/**
 * Wählbare Gewerke (Reihenfolge ~ Kaufwilligkeit aus dem Branchen-Research:
 * höchster Auftragswert × Web-Lücke × Erreichbarkeit zuerst).
 * Labels lokal gehalten, damit der Server-Scraper nicht ins Client-Bundle wandert.
 */
const TRADES: Array<{ key: string; label: string }> = [
  { key: "dachdecker", label: "Dachdecker" },
  { key: "shk", label: "SHK (Sanitär/Heizung)" },
  { key: "galabau", label: "Garten- & Landschaftsbau" },
  { key: "fensterbauer", label: "Fensterbauer" },
  { key: "kfz", label: "KFZ-Werkstatt" },
  { key: "elektriker", label: "Elektriker" },
  { key: "maler", label: "Maler" },
  { key: "fliesenleger", label: "Fliesenleger" },
  { key: "tischler", label: "Tischler/Schreiner" },
  { key: "zimmerer", label: "Zimmerer" },
  { key: "maurer", label: "Maurer" },
  { key: "bauunternehmer", label: "Bauunternehmer" },
  { key: "metallbau", label: "Metallbau/Schlosser" },
  { key: "geruestbau", label: "Gerüstbau" },
  { key: "stuckateur", label: "Stuckateur" },
  { key: "trockenbau", label: "Trockenbau" },
  { key: "bodenleger", label: "Bodenleger" },
  { key: "schornsteinfeger", label: "Schornsteinfeger" },
  { key: "estrichleger", label: "Estrichleger" },
  { key: "physio", label: "Physiotherapie" },
  { key: "friseur", label: "Friseur" },
  { key: "kosmetik", label: "Kosmetik/Nagelstudio" },
  { key: "fahrschule", label: "Fahrschule" },
  { key: "gebaeudereinigung", label: "Gebäudereinigung" },
  { key: "schaedlingsbekaempfung", label: "Schädlingsbekämpfung" },
];

type PhoneFilter = "all" | "with" | "mobile" | "landline";
type WebsiteFilter = "all" | "without" | "with";

/**
 * Live-Quellen, die direkt im Finder abgefragt werden. Nur Quellen mit
 * legaler öffentlicher API/Feed (OSM, Google Places). `enabled:false` →
 * sichtbar, aber nicht live (rechtlich/technisch nur über Skript/manuell).
 */
const SOURCES: Array<{ id: FinderSourceId; enabled: boolean }> = [
  { id: "osm", enabled: true },
  { id: "google_places", enabled: true },
  { id: "stellenanzeigen", enabled: true },
  { id: "handelsregister", enabled: false },
  { id: "kleinanzeigen", enabled: false },
  { id: "branchenbuch", enabled: false },
];

/**
 * Vollständiger Quellen-Katalog (Ergebnis der Quellen-Recherche + Rechts-Check).
 * „tier" sagt ehrlich, wie eine Quelle nutzbar ist:
 *   live    → direkte legale API/Feed, im Finder oben wählbar
 *   signal  → reines Anreicherungs-Signal auf bereits gefundenen Leads (legal)
 *   skript  → nur über ein Offline-Skript (AGB/Anti-Bot, rechtlich heikel)
 *   lizenz  → nur über kaufbare Lizenz-Daten sauber (kein Eigen-Scrape)
 *   manuell → nur manuelle Einzelrecherche / Brief, kein Auto-Abruf
 */
const SOURCE_CATALOG: Array<{
  name: string;
  tier: "live" | "signal" | "skript" | "lizenz" | "manuell";
  note: string;
}> = [
  { name: "OpenStreetMap (Overpass)", tier: "live", note: "Kostenlos, öffentlich. Firma, Tel, Adresse, Website je Gewerk × Stadt." },
  { name: "Google Maps (Places API)", tier: "live", note: "Mit API-Key. Tel + Bewertung; der ohne-Website-Filter ist das heißeste Signal. Achtung Google-ToS: Daten nicht dauerhaft speichern." },
  { name: "Gratis-Baukasten-Erkennung", tier: "signal", note: "Markiert Leads, deren Seite auf jimdosite/wixsite/business.site läuft → kein eigener Domain-Auftritt. Läuft auf OSM/Google mit." },
  { name: "Neugründungen (Handelsregister)", tier: "lizenz", note: "Bestes Timing-Signal, aber Justizportal-Scrape ist AGB-/§87b-heikel. Sauber nur über lizenzierte Open-Data (OffeneRegister). Erstkontakt per Brief." },
  { name: "Stellenanzeigen (Arbeitsagentur-API)", tier: "signal", note: "Offizielle Jobsuche-API als Wachstums-/Timing-Signal (stellt ein = wächst). Tel nur aus eigenem Impressum, Brief-Erstkontakt." },
  { name: "Branchenbücher (Örtliche/11880)", tier: "skript", note: "Telefonreich, aber geschützte Datenbank (§87b) + Anti-Bot. Nur manuelle Einzelrecherche, kein Bulk-Scrape." },
  { name: "Handwerker-Plattformen (MyHammer/Check24)", tier: "manuell", note: "Login-/AGB-Wall. Nur manuell als Signal: zahlt für Leads, hat oft keine eigene Website." },
  { name: "Handwerkskammer-Verzeichnisse", tier: "skript", note: "Kammer-/Innungslisten. Nur als Anreicherungs-Signal, Brief-Erstkontakt." },
  { name: "Kleinanzeigen.de", tier: "skript", note: "Offline-Skript vorhanden (scripts/scrape-kleinanzeigen.ts), nur Gewerbe-Impressum." },
  { name: "Social lokal (Instagram/Facebook)", tier: "manuell", note: "Aktiv auf Social, aber keine Website — nur manuelles Scoring-Signal." },
  { name: "Messe-Aussteller", tier: "lizenz", note: "Aussteller-Adresslisten kaufbar (CSV-Import), kein Scrape." },
];

const TIER_BADGE: Record<
  string,
  { variant: "success" | "neutral" | "warm" | "danger"; label: string }
> = {
  live: { variant: "success", label: "Live" },
  signal: { variant: "success", label: "Signal" },
  lizenz: { variant: "warm", label: "Lizenz-Daten" },
  skript: { variant: "warm", label: "Skript" },
  manuell: { variant: "neutral", label: "Manuell" },
};

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

  // ── Ergebnis-Filter (clientseitig, nach der Suche) ──
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>("all");
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("all");
  const [builderFilter, setBuilderFilter] = useState<"all" | "only">("all");
  const [plzFilter, setPlzFilter] = useState("");
  const [textFilter, setTextFilter] = useState("");

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

  const allLeads = response?.leads ?? [];

  // Gebiet- und Telefon-Filter (genau die Achsen aus dem Auftrag).
  const leads = allLeads.filter((l) => {
    if (phoneFilter === "with" && !l.phone) return false;
    if (phoneFilter === "mobile" && l.phoneType !== "mobile") return false;
    if (phoneFilter === "landline" && l.phoneType !== "landline") return false;
    if (websiteFilter === "without" && l.website) return false;
    if (websiteFilter === "with" && !l.website) return false;
    if (builderFilter === "only" && !l.builderPlatform) return false;
    if (plzFilter.trim() && !(l.postalCode ?? "").startsWith(plzFilter.trim()))
      return false;
    if (textFilter.trim()) {
      const q = textFilter.trim().toLowerCase();
      const hay = `${l.company} ${l.city ?? ""} ${l.trade ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

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
                const active = selectedTrades.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTrade(t.key)}
                    className={
                      active
                        ? "rounded-full border border-[#cfe0fd] bg-[#eff5ff] px-3 py-1 text-[11.5px] text-[var(--color-copper-700)]"
                        : "rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-1 text-[11.5px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
                    }
                  >
                    {t.label}
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

      {/* Quellen-Katalog + Rechtshinweis */}
      <Card className="mt-5 max-w-3xl">
        <CardHeader
          title="Quellen-Katalog"
          eyebrow="Was geht — und was rechtlich nicht"
        />
        <div className="px-5 py-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SOURCE_CATALOG.map((s) => {
              const b = TIER_BADGE[s.tier];
              return (
                <div
                  key={s.name}
                  className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-3 py-2.5"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--color-fg)]">
                      {s.name}
                    </span>
                    <Badge variant={b.variant}>{b.label}</Badge>
                  </div>
                  <p className="text-[11px] leading-snug text-[var(--color-fg-mute)]">
                    {s.note}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[#f0d8b8] bg-[#fff8ef] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#7a4a10]">
            <strong>Rechtlicher Hinweis (wichtig).</strong> Das BVerwG
            (6 C 3.23, 29.01.2025) hat klargestellt: Kontaktdaten aus
            öffentlichen Verzeichnissen für <em>telefonische</em> Kaltakquise zu
            nutzen ist ohne Einwilligung unzulässig — bloßer Branchenbezug
            genügt nicht, und Art. 6 f DSGVO hebelt UWG §7 nicht aus. Diese
            Quellen liefern darum vor allem <strong>Signale</strong> zum
            Priorisieren; der rechtssichere Erstkontakt läuft per{" "}
            <strong>adressiertem Brief</strong> (fällt nicht unter §7), Telefon
            erst nach dokumentierter Einwilligung. Vor produktivem Einsatz
            anwaltlich freigeben.
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

      {/* Ergebnis-Filter (Gebiet & Telefon) */}
      {allLeads.length > 0 && (
        <Card className="mt-5 p-0">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-4 py-3.5">
            <FilterGroup label="Telefon">
              <Segmented
                value={phoneFilter}
                onChange={(v) => setPhoneFilter(v as PhoneFilter)}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "with", label: "mit Tel." },
                  { value: "mobile", label: "Mobil" },
                  { value: "landline", label: "Festnetz" },
                ]}
              />
            </FilterGroup>

            <FilterGroup label="Website">
              <Segmented
                value={websiteFilter}
                onChange={(v) => setWebsiteFilter(v as WebsiteFilter)}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "without", label: "ohne (heiß)" },
                  { value: "with", label: "mit" },
                ]}
              />
            </FilterGroup>

            <FilterGroup label="Baukasten">
              <Segmented
                value={builderFilter}
                onChange={(v) => setBuilderFilter(v as "all" | "only")}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "only", label: "nur Gratis-Baukasten" },
                ]}
              />
            </FilterGroup>

            <FilterGroup label="PLZ-Gebiet">
              <input
                value={plzFilter}
                onChange={(e) =>
                  setPlzFilter(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="z.B. 30"
                inputMode="numeric"
                className="w-24 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-2.5 py-1.5 text-[12.5px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </FilterGroup>

            <FilterGroup label="Suche">
              <input
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                placeholder="Firma, Ort, Gewerk…"
                className="w-48 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 px-2.5 py-1.5 text-[12.5px] text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </FilterGroup>

            <div className="ml-auto self-center text-[11.5px] text-[var(--color-fg-mute)]">
              {leads.length} von {allLeads.length}
            </div>
          </div>
        </Card>
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
        <Card className="mt-4 overflow-x-auto p-0">
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
                      {l.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          {l.phone}
                          {l.phoneType === "mobile" && (
                            <span className="rounded-full bg-[#e6f7ea] px-1.5 py-0.5 font-sans text-[9.5px] font-medium tracking-wide text-[#1a7f37]">
                              MOBIL
                            </span>
                          )}
                          {l.phoneType === "landline" && (
                            <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 font-sans text-[9.5px] font-medium tracking-wide text-[var(--color-fg-mute)]">
                              FESTNETZ
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px]">
                      {l.website ? (
                        <span className="inline-flex flex-col gap-1">
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-copper-600)] hover:underline"
                          >
                            {l.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                          {l.builderPlatform && (
                            <span className="w-fit rounded-full bg-[#fff2e3] px-1.5 py-0.5 text-[9.5px] font-medium tracking-wide text-[#b25000]">
                              GRATIS: {l.builderPlatform.toUpperCase()}
                            </span>
                          )}
                        </span>
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

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              "rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 text-[11.5px] transition-colors " +
              (active
                ? "bg-[var(--color-copper-500)] text-white"
                : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
