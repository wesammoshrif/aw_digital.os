import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { activitySchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/auth/session";

const ACTIVITY_TYPES = [
  "call",
  "email",
  "sms",
  "note",
  "meeting",
  "audit",
  "proposal",
  "contract",
  "status_change",
];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/leads/[id]/activities — fügt eine Aktivität zu einem Lead hinzu.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const user = (await getSessionUser())!;

  const { id: leadId } = await params;
  const parsed = await parseJson(req, activitySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (!ACTIVITY_TYPES.includes(body.type)) {
    return NextResponse.json(
      { ok: false, error: `Ungültiger Activity-Type: ${body.type}` },
      { status: 400 },
    );
  }

  // Kein DB verbunden → Mock success
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true });
  }

  if (!UUID_RE.test(leadId)) {
    return NextResponse.json({ ok: false, error: "Ungültige Lead-ID" }, { status: 400 });
  }

  try {
    const { db } = await import("@/db");
    const { activities, leads } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    // IDOR-Schutz: Aktivität nur an einen Lead hängen, der dem User gehört
    // (Admin darf an alle). Der Insert läuft über die Superuser-db (umgeht RLS),
    // deshalb hier eine explizite Owner-Prüfung — sonst könnte ein Agent fremde
    // (auch Admin-) Leads mit Aktivitäten verunreinigen.
    const scope =
      user.role === "admin"
        ? eq(leads.id, leadId)
        : and(eq(leads.id, leadId), eq(leads.ownerId, user.id));
    const [owned] = await db.select({ id: leads.id }).from(leads).where(scope).limit(1);
    if (!owned) {
      return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
    }

    const [newActivity] = await db
      .insert(activities)
      .values({
        ownerId: user.id,
        leadId,
        type: body.type as never,
        title: body.title,
        payload: body.payload || {},
      })
      .returning();

    if (!newActivity) {
      return NextResponse.json({ ok: false, error: "Insert ohne Ergebnis" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, activity: newActivity });
  } catch (err) {
    return serverError("activities POST", err);
  }
}
