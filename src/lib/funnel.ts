import "server-only";

/**
 * Funnel-Fortschritt aus Finanz-Ereignissen.
 *
 * Die Anruf-Kadenz (cadence.ts) führt einen Lead nur bis `audit_sent`. Die
 * Stufen `proposal` und `won` — an denen Dashboard-KPIs (proposalCount, won,
 * MRR) hängen — wurden bisher von KEINEM automatischen Pfad gesetzt. Diese
 * Helfer koppeln den Funnel an die Finanz-Ereignisse:
 *   - Angebot angelegt  → `proposal`
 *   - Angebot → Rechnung / Rechnung bezahlt → `won`
 *
 * Spiegelt das Verhalten der leads-PATCH-Route (status_change-Activity +
 * Auto-Projekt bei `won`), läuft aber über die raw-`db` der API-Routen.
 */

// Funnel-Reihenfolge. Endzustände (lost/frozen) zählen als 0 → ein neues
// Angebot/eine Zahlung darf einen re-engagten Lead wieder nach vorn holen.
const RANK: Record<string, number> = {
  lost: 0,
  frozen: 0,
  new: 0,
  contacted: 1,
  reached: 2,
  audit_sent: 3,
  proposal: 4,
  won: 5,
};

/**
 * Hebt den Lead-Status NUR vorwärts (nie zurück), schreibt einen
 * status_change-Eintrag in die Timeline und legt bei `won` defensiv ein Projekt
 * an. Schluckt jeden Fehler — darf die auslösende Finanz-Mutation nie kippen.
 */
export async function advanceLeadStatus(
  leadId: string,
  target: "proposal" | "won",
  reason: string,
): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { leads, activities } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [cur] = await db
      .select({
        status: leads.status,
        ownerId: leads.ownerId,
        company: leads.company,
      })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);
    if (!cur) return;

    const curRank = RANK[cur.status] ?? 0;
    if ((RANK[target] ?? 0) <= curRank) return; // nie zurückstufen (won bleibt won)

    await db
      .update(leads)
      .set({ status: target as never, updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    await db.insert(activities).values({
      ownerId: cur.ownerId,
      leadId,
      type: "status_change" as never,
      title: `Status: ${cur.status} → ${target}`,
      payload: { from: cur.status, to: target, reason },
    });

    // Abschluss-Automatik wie in der leads-PATCH-Route: bei `won` ein Projekt
    // anlegen, falls noch keines existiert.
    if (target === "won") {
      const { getProjectByLeadId, createProject } = await import("@/lib/store");
      const existing = await getProjectByLeadId(leadId);
      if (!existing) {
        await createProject({
          leadId,
          name: `Website ${cur.company ?? ""}`.trim(),
          status: "planning",
        });
      }
    }
  } catch (e) {
    console.error("[advanceLeadStatus]", e);
  }
}
