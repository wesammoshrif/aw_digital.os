/**
 * Live-Mockup-Preview — die Sales-Wow-Komponente.
 * Wird im Anruf dem Interessenten gezeigt:
 *   awdigital.de/mockups/[lead-id]
 *
 * Anzeige eines realistischen Hero + Trust-Strip + Service-Cards
 * mit Logo, NAP und Farbpalette des Interessenten.
 */
import type { Lead } from "@/db/schema";
import type { TemplateBrief } from "@/lib/mockup/templates";

export function MockupPreview({
  lead,
  template,
}: {
  lead: Lead;
  template: TemplateBrief;
}) {
  const p = template.palette;
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-hairline)]"
      style={{ background: p.bg, color: p.fg }}
    >
      {/* ── browser chrome ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <div
          className="ml-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[10.5px]"
          style={{ color: p.muted }}
        >
          <span>🔒</span>
          {(lead.website ?? `${slug(lead.company)}.de`).replace(/^https?:\/\//, "")}
        </div>
      </div>

      {/* ── nav ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-8 py-5"
        style={{ background: p.bg }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ background: p.accent, color: p.bg }}
          >
            <span className="text-[14px] font-semibold">
              {lead.company.charAt(0)}
            </span>
          </div>
          <div className="text-[14px] font-semibold tracking-tight">
            {lead.company.split(/[\s&·]/)[0]}
          </div>
        </div>
        <nav className="flex items-center gap-6 text-[12px]" style={{ color: p.muted }}>
          <span>Leistungen</span>
          <span>Referenzen</span>
          <span>Über uns</span>
          <span>Kontakt</span>
        </nav>
        <button
          className="rounded-md px-3.5 py-1.5 text-[12px] font-medium"
          style={{ background: p.accent, color: p.bg }}
        >
          {template.ctas[0]}
        </button>
      </div>

      {/* ── hero ────────────────────────────────────────────────── */}
      <div
        className="relative px-8 py-16"
        style={{ background: template.heroImage, backgroundSize: "cover" }}
      >
        <div className="relative max-w-[44ch]">
          <div
            className="inline-block rounded-full border px-3 py-1 text-[10.5px] uppercase tracking-[0.16em]"
            style={{ borderColor: p.accent, color: p.accent }}
          >
            {template.archetype}
          </div>
          <h1
            className="mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight"
            style={{ color: p.fg }}
          >
            {lead.company}
            <br />
            <span style={{ color: p.accent }}>
              {tradePhrase(lead.trade)}
            </span>
            {" "}aus {lead.city ?? "Hannover"}.
          </h1>
          <p
            className="mt-4 max-w-[42ch] text-[15px] leading-relaxed"
            style={{ color: p.muted }}
          >
            Persönliche Beratung, faire Festpreise, sauberer Termin. Seit 1987 für
            Privat- und Gewerbekunden in der Region.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <button
              className="rounded-md px-4 py-2.5 text-[13px] font-medium shadow-lg"
              style={{ background: p.accent, color: p.bg }}
            >
              {template.ctas[0]} →
            </button>
            <button
              className="rounded-md border px-4 py-2.5 text-[13px] font-medium"
              style={{ borderColor: p.muted, color: p.fg }}
            >
              {lead.phone ?? "Anrufen"}
            </button>
          </div>
        </div>
      </div>

      {/* ── trust strip ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-around border-t border-b px-8 py-4 text-[11px] uppercase tracking-[0.16em]"
        style={{ borderColor: "rgba(255,255,255,0.07)", color: p.muted }}
      >
        {template.proofPoints.map((pp) => (
          <span key={pp}>{pp}</span>
        ))}
      </div>

      {/* ── services ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-8">
        {servicesFor(lead.trade).map((s) => (
          <div
            key={s}
            className="rounded-md border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="text-[10.5px] uppercase tracking-[0.16em]"
              style={{ color: p.accent }}
            >
              Leistung
            </div>
            <div
              className="mt-1.5 text-[14px] font-semibold"
              style={{ color: p.fg }}
            >
              {s}
            </div>
            <div className="mt-1 text-[11.5px]" style={{ color: p.muted }}>
              Festpreis nach Vor-Ort-Termin · meist innerhalb 14 Tagen
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function tradePhrase(trade: string | null): string {
  const map: Record<string, string> = {
    dachdecker: "Dachdeckermeister",
    maler: "Malermeisterbetrieb",
    elektriker: "Elektromeister",
    shk: "Wärme & Sanitär",
    tischler: "Tischlermeister",
    fliesenleger: "Fliesenmeister",
    maurer: "Baumeister",
    galabau: "Garten & Landschaftsbau",
    solar: "Solarbetrieb",
  };
  return trade ? (map[trade] ?? "Meisterbetrieb") : "Meisterbetrieb";
}

function servicesFor(trade: string | null): string[] {
  const map: Record<string, string[]> = {
    dachdecker: ["Steildach", "Flachdach", "Sturmschaden 24/7"],
    maler: ["Fassade", "Innenraum", "Spachteltechnik"],
    elektriker: ["E-Check", "Photovoltaik", "Smart Home"],
    shk: ["Wärmepumpe", "Sanitär", "Notdienst"],
    tischler: ["Möbel auf Maß", "Türen + Treppen", "Einbauküchen"],
    fliesenleger: ["Naturstein", "Großformat", "Bad-Komplett"],
    solar: ["PV-Anlagen", "Speicher", "Wallbox"],
  };
  return trade
    ? (map[trade] ?? ["Beratung", "Ausführung", "Service"])
    : ["Beratung", "Ausführung", "Service"];
}
