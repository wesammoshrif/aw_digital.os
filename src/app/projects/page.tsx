import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listProjects } from "@/lib/store";


export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <Shell title="Projekte" eyebrow="Agentur-Management">
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {projects.map((prj) => (
                <tr key={prj.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--color-fg)]">{prj.name}</div>
                    <div className="text-[12px] text-[var(--color-fg-mute)]">{prj.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={prj.status === "live" ? "success" : "copper"}>
                      {prj.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[var(--color-fg-dim)]">
                    {prj.deadline ? prj.deadline.toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-6 py-4 text-[13px]">
                    {prj.liveUrl && (
                      <a href={prj.liveUrl} target="_blank" className="text-[var(--color-copper-600)] hover:underline">
                        Live-Seite
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Shell>
  );
}
