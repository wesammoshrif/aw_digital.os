/**
 * POST /api/audit
 *
 * Body: { leadId?: string, websiteUrl: string }
 *
 * Führt das Website-Audit aus, speichert Result + Pain-Score
 * und aktualisiert ggf. den Lead mit Auto-Hook.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { audits, leads } from "@/db/schema";
import { runAudit } from "@/lib/audit/website";
import { OWNER_ID } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { leadId?: string; websiteUrl?: string };
  if (!body.websiteUrl) {
    return NextResponse.json(
      { ok: false, error: "websiteUrl is required" },
      { status: 400 },
    );
  }
  const ownerId = req.headers.get("x-owner-id") ?? OWNER_ID;

  try {
    // Lead-Kontext (Gewerk/Stadt) für den branchenscharfen Hook ziehen.
    let meta: { trade?: string | null; city?: string | null; contactName?: string | null } = {};
    if (body.leadId && process.env.DATABASE_URL) {
      try {
        const { getLead } = await import("@/lib/store");
        const lead = await getLead(body.leadId);
        if (lead) meta = { trade: lead.trade, city: lead.city, contactName: lead.contactName };
      } catch {
        /* Hook bleibt generisch — kein Blocker. */
      }
    }

    const result = await runAudit(
      body.websiteUrl,
      process.env.PAGESPEED_API_KEY,
      meta,
    );

    // Ohne DB: Audit läuft trotzdem, Ergebnis kommt direkt zurück.
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, mock: true, audit: null, result });
    }

    const [stored] = await db
      .insert(audits)
      .values({
        ownerId,
        leadId: body.leadId ?? null,
        websiteUrl: result.websiteUrl,
        mobileScore: result.mobileScore,
        desktopScore: result.desktopScore,
        lcpMs: result.lcpMs,
        clsScore: result.clsScore?.toString() ?? null,
        hasHttps: result.hasHttps,
        hasImpressum: result.hasImpressum,
        hasViewport: result.hasViewport,
        hasBookingCta: result.hasBookingCta,
        techStack: result.techStack,
        painScore: result.painScore,
        hookText: result.hookText,
        rawResult: result as unknown as Record<string, unknown>,
      })
      .returning();

    if (body.leadId) {
      await db
        .update(leads)
        .set({
          painScore: result.painScore,
          auditHook: result.hookText,
          auditPayload: result as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, body.leadId));
    }

    return NextResponse.json({ ok: true, audit: stored, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
