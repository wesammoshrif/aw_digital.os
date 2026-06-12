import { SouffleurRoom } from "@/components/Souffleur/SouffleurRoom";
import { getLead } from "@/lib/store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/* Standalone-Fenster — KEIN Shell/Sidebar. Per window.open als Pop-up. */
export default async function SouffleurPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { autocall } = await searchParams;
  const lead = await getLead(id);
  if (!lead) notFound();
  return <SouffleurRoom lead={lead} autoDial={autocall === "1"} />;
}
