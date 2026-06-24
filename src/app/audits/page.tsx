import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { listAudits } from "@/lib/store";
import { Gauge, Globe, ShieldCheck, FileCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const audits = await listAudits();
  const avg =
    audits.length === 0
      ? 0
      : Math.round(
          audits.reduce((s, a) => s + (a.painScore ?? 0), 0) / audits.length,
        );

  return (
    <Shell
      eyebrow="Wow-Sequenz"
      title="Website-Audits"
      actions={
        <ButtonLink href="/audits/run" variant="primary" size="sm">
          + Audit ausführen
        </ButtonLink>
      }
    >
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Audits gesamt
          </div>
          <div className="text-mono mt-1.5 text-[26px] font-semibold tabular">
            {audits.length}
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Ø Pain-Score
          </div>
          <div className="text-mono mt-1.5 text-[26px] font-semibold tabular text-[var(--color-warm)]">
            {avg}
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Heiß (≤ 20)
          </div>
          <div className="text-mono mt-1.5 text-[26px] font-semibold tabular text-[var(--color-hot)]">
            {audits.filter((a) => (a.painScore ?? 100) <= 20).length}
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Mobile Ø
          </div>
          <div className="text-mono mt-1.5 text-[26px] font-semibold tabular">
            {Math.round(
              audits.reduce((s, a) => s + (a.mobileScore ?? 0), 0) /
                Math.max(1, audits.length),
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {audits.map((a) => (
          <Card key={a.id} className="px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
                  <span className="truncate text-[13.5px] font-medium text-[var(--color-fg)]">
                    {a.websiteUrl.replace(/^https?:\/\//, "")}
                  </span>
                  {a.painScore !== null && (
                    <Badge
                      variant={
                        a.painScore < 20
                          ? "hot"
                          : a.painScore < 50
                            ? "warm"
                            : "cold"
                      }
                      dot
                    >
                      Pain {a.painScore}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px]">
                  <ScoreBar
                    label="Mobile"
                    value={a.mobileScore}
                    icon={Smartphone}
                  />
                  <ScoreBar
                    label="Desktop"
                    value={a.desktopScore}
                    icon={Gauge}
                  />
                  <Field
                    label="LCP"
                    value={
                      a.lcpMs ? `${(a.lcpMs / 1000).toFixed(1)} s` : "—"
                    }
                  />
                  <Field
                    label="CLS"
                    value={a.clsScore ?? "—"}
                  />
                  <Flag ok={a.hasHttps} icon={ShieldCheck} label="HTTPS" />
                  <Flag ok={a.hasImpressum} icon={FileCheck} label="Impressum" />
                  <Flag ok={a.hasBookingCta} label="Booking-CTA" />
                </div>

                {a.hookText && (
                  <div className="mt-3 rounded-md border-l-2 border-[var(--color-copper-500)] bg-[#eff5ff] py-2 pl-3 pr-3 text-[12.5px] italic leading-relaxed text-[var(--color-copper-700)]">
                    „{a.hookText}&rdquo;
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <ButtonLink
                  href={a.leadId ? `/leads/${a.leadId}` : "#"}
                  variant="secondary"
                  size="sm"
                >
                  Zum Lead
                </ButtonLink>
                <ButtonLink
                  href={`/api/pdf/audit/${a.id}`}
                  variant="primary"
                  size="sm"
                >
                  PDF senden
                </ButtonLink>
              </div>
            </div>
          </Card>
        ))}

        {audits.length === 0 && (
          <Card className="px-6 py-16 text-center">
            <Gauge className="mx-auto h-6 w-6 text-[var(--color-fg-mute)]" />
            <div className="mt-3 text-[13px]">Noch keine Audits.</div>
          </Card>
        )}
      </div>
    </Shell>
  );
}

function ScoreBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  if (value === null) return null;
  const tone =
    value >= 80
      ? "text-[var(--color-success)] bg-[var(--color-success)]"
      : value >= 50
        ? "text-[var(--color-warm)] bg-[var(--color-warm)]"
        : "text-[var(--color-hot)] bg-[var(--color-hot)]";
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 text-[var(--color-fg-mute)]" />}
      <span className="text-[var(--color-fg-mute)]">{label}</span>
      <span className={cn("text-mono tabular font-semibold", tone.split(" ")[0])}>
        {value}
      </span>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <div
          className={cn("h-full", tone.split(" ")[1])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--color-fg-mute)]">{label}</span>
      <span className="text-mono tabular text-[var(--color-fg-dim)]">{value}</span>
    </div>
  );
}

function Flag({
  ok,
  label,
  icon: Icon,
}: {
  ok: boolean | null;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3 text-[var(--color-fg-mute)]" />}
      <span
        className={cn(
          ok
            ? "text-[var(--color-success)]"
            : ok === false
              ? "text-[var(--color-hot)]"
              : "text-[var(--color-fg-mute)]",
        )}
      >
        {ok ? "✓" : ok === false ? "✗" : "—"} {label}
      </span>
    </div>
  );
}
