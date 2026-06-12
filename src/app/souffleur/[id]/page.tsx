import { SouffleurRoom } from "@/components/Souffleur/SouffleurRoom";
import { getLead } from "@/lib/store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/* Standalone-Fenster — KEIN Shell/Sidebar. Per window.open als Pop-up. */
export default async function SouffleurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  return <SouffleurRoom lead={lead} />;
}
