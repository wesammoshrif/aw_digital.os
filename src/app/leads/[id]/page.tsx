import { Shell } from "@/components/Shell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CallMode } from "@/components/CallMode";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { MaintenanceOptIn } from "@/components/MaintenanceOptIn";
import { CompliancePanel } from "@/components/CompliancePanel";
import { isDnc, needsConsentFirst } from "@/lib/compliance";
import {
  getLead,
  listActivitiesForLead,
  dashboardSummary,
  getProjectByLeadId,
} from "@/lib/store";
import { notFound } from "next/navigation";
import {
  Globe,
  MapPin,
  User,
  Mail,
  Building2,
  Sparkles,
  AlertCircle,
  Briefcase,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const activities = await listActivitiesForLead(id);

  const project = await getProjectByLeadId(id);

  // Nach Dispo automatisch zum nächsten fälligen Lead springen.
  const summary = await dashboardSummary();
  const idx = summary.queue.findIndex((q) => q.id === id);
  const nextLeadId =
    idx >= 0
      ? summary.queue[(idx + 1) % summary.queue.length]?.id ?? null
      : summary.queue[0]?.id ?? null;
  const nextLead = nextLeadId === id ? null : nextLeadId;

  const callBlocked = isDnc(lead) || needsConsentFirst(lead);

  const scoreVariant =
    lead.score === "hot"
      ? ("hot" as const)
      : lead.score === "warm"
        ? ("warm" as const)
        : lead.score === "cold"
          ? ("cold" as const)
          : ("neutral" as const);

  return (
    <Shell
      eyebrow="Lead"
      title={lead.company}
      actions={
        <>
          <Badge variant={scoreVariant} dot>
            {lead.score ?? "—"}
          </Badge>
          <Badge variant="neutral">{lead.status}</Badge>
          <ButtonLink href="/" variant="ghost" size="sm">
            ← Zurück
          </ButtonLink>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-6">
        {/* ── Left: Call Mode ────────────────────────────────────── */}
        <div className="col-span-8 space-y-6">
          <CallMode lead={lead} nextLeadId={nextLead} callBlocked={callBlocked} />

          <Card>
            <CardHeader title="Aktivität" eyebrow="Timeline" />
            <div className="px-5 py-4">
              <ActivityTimeline activities={activities} />
            </div>
          </Card>
        </div>

        {/* ── Right: Lead Sheet ──────────────────────────────────── */}
        <aside className="col-span-4 space-y-4">
          <Card>
            <CardHeader title="Stammdaten" eyebrow="Lead" />
            <dl className="divide-y divide-[var(--color-hairline)] px-5 py-3 text-[13px]">
              <Row icon={Building2} label="Gewerk" value={lead.trade ?? "—"} />
              <Row
                icon={MapPin}
                label="Ort"
                value={
                  lead.city
                    ? `${lead.postalCode ?? ""} ${lead.city}`.trim()
                    : "—"
                }
              />
              <Row
                icon={User}
                label="Kontakt"
                value={lead.contactName ?? "—"}
              />
              <Row icon={Mail} label="E-Mail" value={lead.email ?? "—"} />
              <Row
                icon={Globe}
                label="Website"
                value={
                  lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-copper-600)] hover:underline"
                    >
                      {lead.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </Card>

          <CompliancePanel
            leadId={lead.id}
            source={lead.source}
            dnc={lead.dnc}
            dncReason={lead.dncReason}
            dncAt={lead.dncAt}
            firstContactChannel={lead.firstContactChannel}
            consentDocumented={lead.consentDocumented}
            consentSource={lead.consentSource}
            consentAt={lead.consentAt}
          />

          {lead.painScore !== null && (
            <Card className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
                  Pain-Score
                </div>
                <AlertCircle className="h-3.5 w-3.5 text-[var(--color-warm)]" />
              </div>
              <div className="text-mono mt-2 flex items-baseline gap-2 tabular">
                <span className="text-[36px] font-semibold leading-none tracking-tight">
                  {lead.painScore}
                </span>
                <span className="text-[12px] text-[var(--color-fg-mute)]">
                  / 100
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-hot)] via-[var(--color-warm)] to-[var(--color-success)]"
                  style={{ width: `${lead.painScore}%` }}
                />
              </div>
              <p className="mt-3 text-[12px] leading-snug text-[var(--color-fg-mute)]">
                Niedriger Score = größerer Verkaufs-Hebel.
              </p>
              {(() => {
                const ap = lead.auditPayload as {
                  seo?: { score: number; grade: string } | null;
                  lighthouse?: { seo?: number | null } | null;
                } | null;
                if (!ap?.seo) return null;
                return (
                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-hairline)] pt-3 text-[12px]">
                    <span className="text-[var(--color-fg-mute)]">SEO-Check:</span>
                    <span
                      className={
                        "rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white " +
                        (ap.seo.score >= 75
                          ? "bg-[#1a7f37]"
                          : ap.seo.score >= 50
                            ? "bg-[#b25000]"
                            : "bg-[#d70015]")
                      }
                    >
                      {ap.seo.grade} · {ap.seo.score}/100
                    </span>
                    {ap.lighthouse?.seo != null && (
                      <span className="text-[var(--color-fg-mute)]">
                        Lighthouse-SEO {ap.lighthouse.seo}
                      </span>
                    )}
                  </div>
                );
              })()}
            </Card>
          )}

          {lead.status === "won" && (
            <Card>
              <CardHeader 
                title="Projekt-Status" 
                eyebrow="Management" 
                right={<Briefcase className="h-4 w-4 text-[var(--color-success)]" />}
              />
              <div className="px-5 py-4 space-y-3">
                {project ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{project.name}</span>
                      <Badge variant="success">{project.status}</Badge>
                    </div>
                    <ButtonLink href={`/projects`} variant="secondary" size="sm" className="w-full">
                      Zum Projekt-Board
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-[var(--color-fg-mute)]">
                      Kunde gewonnen! Erstelle jetzt ein Projekt, um mit der Umsetzung zu beginnen.
                    </p>
                    <ButtonLink href={`/projects/new?leadId=${lead.id}`} variant="primary" size="sm" className="w-full">
                      Projekt anlegen
                    </ButtonLink>
                  </>
                )}
              </div>
            </Card>
          )}

          {lead.status === "won" && (
            <MaintenanceOptIn
              leadId={lead.id}
              maintenance={lead.maintenance}
              intervalMonths={lead.maintenanceIntervalMonths}
            />
          )}

          <Card>
            <CardHeader
              title="Audit & Mockup"
              eyebrow="Wow-Sequenz"
              right={<Sparkles className="h-4 w-4 text-[var(--color-copper-400)]" />}
            />
            <div className="space-y-2 px-5 py-4">
              <ButtonLink
                href={`/audits/run?url=${encodeURIComponent(lead.website ?? "")}&leadId=${lead.id}`}
                variant="secondary"
                size="sm"
                className="w-full justify-start"
              >
                Audit erneut ausführen
              </ButtonLink>
              <ButtonLink
                href={`/mockups/${lead.id}`}
                variant="secondary"
                size="sm"
                className="w-full justify-start"
              >
                Live-Mockup generieren
              </ButtonLink>
              <ButtonLink
                href={`/api/pdf/${lead.id}`}
                variant="primary"
                size="sm"
                className="w-full justify-start"
              >
                Vorher/Nachher-PDF senden
              </ButtonLink>
            </div>
          </Card>

          {lead.notes && (
            <Card className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
                Notizen
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
                {lead.notes}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-[11.5px] text-[var(--color-fg-mute)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-[12.5px] text-[var(--color-fg)]">
        {value}
      </span>
    </div>
  );
}
