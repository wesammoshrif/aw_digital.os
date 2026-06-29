"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone, ArrowUpRight, Ban } from "lucide-react";
import { LeadsFilter } from "./LeadsFilter";
import { StatusMenu } from "./StatusMenu";
import { cn } from "@/lib/utils";
import { isDnc, needsConsentFirst } from "@/lib/compliance";
import type { Lead } from "@/db/schema";

function patchLead(id: string, body: Record<string, unknown>) {
  fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    /* optimistic — ignore network errors in demo */
  });
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [rows, setRows] = useState(leads);
  // Server-Daten haben Vorrang: nach router.refresh()/Re-Navigation neu spiegeln,
  // sonst zeigt die Tabelle veraltete Zeilen (useState initialisiert nur einmal).
  useEffect(() => setRows(leads), [leads]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [justUpdated, setJustUpdated] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      const hay = [l.company, l.city, l.phone, l.email, l.trade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [rows, status, q]);

  function updateStatus(id: string, next: string) {
    setRows((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: next as Lead["status"] } : l,
      ),
    );
    setJustUpdated(id);
    setTimeout(() => setJustUpdated(null), 900);
    patchLead(id, { status: next });
  }

  function registerCall(lead: Lead) {
    setRows((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, attempts: l.attempts + 1 } : l,
      ),
    );
    patchLead(lead.id, { attempts: lead.attempts + 1 });
  }

  return (
    <>
      <LeadsFilter
        activeStatus={status}
        onStatusChange={setStatus}
        onSearch={setQ}
        count={filtered.length}
      />

      <div className="overflow-x-auto rounded-[18px] bg-white shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--color-hairline)] text-left text-[11px] font-medium uppercase tracking-[0.02em] text-[var(--color-fg-mute)]">
              <th className="px-4 py-2.5">Firma</th>
              <th className="px-4 py-2.5">Gewerk</th>
              <th className="px-4 py-2.5">Ort</th>
              <th className="px-4 py-2.5 text-right">Pain</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Schnellaktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr
                key={l.id}
                className={cn(
                  "group border-b border-[var(--color-hairline)] transition-colors last:border-b-0",
                  justUpdated === l.id
                    ? "bg-[#e9f2fe]"
                    : "hover:bg-[var(--color-surface-2)]",
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${l.id}`}
                    className="flex items-center gap-2"
                  >
                    {l.score && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          l.score === "hot" && "bg-[var(--color-hot)]",
                          l.score === "warm" && "bg-[var(--color-warm)]",
                          l.score === "cold" && "bg-[var(--color-cold)]",
                        )}
                      />
                    )}
                    <span className="font-medium text-[var(--color-fg)] group-hover:text-[var(--color-copper-600)]">
                      {l.company}
                    </span>
                  </Link>
                  {l.auditHook && (
                    <div className="mt-0.5 line-clamp-1 max-w-[46ch] text-[12px] italic text-[var(--color-fg-mute)]">
                      „{l.auditHook}"
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--color-fg-dim)]">
                  {l.trade ?? "—"}
                </td>
                <td className="px-4 py-3 text-[var(--color-fg-dim)]">
                  {l.city ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <PainCell value={l.painScore} />
                </td>
                <td className="px-4 py-3">
                  <StatusMenu
                    value={l.status}
                    onChange={(next) => updateStatus(l.id, next)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {isDnc(l) ? (
                      <span
                        title="Gesperrt — nicht mehr anrufen (DNC)"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fef2f2] text-[#d70015]"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </span>
                    ) : l.phone ? (
                      <a
                        href={`tel:${l.phone}`}
                        onClick={(e) => {
                          if (
                            needsConsentFirst(l) &&
                            !window.confirm(
                              "Öffentlich gescrapter Lead ohne dokumentierte Einwilligung. Rechtssicher wäre Erstkontakt per Brief (BVerwG 6 C 3.23). Trotzdem anrufen?",
                            )
                          ) {
                            e.preventDefault();
                            return;
                          }
                          registerCall(l);
                        }}
                        title={
                          needsConsentFirst(l)
                            ? "Achtung: keine Einwilligung — erst Brief (BVerwG)"
                            : `Anrufen · ${l.phone}`
                        }
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition active:scale-95",
                          needsConsentFirst(l)
                            ? "bg-[#e8a13a] hover:bg-[#d6912c]"
                            : "bg-[var(--color-copper-500)] hover:bg-[#0077ed]",
                        )}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-fg-faint)]">
                        <Phone className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <Link
                      href={`/leads/${l.id}`}
                      title="Lead öffnen"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-mute)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-[13px] text-[var(--color-fg-mute)]"
                >
                  Keine Treffer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 px-1 text-[12px] text-[var(--color-fg-mute)]">
        Tipp: Status direkt in der Tabelle ändern, Telefon-Button ruft sofort an
        und zählt den Versuch hoch.
      </p>
    </>
  );
}

function PainCell({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-[var(--color-fg-mute)]">—</span>;
  const tone =
    value < 20
      ? "text-[var(--color-hot)]"
      : value < 50
        ? "text-[var(--color-warm)]"
        : "text-[var(--color-fg-mute)]";
  return (
    <span className={cn("tabular text-[12.5px] font-semibold", tone)}>
      {value}
    </span>
  );
}
