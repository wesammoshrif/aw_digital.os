import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { listQuotes, listRechnungen, nowAnchor } from "@/lib/store";
import { FileText, Receipt, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { InvoiceActions } from "@/components/InvoiceActions";
import type { Invoice } from "@/db/schema";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
  accepted: "Angenommen",
  declined: "Abgelehnt",
};

const TYPE_LABEL: Record<string, string> = {
  one_time: "Einmalig",
  deposit: "Anzahlung",
  recurring_maintenance: "Wartung",
  recurring_hosting: "Hosting",
};

function statusVariant(s: string): "success" | "danger" | "copper" | "neutral" {
  if (s === "paid" || s === "accepted") return "success";
  if (s === "overdue" || s === "declined" || s === "cancelled") return "danger";
  if (s === "sent") return "copper";
  return "neutral";
}

function eur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default async function FinancesPage() {
  const [quotes, invoices] = await Promise.all([listQuotes(), listRechnungen()]);
  const now = nowAnchor();

  const openQuoteValue = quotes
    .filter((q) => q.status === "sent" || q.status === "draft")
    .reduce((s, q) => s + parseFloat(q.amount), 0);
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted").length;
  const sentQuotes = quotes.filter((q) => q.status === "sent").length;

  const openInvoiceValue = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + parseFloat(i.amount), 0);
  const overdueValue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + parseFloat(i.amount), 0);
  const paidThisMonth = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paidAt &&
        i.paidAt.getMonth() === now.getMonth() &&
        i.paidAt.getFullYear() === now.getFullYear(),
    )
    .reduce((s, i) => s + parseFloat(i.amount), 0);

  return (
    <Shell
      title="Finanzen"
      eyebrow="Angebote & Rechnungen"
      actions={
        <>
          <ButtonLink href="/finances/new?kind=quote" variant="ghost" size="sm">
            <FileText className="h-3.5 w-3.5" /> Neues Angebot
          </ButtonLink>
          <ButtonLink href="/finances/new?kind=invoice" variant="primary" size="sm">
            <Receipt className="h-3.5 w-3.5" /> Neue Rechnung
          </ButtonLink>
        </>
      }
    >
      <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Kpi icon={FileText} label="Offene Angebote" value={eur(openQuoteValue)} hint={`${sentQuotes} versendet · ${acceptedQuotes} angenommen`} />
        <Kpi icon={Clock} label="Offene Rechnungen" value={eur(openInvoiceValue)} hint="Versendet + überfällig" />
        <Kpi icon={AlertTriangle} label="Überfällig" value={eur(overdueValue)} hint={overdueValue > 0 ? "Mahnung fällig" : "Alles im grünen Bereich"} tone={overdueValue > 0 ? "danger" : "ok"} />
        <Kpi icon={CheckCircle2} label="Bezahlt (Monat)" value={eur(paidThisMonth)} hint="Eingegangen lfd. Monat" tone="ok" />
      </section>

      <Section
        title="Angebote"
        subtitle="Versendete und entworfene Angebote · angenommen = wird zur Rechnung"
        icon={FileText}
        rows={quotes}
        emptyText="Keine Angebote."
        validLabel="Gültig bis"
      />

      <div className="mt-10">
        <Section
          title="Rechnungen"
          subtitle="Gestellte Rechnungen · überfällige zuerst im Blick behalten"
          icon={Receipt}
          rows={invoices}
          emptyText="Keine Rechnungen."
          validLabel="Fällig am"
        />
      </div>
    </Shell>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  rows,
  emptyText,
  validLabel,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: Invoice[];
  emptyText: string;
  validLabel: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--color-copper-600)]" />
        <h2 className="text-display text-[17px]">{title}</h2>
        <Badge variant="neutral">{rows.length}</Badge>
      </div>
      <p className="mb-3 text-[12.5px] text-[var(--color-fg-mute)]">{subtitle}</p>

      {rows.length === 0 ? (
        <Card className="px-6 py-10 text-center text-[14px] text-[var(--color-fg-mute)]">
          {emptyText}
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                <Th>Nummer</Th>
                <Th>Status</Th>
                <Th>Art</Th>
                <Th className="text-right">Betrag</Th>
                <Th>{validLabel}</Th>
                <Th>Notiz</Th>
                <Th className="text-right">Aktion</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono text-[13px] text-[var(--color-fg)]">
                    {r.invoiceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(r.status)}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[var(--color-fg-dim)]">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-[14px] tabular">
                    {eur(parseFloat(r.amount))}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[var(--color-fg-dim)]">
                    {r.dueDate ? r.dueDate.toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-6 py-4 text-[12px] text-[var(--color-fg-mute)] max-w-[28ch] truncate">
                    {r.notes}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <InvoiceActions
                      id={r.id}
                      kind={r.kind}
                      status={r.status}
                      converted={!!r.convertedInvoiceId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={"px-6 py-3 text-[12px] font-semibold text-[var(--color-fg-mute)] uppercase tracking-wider " + className}>
      {children}
    </th>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "danger";
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-fg-mute)]">
        <span
          className={
            "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] " +
            (tone === "danger"
              ? "bg-[#ffeceb] text-[#d70015]"
              : tone === "ok"
                ? "bg-[#e6f7ea] text-[#1a7f37]"
                : "bg-[#eff5ff] text-[var(--color-copper-600)]")
          }
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="text-mono mt-3 text-[26px] font-semibold leading-none tracking-tight tabular text-[var(--color-fg)]">
        {value}
      </div>
      {hint && <div className="mt-2 text-[12px] text-[var(--color-fg-mute)]">{hint}</div>}
    </Card>
  );
}
