import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { listProjects } from "@/lib/store";
import { Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planung",
  design: "Design",
  development: "Entwicklung",
  review: "Review",
  live: "Live",
  on_hold: "Pausiert",
};

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <Shell
      title="Projekte"
      eyebrow="Agentur-Management"
      actions={
        <ButtonLink href="/projects/new" variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5" /> Neues Projekt
        </ButtonLink>
      }
    >
      {projects.length === 0 ? (
        <Card className="px-6 py-12 text-center text-[14px] text-[var(--color-fg-mute)]">
          Noch keine Projekte. Gewonnene Leads hier als Projekt anlegen.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                  <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {projects.map((prj) => (
                  <tr key={prj.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--color-fg)]">{prj.name}</div>
                      <div className="text-[12px] text-[var(--color-fg-mute)] line-clamp-1">{prj.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={prj.status === "live" ? "success" : "copper"}>
                        {STATUS_LABEL[prj.status] ?? prj.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[var(--color-fg-dim)]">
                      {prj.deadline ? prj.deadline.toLocaleDateString("de-DE") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ButtonLink href={`/projects/${prj.id}`} variant="ghost" size="sm">
                        Öffnen <ArrowRight className="h-3.5 w-3.5" />
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </Shell>
  );
}
