/**
 * GET /api/pdf/audit/[id] — Onepager für ein konkretes Audit.
 * Liefert druckfertiges HTML; PDF entsteht per "Als PDF speichern".
 */

import { NextRequest, NextResponse } from "next/server";
import { getAudit, getLead } from "@/lib/store";
import { renderOnepagerHtml } from "@/lib/pdf/onepager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) {
    return NextResponse.json({ ok: false, error: "Audit nicht gefunden" }, { status: 404 });
  }
  const lead = audit.leadId ? await getLead(audit.leadId) : null;
  const html = renderOnepagerHtml(lead, audit);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
