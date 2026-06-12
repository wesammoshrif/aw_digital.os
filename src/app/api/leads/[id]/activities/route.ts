import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/leads/[id]/activities
 * 
 * Fügt eine neue Aktivität zu einem Lead hinzu.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const body = await req.json();

  if (!body.type || !body.title) {
    return NextResponse.json(
      { ok: false, error: "Type und Title sind erforderlich" },
      { status: 400 }
    );
  }

  // Kein DB verbunden → Mock success
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, mock: true, id: crypto.randomUUID(), ...body });
  }

  try {
    const { db } = await import("@/db");
    const { activities } = await import("@/db/schema");

    const [newActivity] = await db.insert(activities).values({
      ownerId: process.env.OWNER_ID || "00000000-0000-0000-0000-000000000001",
      leadId: leadId,
      type: body.type,
      title: body.title,
      payload: body.payload || {},
    }).returning();

    return NextResponse.json({ ok: true, activity: newActivity });
  } catch (err) {
    console.error("[Activities] Failed to create:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
