import { Shell } from "@/components/Shell";
import { PriceTable } from "@/components/PriceTable";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PreisePage() {
  return (
    <Shell eyebrow="Verkaufshilfe" title="Preise">
      {/* ── Hero: das verkaufst du meistens ─────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-[18px] bg-gradient-to-br from-[#0a4ea3] to-[#0071e3] px-6 py-5 text-white">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/70">
            Dein Standard-Angebot
          </div>
          <div className="mt-0.5 text-[20px] font-semibold leading-tight">
            Starter-Website ab <span className="tabular-nums">990 €</span>
            <span className="ml-2 text-[13px] font-normal text-white/75">
              einmalig
            </span>
          </div>
          <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-white/85">
            Startseite + Setup + Google-Profil + Anfrageformular + 1 Jahr Hosting.
            Das ist der Einstieg, den du meistens verkaufst. Alles andere unten
            sind <b>Zusatzbausteine</b>, die du draufpacken kannst.
          </p>
        </div>
        <div className="shrink-0 rounded-[12px] bg-white/10 px-4 py-3 text-center">
          <div className="text-[11px] text-white/70">+ danach Pflege ab</div>
          <div className="text-[18px] font-semibold tabular-nums">29 €/Mt</div>
          <div className="text-[11px] text-white/70">wiederkehrend</div>
        </div>
      </div>

      <PriceTable />

      <p className="mt-6 px-1 text-[12px] text-[var(--color-fg-mute)]">
        Preise sind Richtwerte (Stand 06/2026) — nichts ist in Stein gemeißelt.
        Im Zweifel Spielraum nach oben lassen und Aufpreise nennen, nicht
        verschenken. Endpreis kommt ins Angebot unter „Finanzen".
      </p>
    </Shell>
  );
}
