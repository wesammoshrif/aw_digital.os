import { NextRequest, NextResponse } from "next/server";
import { findLeads } from "@/lib/finder";
import type { FinderSourceId } from "@/lib/finder/types";
import { requireAuth, serverError, parseJson } from "@/lib/api";
import { finderSchema } from "@/lib/validation";

/**
 * POST /api/finder
 * Body: { city, trades[], sources[] }
 * Sucht über alle gewählten Quellen, merged + entdoppelt, gibt FinderResponse.
 * Reine Suche — schreibt NICHTS. Übernahme läuft über /api/finder/import.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const parsed = await parseJson(req, finderSchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const city = (body.city ?? "").trim();
  const trades = Array.isArray(body.trades) ? body.trades : [];
  const sources = (
    Array.isArray(body.sources) ? body.sources : ["osm"]
  ) as FinderSourceId[];

  if (!city)
    return NextResponse.json({ ok: false, error: "Stadt fehlt." }, { status: 400 });
  if (trades.length === 0)
    return NextResponse.json(
      { ok: false, error: "Kein Gewerk gewählt." },
      { status: 400 },
    );

  try {
    const result = await findLeads({ city, trades, sources });
    return NextResponse.json(result);
  } catch (err) {
    return serverError("finder POST", err);
  }
}
