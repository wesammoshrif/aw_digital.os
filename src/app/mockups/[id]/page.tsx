import { Shell } from "@/components/Shell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { MockupPreview } from "@/components/MockupPreview";
import { getLead } from "@/lib/store";
import { pickTemplate, TEMPLATES } from "@/lib/mockup/templates";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MockupForLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // wenn id ein Lead-id ist → Lead-Mockup. wenn template-id → Demo.
  if (id in TEMPLATES) {
    const t = TEMPLATES[id as keyof typeof TEMPLATES];
    const demoLead = {
      id: "demo",
      ownerId: "demo",
      company: "Beispiel Meisterbetrieb",
      trade: t.trade,
      city: "Hannover",
      postalCode: "30159",
      address: null,
      contactName: null,
      phone: "+4951122334455",
      email: null,
      website: "beispiel-meisterbetrieb.de",
      status: "new" as const,
      score: null,
      source: "manual" as const,
      value: null,
      maintenance: null,
      maintenanceIntervalMonths: null,
      lastMaintenanceInvoiceAt: null,
      dnc: false,
      dncReason: null,
      dncAt: null,
      firstContactChannel: null,
      consentDocumented: false,
      consentAt: null,
      consentSource: null,
      painScore: null,
      auditHook: null,
      auditPayload: null,
      nextStep: null,
      nextStepAt: null,
      attempts: 0,
      locked: false,
      notes: null,
      tags: null,
      custom: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return (
      <Shell
        eyebrow={t.label}
        title="Mockup-Vorschau"
        actions={
          <Badge variant="copper" dot>
            Demo
          </Badge>
        }
      >
        <MockupPreview lead={demoLead} template={t} />
      </Shell>
    );
  }

  const lead = await getLead(id);
  if (!lead) notFound();
  const template = pickTemplate(lead.trade);

  return (
    <Shell
      eyebrow={lead.company}
      title="Live-Mockup"
      actions={
        <>
          <Badge variant="copper" dot>
            {template.label}
          </Badge>
          <ButtonLink
            href={`/leads/${lead.id}`}
            variant="ghost"
            size="sm"
          >
            ← Zurück zum Lead
          </ButtonLink>
          <ButtonLink
            href={`/api/pdf/${lead.id}`}
            variant="primary"
            size="sm"
          >
            Vorher/Nachher-PDF
          </ButtonLink>
        </>
      }
    >
      <p className="mb-4 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-fg-dim)]">
        Diese Vorschau ist als geteilter Link im Verkaufsgespräch gedacht — der
        Interessent sieht, wie seine Website morgen aussehen könnte. Logo und
        Farben werden im Live-System automatisch aus seiner aktuellen Site
        gezogen.
      </p>
      <MockupPreview lead={lead} template={template} />
    </Shell>
  );
}
