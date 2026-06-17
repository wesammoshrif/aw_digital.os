import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { withRls } from "@/lib/db/rls";
import { isMockMode } from "@/lib/mode";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { computeAgentMetrics } from "@/lib/reviews/agentReview";
import { AgentReviewPanel, type ReviewRow } from "@/components/AgentReviewPanel";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/");

  const { agentId } = await params;

  if (isMockMode) {
    return (
      <Shell title="Mitarbeiter" eyebrow="Bewertung">
        <Card className="p-8 text-center text-[13.5px] text-[var(--color-fg-mute)]">
          Mitarbeiter-Bewertungen brauchen die Datenbank — im Demo-Modus nicht verfügbar.
        </Card>
      </Shell>
    );
  }

  const { db } = await import("@/db");
  const { profiles } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [profile] = await db
    .select({ id: profiles.id, name: profiles.name, email: profiles.email, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, agentId))
    .limit(1);
  if (!profile) notFound();

  const agentName = profile.name ?? profile.email;

  // Live-Kennzahlen (30 Tage) + gespeicherte Bewertungen parallel.
  const [metrics, rawReviews] = await Promise.all([
    computeAgentMetrics(agentId, 30),
    withRls(me, async (tx) => {
      const { agentReviews } = await import("@/db/schema");
      const { eq: eqx, desc } = await import("drizzle-orm");
      return tx
        .select()
        .from(agentReviews)
        .where(eqx(agentReviews.agentId, agentId))
        .orderBy(desc(agentReviews.createdAt));
    }),
  ]);

  const reviews: ReviewRow[] = rawReviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    failurePoints: r.failurePoints,
    summary: r.summary,
    coaching: r.coaching,
    callsAnalyzed: r.callsAnalyzed,
    periodStart: r.periodStart ? r.periodStart.toISOString() : null,
    periodEnd: r.periodEnd ? r.periodEnd.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  const eur = (n: number) =>
    new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n) + " €";

  return (
    <Shell title={agentName} eyebrow={profile.email}>
      <div className="mb-4">
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Zurück zum Team
        </Link>
      </div>

      {/* Live-Kennzahlen (letzte 30 Tage) */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Anrufe (30T)" value={String(metrics.calls.total)} sub={`${metrics.calls.connected} verbunden`} />
        <Stat label="Verbindung" value={`${metrics.calls.connectRate}%`} sub={`Ø ${metrics.calls.avgDurationSec}s`} />
        <Stat label="Termine" value={String(metrics.calls.appointments)} sub={`${metrics.calls.interested} interessiert`} />
        <Stat label="Conversion" value={`${metrics.leads.conversionRate}%`} sub={`${metrics.leads.contacted} kontaktiert`} />
        <Stat label="Gewonnen" value={String(metrics.leads.won)} sub={`${metrics.leads.lost} verloren`} />
        <Stat label="MRR" value={eur(metrics.revenue.mrr)} sub={`${eur(metrics.revenue.paid)} bezahlt`} />
      </div>

      <AgentReviewPanel agentId={agentId} agentName={agentName} reviews={reviews} />
    </Shell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-medium text-[var(--color-fg-mute)]">{label}</div>
      <div className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-fg)] tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--color-fg-mute)]">{sub}</div>}
    </Card>
  );
}
