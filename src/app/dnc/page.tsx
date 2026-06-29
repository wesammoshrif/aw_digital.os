import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { listDncLeads } from "@/lib/store";
import { Ban, Download, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DncPage() {
  const leads = await listDncLeads();

  return (
    <Shell
      eyebrow="Compliance"
      title="Nicht mehr anrufen (DNC)"
      actions={
        leads.length > 0 ? (
          <ButtonLink href="/api/leads/dnc/export" variant="secondary" size="sm">
            <Download className="h-3.5 w-3.5" /> CSV exportieren
          </ButtonLink>
        ) : undefined
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-[14px] border border-[var(--color-hairline)] bg-[#fbfcff] p-4 text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
        <Ban className="mt-0.5 h-4 w-4 shrink-0 text-[#d70015]" />
        <span>
          Diese Betriebe sind <b>dauerhaft</b> aus allen Anruf-Queues
          ausgeschlossen (Kein Interesse, Falsche Nummer, ausdrücklicher Opt-out
          oder manuell gesperrt). Die Liste ist der Compliance-Nachweis und per
          CSV exportierbar.
        </span>
      </div>

      {leads.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <div className="text-[14px] text-[var(--color-fg)]">
            Noch keine gesperrten Leads.
          </div>
          <div className="mt-1.5 text-[12.5px] text-[var(--color-fg-mute)]">
            „Kein Interesse" / „Falsche Nummer" / „Nicht mehr anrufen" landen
            automatisch hier.
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[18px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] text-left text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
                <th className="px-4 py-2.5">Firma</th>
                <th className="px-4 py-2.5">Telefon</th>
                <th className="px-4 py-2.5">Grund</th>
                <th className="px-4 py-2.5">Seit</th>
                <th className="px-4 py-2.5">Quelle</th>
                <th className="px-4 py-2.5 text-right">Öffnen</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="group border-b border-[var(--color-hairline)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="font-medium text-[var(--color-fg)] group-hover:text-[var(--color-copper-600)]"
                    >
                      {l.company}
                    </Link>
                    {l.trade && (
                      <div className="text-[12px] text-[var(--color-fg-mute)]">
                        {l.trade}
                        {l.city ? ` · ${l.city}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg-dim)] line-through">
                    {l.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[var(--color-fg-dim)]">
                    {l.dncReason ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--color-fg-mute)]">
                    {l.dncAt
                      ? new Date(l.dncAt).toLocaleDateString("de-DE")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--color-fg-mute)]">
                    {l.source ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/leads/${l.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-mute)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
