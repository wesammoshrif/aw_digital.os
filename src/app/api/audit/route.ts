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
import { audits, leads, activities } from "@/db/schema";
import { runAudit } from "@/lib/audit/website";
import { getSessionUser } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { auditSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const parsed = await parseJson(req, auditSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
        ownerId: user.id,
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
        .where(
          user.role === "admin"
            ? eq(leads.id, body.leadId)
            : and(eq(leads.id, body.leadId), eq(leads.ownerId, user.id)),
        );

      // In die Lead-Timeline schreiben, damit der Verlauf vollständig ist
      // (Activity-Spine). Darf den Audit-Erfolg nie kippen → defensiv.
      try {
        await db.insert(activities).values({
          ownerId: user.id,
          leadId: body.leadId,
          type: "audit" as never,
          title: `Website-Audit · Pain ${result.painScore} · Mobile ${result.mobileScore ?? "–"}`,
          payload: {
            painScore: result.painScore,
            mobileScore: result.mobileScore,
            desktopScore: result.desktopScore,
            websiteUrl: result.websiteUrl,
            hook: result.hookText,
          },
        });
      } catch (e) {
        console.error("[audit] Activity-Log fehlgeschlagen:", e);
      }
    }

    return NextResponse.json({ ok: true, audit: stored, result });
  } catch (err) {
    return serverError("audit POST", err);
  }
}
