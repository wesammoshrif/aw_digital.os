"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crosshair, Flame, Trophy, X, Settings2 } from "lucide-react";
import { CallMode } from "@/components/CallMode";
import { cn } from "@/lib/utils";
import type { Lead } from "@/db/schema";
import {
  getProvisionConfig,
  setProvisionConfig,
  provisionPerTermin,
  fmtEuro,
  PROVISION_DEFAULT,
  type ProvisionConfig,
} from "@/lib/provision";

/**
 * Cold-Call-Fokusmodus: Vollbild ohne Sidebar/Header, oben ein fester Ticker
 * (Anrufe heute · Streak · mögliche Provision), in der Mitte NUR der aktuelle
 * Lead + CallMode. Nach jeder Disposition lädt CallMode (focusMode) `/fokus`
 * neu → nächster fälliger Lead + frische Zahlen. Esc verlässt den Modus.
 */
export function FokusStage({
  lead,
  nextLeadId,
  todayProgress,
  todayTarget,
  streakCurrent,
  todayAppointments,
}: {
  lead: Lead | null;
  nextLeadId: string | null;
  todayProgress: number;
  todayTarget: number;
  streakCurrent: number;
  todayAppointments: number;
}) {
  const router = useRouter();

  // Esc = Fokus verlassen (hohe Fluchtfrequenz beim Callen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="min-h-screen">
      <FokusTicker
        current={todayProgress}
        target={todayTarget}
        streak={streakCurrent}
        appts={todayAppointments}
        onExit={() => router.push("/")}
      />

      <main className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-7">
        {lead ? (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--color-copper-600)]">
                <Crosshair className="h-3.5 w-3.5" />
                Cold-Call-Fokus
              </div>
              <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-fg)]">
                {lead.company}
              </h1>
              <p className="mt-0.5 text-[13px] text-[var(--color-fg-mute)]">
                {[lead.trade, lead.city].filter(Boolean).join(" · ") ||
                  "Branche unklar"}
              </p>
            </div>
            <CallMode
              key={lead.id}
              lead={lead}
              nextLeadId={nextLeadId}
              focusMode
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[22px] bg-white px-8 py-16 text-center shadow-[var(--shadow-1)] ring-1 ring-black/[0.04]">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eafaf0] text-[var(--color-success)]">
              <Trophy className="h-8 w-8" />
            </span>
            <h2 className="text-[20px] font-semibold text-[var(--color-fg)]">
              Gerade nichts weiter fällig.
            </h2>
            <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-[var(--color-fg-mute)]">
              Kein weiterer fälliger Lead in der Queue. Stark gemacht —{" "}
              {todayProgress} {todayProgress === 1 ? "Anruf" : "Anrufe"} heute.
            </p>
            <Link
              href="/"
              className="mt-1 inline-flex items-center justify-center rounded-full bg-[var(--color-copper-500)] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-copper transition hover:bg-[#0077ed]"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function FokusTicker({
  current,
  target,
  streak,
  appts,
  onExit,
}: {
  current: number;
  target: number;
  streak: number;
  appts: number;
  onExit: () => void;
}) {
  // Provisions-Config aus localStorage NACH dem Mount laden (kein SSR-Mismatch).
  const [cfg, setCfg] = useState<ProvisionConfig>(PROVISION_DEFAULT);
  const [editing, setEditing] = useState(false);
  useEffect(() => setCfg(getProvisionConfig()), []);

  const per = provisionPerTermin(cfg);
  const provision = appts * per;
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));

  return (
    <div className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
        {/* Anrufe heute */}
        <div className="min-w-[150px]">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Anrufe heute
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-mono text-[30px] font-semibold leading-none tabular text-[var(--color-fg)]">
              {current}
            </span>
            <span className="text-[13px] text-[var(--color-fg-mute)]">
              / {target}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-[150px] overflow-hidden rounded-full bg-[var(--color-surface-3)]">
            <div
              className="h-full rounded-full bg-[var(--color-copper-500)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Streak
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-[var(--color-warm)]" />
            <span className="text-mono text-[20px] font-semibold leading-none tabular text-[var(--color-fg)]">
              {streak}
            </span>
            <span className="text-[12px] text-[var(--color-fg-mute)]">Tage</span>
          </div>
        </div>

        {/* Mögliche Provision heute */}
        <div className="relative ml-auto text-right">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
            Mögliche Provision heute
          </div>
          <div className="text-mono text-[26px] font-semibold leading-none tabular text-[var(--color-success)]">
            {fmtEuro(provision)}
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--color-fg-mute)] transition hover:text-[var(--color-fg)]"
          >
            {appts} {appts === 1 ? "Termin" : "Termine"} × {fmtEuro(per)}
            <Settings2 className="h-3 w-3" />
          </button>

          {editing && (
            <ProvisionEditor
              cfg={cfg}
              onSave={(next) => {
                setProvisionConfig(next);
                setCfg(next);
                setEditing(false);
              }}
              onClose={() => setEditing(false)}
            />
          )}
        </div>

        {/* Fokus verlassen */}
        <button
          type="button"
          onClick={onExit}
          title="Fokus verlassen (Esc)"
          className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-3.5 text-[12.5px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-2)]"
        >
          <X className="h-4 w-4" />
          Fokus verlassen
        </button>
      </div>
    </div>
  );
}

function ProvisionEditor({
  cfg,
  onSave,
  onClose,
}: {
  cfg: ProvisionConfig;
  onSave: (cfg: ProvisionConfig) => void;
  onClose: () => void;
}) {
  const [pct, setPct] = useState(String(cfg.pct));
  const [deal, setDeal] = useState(String(cfg.deal));
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[240px] rounded-[14px] border border-[var(--color-hairline)] bg-white p-4 text-left shadow-[var(--shadow-3)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
          Provision berechnen
        </div>
        <label className="mt-3 block text-[11.5px] text-[var(--color-fg-mute)]">
          Auftragswert (€)
          <input
            type="number"
            value={deal}
            onChange={(e) => setDeal(e.target.value)}
            className="mt-1 w-full rounded-[9px] border border-[var(--color-hairline)] px-2.5 py-1.5 text-[13px] tabular-nums text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
          />
        </label>
        <label className="mt-2.5 block text-[11.5px] text-[var(--color-fg-mute)]">
          Provision (%)
          <input
            type="number"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="mt-1 w-full rounded-[9px] border border-[var(--color-hairline)] px-2.5 py-1.5 text-[13px] tabular-nums text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            onSave({
              pct: Number(pct) > 0 && Number(pct) <= 100 ? Number(pct) : cfg.pct,
              deal: Number(deal) > 0 ? Number(deal) : cfg.deal,
            })
          }
          className="mt-3.5 w-full rounded-full bg-[var(--color-copper-500)] py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#0077ed]"
        >
          Speichern
        </button>
      </div>
    </>
  );
}
