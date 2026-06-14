import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { activitySchema } from "@/lib/validation";
import { OWNER_ID } from "@/lib/utils";

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
  const denied = requireAuth(req);
  if (denied) return denied;

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
    const { activities } = await import("@/db/schema");

    const [newActivity] = await db
      .insert(activities)
      .values({
        ownerId: OWNER_ID,
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
