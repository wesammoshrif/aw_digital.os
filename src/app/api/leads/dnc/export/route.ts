/**
 * GET /api/leads/dnc/export — Do-Not-Call-Liste als CSV-Download.
 *
 * Compliance-Nachweis: alle dauerhaft gesperrten Leads (dnc=true). RLS-gescopt
 * über den Store (Admin sieht alle, Agent nur eigene).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { listDncLeads } from "@/lib/store";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // RFC4180: in Anführungszeichen, wenn Komma/Quote/Zeilenumbruch vorkommt.
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  try {
    const leads = await listDncLeads();
    const header = [
      "Firma",
      "Telefon",
      "E-Mail",
      "Gewerk",
      "Ort",
      "Grund",
      "DNC seit",
      "Quelle",
      "Einwilligung",
    ];
    const rows = leads.map((l) =>
      [
        l.company,
        l.phone ?? "",
        l.email ?? "",
        l.trade ?? "",
        [l.postalCode, l.city].filter(Boolean).join(" "),
        l.dncReason ?? "",
        l.dncAt ? new Date(l.dncAt).toISOString().slice(0, 10) : "",
        l.source ?? "",
        l.consentDocumented ? "dokumentiert" : "nein",
      ]
        .map(csvCell)
        .join(","),
    );
    // BOM, damit Excel die Umlaute richtig erkennt.
    const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dnc-liste-${today}.csv"`,
      },
    });
  } catch (err) {
    return serverError("leads/dnc/export", err);
  }
}
