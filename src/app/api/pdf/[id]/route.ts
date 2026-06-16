/**
 * GET /api/pdf/[id] — Onepager für einen Lead (neuestes Audit).
 * Liefert druckfertiges HTML; PDF entsteht per "Als PDF speichern".
 */

import { NextRequest, NextResponse } from "next/server";
import { getLead, getLatestAuditForLead } from "@/lib/store";
import { renderOnepagerHtml } from "@/lib/pdf/onepager";
import { requireAuth } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead nicht gefunden" }, { status: 404 });
  }
  const audit = await getLatestAuditForLead(id);
  const html = renderOnepagerHtml(lead, audit);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
