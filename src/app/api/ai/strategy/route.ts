import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { dashboardSummary } from "@/lib/store";


export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, message: "ANTHROPIC_API_KEY fehlt." });
  }

  try {
    const data = await dashboardSummary();
    const client = new Anthropic({ apiKey: key });

    const prompt = `Du bist der Strategie-Berater für die Webdesign-Agentur von Wesam Moshrif.
    Hier ist der aktuelle Status der Agentur:
    - Leads gesamt: ${data.total}
    - Gewonnene Kunden: ${data.won}
    - Monatlicher Wartungs-Umsatz: ${data.mrr} €
    - Aktive Projekte: ${data.activeProjects.length}
    - Umsatz diesen Monat: ${data.revenueThisMonth} €

    Basierend auf diesen Daten, gib mir 3 kurze, extrem "geile" und motivierende Tipps für heute. 
    Einer für Akquise, einer für Projekt-Management, einer für Finanzen.
    Kurz, knackig, auf Augenhöhe. Antworte in JSON: { "tips": ["...", "...", "..."] }`;

    const msg = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      system: "Du antwortest ausschließlich in validem JSON.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text);

    return NextResponse.json({ ok: true, ...json });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, message: "Claude Fehler" });
  }
}
