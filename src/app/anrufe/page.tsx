import { Shell } from "@/components/Shell";
import { CallLog } from "@/components/CallLog";
import { listCallsWithContext } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AnrufePage() {
  const calls = await listCallsWithContext();
  // Date → ISO-String fürs Client-Component (stabil serialisierbar).
  const rows = calls.map((c) => ({
    id: c.id,
    startedAt: c.startedAt.toISOString(),
    durationSec: c.durationSec,
    dispo: c.dispo,
    sentiment: c.sentiment,
    note: c.note,
    leadId: c.leadId,
    company: c.company,
    phone: c.phone,
    trade: c.trade,
    city: c.city,
    agentId: c.agentId,
    agentName: c.agentName,
    agentEmail: c.agentEmail,
  }));

  return (
    <Shell
      eyebrow="Protokoll"
      title="Anrufe"
    >
      <CallLog rows={rows} nowMs={Date.now()} />
    </Shell>
  );
}
