/**
 * POST /api/audit/pending
 *
 * Body (optional): { limit?: number }   // default 5, max 10
 *
 * Auditiert ausstehende Leads: website gesetzt, painScore noch null.
 *
 * Mock-Modus  → führt runAudit aus und gibt eine Vorschau zurück (KEIN Persist).
 * DB-Modus    → schreibt painScore + auditHook in den Lead und legt pro Lead
 *               eine audits-Zeile an (defensiv pro Lead in try/catch).
 */

import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/audit/website";
import { getTradeCard, fillTradeHook } from "@/lib/souffleur/tradePlaybook";
import { isMockMode } from "@/lib/mode";
import { OWNER_ID } from "@/lib/utils";
import { requireAuth, serverError } from "@/lib/api";

/** Hook für Leads OHNE Website — das stärkste Kaufsignal. */
function websiteLessHook(
  trade: string | null,
  city: string | null,
  contactName: string | null,
): string {
  const card = getTradeCard(trade);
  if (card) return fillTradeHook(card.hookSatz, contactName, city);
  return "Mir ist aufgefallen, dass Sie aktuell gar keine eigene Website haben — wer Sie googelt, findet nichts. Genau diese Anfragen gehen gerade an die Konkurrenz.";
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  try {
    const ownerId = OWNER_ID;

    // Body ist optional — leerer/ungültiger Body darf nicht crashen.
    let limit = 5;
    try {
      const body = (await req.json()) as { limit?: number };
      if (typeof body?.limit === "number" && Number.isFinite(body.limit)) {
        limit = Math.floor(body.limit);
      }
    } catch {
      /* kein/ungültiger Body → Default */
    }
    limit = Math.max(1, Math.min(10, limit));

    // ── Mock-Modus: nur Vorschau, kein DB-Schreiben ─────────────────
    if (isMockMode) {
      const { listLeads } = await import("@/lib/store");
      const all = await listLeads({ limit: 500 });
      const pending = all
        .filter((l) => l.website && l.painScore == null)
        .slice(0, limit);

      const audited: { company: string; painScore: number; hook: string }[] = [];
      for (const lead of pending) {
        try {
          const result = await runAudit(
            lead.website as string,
            process.env.PAGESPEED_API_KEY,
            { trade: lead.trade, city: lead.city, contactName: lead.contactName },
          );
          audited.push({
            company: lead.company,
            painScore: result.painScore,
            hook: result.hookText,
          });
        } catch (err) {
          console.warn(`[audit/pending] ${lead.company} fehlgeschlagen:`, err);
        }
      }

      return NextResponse.json({ ok: true, mock: true, audited });
    }

    // ── DB-Modus: auditieren + persistieren ─────────────────────────
    const { db } = await import("@/db");
    const { leads, audits } = await import("@/db/schema");
    const { and, eq, isNull } = await import("drizzle-orm");

    // Noch nicht auditierte Leads (auditHook leer) — auch website-LOSE, denn
    // die sind die heißesten Ziele. Der Import setzt nur einen provisorischen
    // painScore (Sortierung), aber keinen Hook → hier wird verfeinert.
    const pending = await db
      .select()
      .from(leads)
      .where(and(eq(leads.ownerId, ownerId), isNull(leads.auditHook)))
      .limit(limit);

    let auditedCount = 0;

    for (const lead of pending) {
      try {
        // ── Keine Website → Max-Pain (painScore 10) ohne runAudit ──
        if (!lead.website) {
          await db
            .update(leads)
            .set({
              painScore: 10,
              auditHook: websiteLessHook(lead.trade, lead.city, lead.contactName),
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
          auditedCount++;
          continue;
        }

        const result = await runAudit(
          lead.website,
          process.env.PAGESPEED_API_KEY,
          { trade: lead.trade, city: lead.city, contactName: lead.contactName },
        );

        await db.insert(audits).values({
          ownerId,
          leadId: lead.id,
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
        });

        await db
          .update(leads)
          .set({
            painScore: result.painScore,
            auditHook: result.hookText,
            auditPayload: result as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        auditedCount++;
      } catch (err) {
        // Pro Lead defensiv — ein fehlerhaftes Audit darf den Rest nicht stoppen.
        console.warn(`[audit/pending] Lead ${lead.id} fehlgeschlagen:`, err);
      }
    }

    return NextResponse.json({ ok: true, audited: auditedCount });
  } catch (err) {
    return serverError("audit/pending", err);
  }
}
