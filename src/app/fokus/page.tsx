import { dashboardSummary } from "@/lib/store";
import { FokusStage } from "@/components/FokusStage";

// Bewusst OHNE Shell/Sidebar → echter ablenkungsfreier Cold-Call-Modus.
export const dynamic = "force-dynamic";

export default async function FokusPage({
  searchParams,
}: {
  searchParams: Promise<{ skip?: string }>;
}) {
  const { skip } = await searchParams;
  const data = await dashboardSummary();
  // Den gerade bearbeiteten Lead überspringen, damit derselbe Lead nicht sofort
  // wieder oben steht (z.B. „Besetzt" bleibt fällig) → kein Endlos-Loop.
  const candidates = skip
    ? data.queue.filter((l) => l.id !== skip)
    : data.queue;
  const lead = candidates[0] ?? null;
  const nextLeadId = candidates[1]?.id ?? null;

  return (
    <FokusStage
      lead={lead}
      nextLeadId={nextLeadId}
      todayProgress={data.streak.todayProgress}
      todayTarget={data.streak.todayTarget}
      streakCurrent={data.streak.current}
      todayAppointments={data.todayAppointments}
    />
  );
}
