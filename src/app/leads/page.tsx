import { Shell } from "@/components/Shell";
import { LeadsTable } from "@/components/LeadsTable";
import { ButtonLink } from "@/components/ui/Button";
import { listLeads } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads({ limit: 500 });

  return (
    <Shell
      eyebrow="Datenbank"
      title="Leads"
      actions={
        <>
          <ButtonLink href="/scrape" variant="secondary" size="sm">
            Scrapen
          </ButtonLink>
          <ButtonLink href="/leads/new" variant="primary" size="sm">
            + Neuer Lead
          </ButtonLink>
        </>
      }
    >
      <LeadsTable leads={leads} />
    </Shell>
  );
}
