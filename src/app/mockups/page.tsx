import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TEMPLATES } from "@/lib/mockup/templates";
import { Sparkles, Palette, Type, Image as ImageIcon } from "lucide-react";

export default function MockupsPage() {
  return (
    <Shell
      eyebrow="Wow-Sequenz"
      title="Mockup-Studio"
      actions={
        <Badge variant="copper" dot>
          {Object.keys(TEMPLATES).length} Templates
        </Badge>
      }
    >
      <p className="mb-6 max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
        Pro Gewerk ein vorbereitetes Hero-Design. Die Auto-Swap-Engine setzt
        Logo-Farbe, NAP und Telefonnummer in 20-40 Sekunden ein. Link teilen im
        Anruf — Wow-Moment ohne Mehraufwand.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {Object.values(TEMPLATES).map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardHeader
              title={t.label}
              eyebrow={t.archetype}
              right={
                <ButtonLink
                  href={`/mockups/preview/${t.id}`}
                  variant="primary"
                  size="sm"
                >
                  Vorschau
                </ButtonLink>
              }
            />
            <div
              className="grid h-48 grid-cols-2 gap-px overflow-hidden border-b border-[var(--color-hairline)]"
              style={{ background: t.palette.bg }}
            >
              {/* Hero half */}
              <div
                className="relative flex flex-col justify-between p-5"
                style={{ background: t.heroImage, backgroundSize: "cover" }}
              >
                <div
                  className="inline-block self-start rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em]"
                  style={{ borderColor: t.palette.accent, color: t.palette.accent }}
                >
                  {t.trade}
                </div>
                <div>
                  <div
                    className="text-[15px] font-semibold leading-tight"
                    style={{ color: t.palette.fg }}
                  >
                    Beispiel-Hero
                  </div>
                  <div
                    className="mt-1.5 inline-block rounded-md px-2.5 py-1 text-[10px] font-medium"
                    style={{ background: t.palette.accent, color: t.palette.bg }}
                  >
                    {t.ctas[0]}
                  </div>
                </div>
              </div>
              {/* Spec half */}
              <div className="flex flex-col gap-2 bg-[var(--color-surface)] p-4 text-[11px]">
                <SpecRow icon={Palette} label="Palette">
                  <div className="flex gap-1">
                    {[t.palette.bg, t.palette.fg, t.palette.accent, t.palette.muted].map(
                      (c) => (
                        <span
                          key={c}
                          className="h-3 w-3 rounded-sm border border-white/10"
                          style={{ background: c }}
                        />
                      ),
                    )}
                  </div>
                </SpecRow>
                <SpecRow icon={Type} label="Type">
                  <span className="text-mono text-[10px] text-[var(--color-fg-dim)]">
                    {t.type.hero}
                  </span>
                </SpecRow>
                <SpecRow icon={ImageIcon} label="Hero">
                  <span className="text-[10px] text-[var(--color-fg-dim)]">
                    Auto-Swap (Stock + Logo)
                  </span>
                </SpecRow>
                <SpecRow icon={Sparkles} label="CTAs">
                  <span className="text-[10px] text-[var(--color-fg-dim)]">
                    {t.ctas.length} Varianten
                  </span>
                </SpecRow>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function SpecRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[var(--color-fg-mute)]">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {children}
    </div>
  );
}
