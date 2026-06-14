/**
 * GET /api/pdf/audit/[id] — Onepager für ein konkretes Audit.
 * Liefert druckfertiges HTML; PDF entsteht per "Als PDF speichern".
 */

import { NextRequest, NextResponse } from "next/server";
import { getAudit, getLead } from "@/lib/store";
import { renderOnepagerHtml } from "@/lib/pdf/onepager";
import { requireAuth } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAuth(req);
  if (denied) return denied;

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
