import { NextRequest, NextResponse } from "next/server";

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
  const { id: leadId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    title?: string;
    payload?: Record<string, unknown>;
  };

  if (!body.type || !body.title) {
    return NextResponse.json(
      { ok: false, error: "Type und Title sind erforderlich" },
      { status: 400 },
    );
  }
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
        ownerId: process.env.OWNER_ID || "00000000-0000-0000-0000-000000000001",
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
    console.error("[Activities] Failed to create:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
