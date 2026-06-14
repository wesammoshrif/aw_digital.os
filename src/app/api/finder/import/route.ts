import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/mode";
import type { FinderLead } from "@/lib/finder/types";

/**
 * POST /api/finder/import
 * Body: { leads: FinderLead[] }
 * Übernimmt ausgewählte Finder-Leads in die Pipeline (Supabase).
 * Dedup gegen bestehende Leads per company + phone. Mock-Modus = 503.
 */

// Finder-Quellen → sourceEnum der DB. Kleinanzeigen/Branchenbuch gibt es im
// Enum (noch) nicht → "manual".
function toSource(s: FinderLead["source"]): string {
  if (s === "osm") return "osm";
  if (s === "google_places") return "google_places";
  return "manual";
}

/**
 * Provisorischer Pain-Score beim Import (niedriger = heißer = höhere Priorität).
 * Wird vom späteren Voll-Audit verfeinert; sorgt aber sofort für eine sinnvolle
 * Queue-Reihenfolge statt zufälliger Sortierung.
 */
function quickPainScore(l: FinderLead): number {
  let s = 60;
  if (!l.website) s -= 30; // keine Website = stärkstes Kaufsignal
  if (l.builderPlatform) s -= 20; // Gratis-Baukasten = fast genauso heiß
  if (l.rating == null) s -= 5;
  if (l.phoneType === "mobile") s -= 5; // Solo-Inhaber, geht eher selbst ran
  return Math.max(0, Math.min(100, s));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { leads?: FinderLead[] };
    const leads = Array.isArray(body.leads) ? body.leads : [];
    if (leads.length === 0)
      return NextResponse.json(
        { ok: false, error: "Keine Leads übergeben." },
        { status: 400 },
      );

    if (isMockMode) {
      return NextResponse.json(
        {
          ok: false,
          mock: true,
          message: "Demo-Modus: ohne DATABASE_URL wird nicht gespeichert.",
        },
        { status: 503 },
      );
    }

    const { db } = await import("@/db");
    const { leads: leadsTable } = await import("@/db/schema");
    const { and, eq, isNull } = await import("drizzle-orm");
    const ownerId = process.env.OWNER_ID ?? "00000000-0000-0000-0000-000000000001";

    let inserted = 0;
    let skipped = 0;

    for (const l of leads) {
      try {
        if (!l.company) {
          skipped++;
          continue;
        }
        const phoneCond = l.phone
          ? eq(leadsTable.phone, l.phone)
          : isNull(leadsTable.phone);
        const existing = await db
          .select({ id: leadsTable.id })
          .from(leadsTable)
          .where(
            and(
              eq(leadsTable.ownerId, ownerId),
              eq(leadsTable.company, l.company),
              phoneCond,
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await db.insert(leadsTable).values({
          ownerId,
          company: l.company,
          trade: l.trade,
          city: l.city,
          postalCode: l.postalCode,
          address: l.street,
          phone: l.phone,
          email: l.email,
          website: l.website,
          status: "new",
          source: toSource(l.source) as never,
          // Provisorischer Pain-Score → Queue sortiert sofort sinnvoll.
          painScore: quickPainScore(l),
          // Verkaufs-Signale für die spätere Anreicherung/Anzeige.
          custom: {
            builderPlatform: l.builderPlatform ?? null,
            rating: l.rating ?? null,
            phoneType: l.phoneType ?? null,
          },
          nextStep: "Erstanruf",
          nextStepAt: new Date(),
        });
        inserted++;
      } catch {
        skipped++;
      }
    }

    // Post-Import: frische Leads im Hintergrund auditieren (fire-and-forget,
    // blockiert die Import-Antwort nicht — verfeinert painScore + setzt Hook).
    if (inserted > 0) {
      const origin = req.nextUrl.origin;
      void fetch(`${origin}/api/audit/pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-owner-id": ownerId },
        body: JSON.stringify({ limit: Math.min(10, inserted) }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, inserted, skipped, audited: inserted > 0 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
