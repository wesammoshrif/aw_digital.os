import { NextRequest, NextResponse } from "next/server";
import { findLeads } from "@/lib/finder";
import type { FinderSourceId } from "@/lib/finder/types";

/**
 * POST /api/finder
 * Body: { city, trades[], sources[] }
 * Sucht über alle gewählten Quellen, merged + entdoppelt, gibt FinderResponse.
 * Reine Suche — schreibt NICHTS. Übernahme läuft über /api/finder/import.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      city?: string;
      trades?: string[];
      sources?: FinderSourceId[];
    };
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

    const result = await findLeads({ city, trades, sources });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
