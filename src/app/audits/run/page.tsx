"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, CheckCircle2, XCircle, ArrowLeft, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

interface SeoCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  weight: number;
}

interface SeoReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

interface AuditResult {
  websiteUrl: string;
  mobileScore?: number | null;
  desktopScore?: number | null;
  lcpMs?: number | null;
  hasHttps?: boolean | null;
  hasImpressum?: boolean | null;
  hasViewport?: boolean | null;
  hasBookingCta?: boolean | null;
  painScore?: number | null;
  hookText?: string | null;
  techStack?: string[] | null;
  lighthouse?: LighthouseScores | null;
  seo?: SeoReport | null;
}

export default function RunAuditPage() {
  return (
    <Suspense fallback={null}>
      <RunAuditInner />
    </Suspense>
  );
}

function RunAuditInner() {
  const params = useSearchParams();
  const leadId = params.get("leadId");
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  async function run() {
    if (!url.trim()) {
      setError("Bitte eine Website-Adresse eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: url.trim(),
          leadId: leadId ?? undefined,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error ?? "Audit fehlgeschlagen");
      setResult(res.result as AuditResult);
      setAuditId(res.audit?.id ?? null);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[680px] px-6 py-10">
      <Link
        href={leadId ? `/leads/${leadId}` : "/audits"}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {leadId ? "Zurück zum Lead" : "Zurück zu Audits"}
      </Link>

      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-fg)]">
        Website-Audit ausführen
      </h1>
      <p className="mt-1 text-[13.5px] text-[var(--color-fg-mute)]">
        Google Lighthouse (Performance, Barrierefreiheit, Best Practices, SEO),
        ein regelbasierter SEO-Check und automatischer Cold-Call-Hook.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && run()}
          placeholder="https://www.beispiel-handwerker.de"
          className="flex-1 rounded-[12px] border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[14px] text-[var(--color-fg)] shadow-[var(--shadow-1)] outline-none placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-copper-400)] focus:ring-2 focus:ring-[#dbe8fe]"
        />
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-copper-500)] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {busy ? "Analysiert…" : "Audit starten"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-[10px] bg-[#fff0ef] px-4 py-3 text-[13px] text-[#a40012]">
          {error}
        </p>
      )}

      {busy && (
        <p className="mt-4 text-[13px] text-[var(--color-fg-mute)]">
          PageSpeed-Messung läuft, das dauert 15 bis 30 Sekunden…
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-[16px] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-1)]">
          <div className="grid grid-cols-4 gap-3">
            <ScoreTile label="Handy" value={result.mobileScore} />
            <ScoreTile label="Desktop" value={result.desktopScore} />
            <ScoreTile
              label="Ladezeit"
              value={
                result.lcpMs != null
                  ? Number((result.lcpMs / 1000).toFixed(1))
                  : null
              }
              suffix=" s"
              invert
            />
            <ScoreTile label="Gesamt" value={result.painScore} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5">
            <CheckLine label="HTTPS" ok={result.hasHttps} />
            <CheckLine label="Impressum" ok={result.hasImpressum} />
            <CheckLine label="Mobil optimiert" ok={result.hasViewport} />
            <CheckLine label="Kontakt-CTA" ok={result.hasBookingCta} />
          </div>

          {/* Lighthouse-Kategorien (Google) */}
          {result.lighthouse && (
            <div className="mt-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-mute)]">
                Google Lighthouse
              </div>
              <div className="grid grid-cols-4 gap-3">
                <LhRing label="Performance" value={result.lighthouse.performance} />
                <LhRing label="Barrierefrei" value={result.lighthouse.accessibility} />
                <LhRing label="Best Practices" value={result.lighthouse.bestPractices} />
                <LhRing label="SEO" value={result.lighthouse.seo} />
              </div>
            </div>
          )}

          {/* Hinweis, wenn Lighthouse mangels API-Key nicht lief */}
          {!result.lighthouse && (
            <p className="mt-5 rounded-[10px] bg-[#fff8ef] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#7a4a10]">
              Lighthouse-Scores fehlen: dafür einen (kostenlosen) Google
              PageSpeed-API-Key als <code>PAGESPEED_API_KEY</code> in{" "}
              <code>.env.local</code> setzen. Der SEO-Check unten läuft auch ohne
              Key.
            </p>
          )}

          {/* Deterministischer SEO-Check */}
          {result.seo && (
            <div className="mt-6 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)]/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-mute)]">
                  SEO-Check (regelbasiert)
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[var(--color-fg-mute)]">
                  <span className="text-[#1a7f37]">{result.seo.passCount} ok</span>
                  <span className="text-[#b25000]">{result.seo.warnCount} warn</span>
                  <span className="text-[#d70015]">{result.seo.failCount} fehler</span>
                  <span
                    className={cn(
                      "ml-1 rounded-md px-2 py-0.5 text-[13px] font-bold text-white",
                      result.seo.score >= 75
                        ? "bg-[#1a7f37]"
                        : result.seo.score >= 50
                          ? "bg-[#b25000]"
                          : "bg-[#d70015]",
                    )}
                  >
                    {result.seo.score}/100 · {result.seo.grade}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {result.seo.checks.map((c) => (
                  <SeoRow key={c.id} check={c} />
                ))}
              </div>
            </div>
          )}

          {result.hookText && (
            <p className="mt-5 rounded-md border-l-[3px] border-[var(--color-copper-500)] bg-[#eff5ff] py-2.5 pl-3.5 pr-4 text-[13.5px] italic leading-relaxed text-[var(--color-copper-700)]">
              „{result.hookText}"
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {auditId && (
              <a
                href={`/api/pdf/audit/${auditId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-copper-500)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#0077ed]"
              >
                <FileText className="h-3.5 w-3.5" />
                Onepager öffnen
              </a>
            )}
            {leadId && (
              <Link
                href={`/leads/${leadId}`}
                className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-4 py-2 text-[13px] font-medium text-[var(--color-fg-dim)] transition hover:bg-[var(--color-surface-3)]"
              >
                Zurück zum Lead
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreTile({
  label,
  value,
  suffix = "",
  invert = false,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
}) {
  const good = value != null && (invert ? value <= 2.5 : value >= 80);
  const bad = value != null && (invert ? value > 4 : value < 50);
  return (
    <div className="rounded-[12px] border border-[var(--color-hairline)] p-3 text-center">
      <div
        className={cn(
          "text-[26px] font-bold tabular",
          good
            ? "text-[#1a7f37]"
            : bad
              ? "text-[#d70015]"
              : "text-[#b25000]",
        )}
      >
        {value ?? "?"}
        {value != null && suffix}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-[var(--color-fg-mute)]">
        {label}
      </div>
    </div>
  );
}

function CheckLine({ label, ok }: { label: string; ok: boolean | null | undefined }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[var(--color-fg-dim)]">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-[#1a7f37]" />
      ) : (
        <XCircle className="h-4 w-4 text-[#d70015]" />
      )}
      {label}
    </div>
  );
}

/** Lighthouse-Score-Ring (0–100, Google-Ampel: ≥90 grün, ≥50 orange). */
function LhRing({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? null;
  const color =
    v === null ? "#9aa0a6" : v >= 90 ? "#0cce6b" : v >= 50 ? "#ffa400" : "#ff4e42";
  const deg = v === null ? 0 : (v / 100) * 360;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative grid h-14 w-14 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${deg}deg, var(--color-surface-2) 0deg)` }}
      >
        <div className="grid h-[46px] w-[46px] place-items-center rounded-full bg-white text-[15px] font-bold tabular" style={{ color }}>
          {v ?? "–"}
        </div>
      </div>
      <div className="text-center text-[10.5px] font-medium leading-tight text-[var(--color-fg-mute)]">
        {label}
      </div>
    </div>
  );
}

/** Eine Zeile im SEO-Check: Status-Icon + Label + Detail. */
function SeoRow({ check }: { check: SeoCheck }) {
  const tone =
    check.status === "pass"
      ? "text-[#1a7f37]"
      : check.status === "warn"
        ? "text-[#b25000]"
        : "text-[#d70015]";
  const icon =
    check.status === "pass" ? "●" : check.status === "warn" ? "▲" : "✕";
  return (
    <div className="flex items-baseline gap-2 text-[12.5px]">
      <span className={cn("w-3 shrink-0 text-center text-[10px]", tone)}>{icon}</span>
      <span className="w-[140px] shrink-0 font-medium text-[var(--color-fg-dim)]">
        {check.label}
      </span>
      <span className="text-[var(--color-fg-mute)]">{check.detail}</span>
    </div>
  );
}
