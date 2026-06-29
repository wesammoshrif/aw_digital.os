"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, Ban, Mail, Phone, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { needsConsentFirst } from "@/lib/compliance";
import { cn } from "@/lib/utils";

type Props = {
  leadId: string;
  source: string | null;
  dnc: boolean;
  dncReason: string | null;
  dncAt: Date | null;
  firstContactChannel: string | null;
  consentDocumented: boolean;
  consentSource: string | null;
  consentAt: Date | null;
};

export function CompliancePanel(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState(props.consentSource ?? "");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/leads/${props.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const blocked = needsConsentFirst(props);

  // ── DNC-Zustand: alles gesperrt, nur Aufheben möglich ──────────────
  if (props.dnc) {
    return (
      <Card className="border-[#fecaca] bg-[#fef2f2]">
        <div className="flex items-start gap-3 px-5 py-4">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-[#d70015]" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#b42318]">
              Nicht mehr anrufen (DNC)
            </div>
            <p className="mt-0.5 text-[12px] text-[#9b2c20]">
              {props.dncReason ?? "Als DNC markiert"}
              {props.dncAt &&
                ` · ${new Date(props.dncAt).toLocaleDateString("de-DE")}`}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-fg-mute)]">
              Dieser Lead taucht in keiner Anruf-Queue mehr auf.
            </p>
            <button
              onClick={() => patch({ dnc: false })}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--color-fg-dim)] ring-1 ring-[var(--color-hairline)] hover:text-[var(--color-fg)] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              DNC aufheben
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Rechtsgrundlage"
        eyebrow="Compliance"
        right={
          blocked ? (
            <ShieldAlert className="h-4 w-4 text-[#b25000]" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />
          )
        }
      />
      <div className="space-y-4 px-5 py-4">
        {blocked && (
          <div className="rounded-[12px] border border-[#ffe2b8] bg-[#fff8ee] p-3 text-[12px] leading-relaxed text-[#7a4a00]">
            <b>Öffentlich gescrapter Lead.</b> Nach BVerwG 6 C 3.23 (29.01.2025):
            Erstkontakt rechtssicher <b>per Brief</b>, Telefon erst nach{" "}
            <b>dokumentierter Einwilligung</b>. Der Anruf-Button ist bis dahin
            entschärft.
          </div>
        )}

        {/* Erstkontakt-Kanal */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-fg-mute)]">
            Erlaubter Erstkontakt
          </div>
          <div className="flex gap-1.5">
            <ChannelBtn
              active={props.firstContactChannel === "brief"}
              onClick={() => patch({ firstContactChannel: "brief" })}
              disabled={busy}
              icon={Mail}
              label="Brief"
            />
            <ChannelBtn
              active={props.firstContactChannel === "telefon"}
              onClick={() => patch({ firstContactChannel: "telefon" })}
              disabled={busy}
              icon={Phone}
              label="Telefon"
            />
          </div>
        </div>

        {/* Einwilligung dokumentiert */}
        <div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--color-fg)]">
              Einwilligung dokumentiert
              {props.consentDocumented && props.consentAt && (
                <span className="ml-1 text-[11px] text-[var(--color-fg-mute)]">
                  · {new Date(props.consentAt).toLocaleDateString("de-DE")}
                </span>
              )}
            </span>
            <button
              role="switch"
              aria-checked={props.consentDocumented}
              disabled={busy}
              onClick={() =>
                patch({
                  consentDocumented: !props.consentDocumented,
                  consentSource: props.consentDocumented
                    ? null
                    : src.trim() || "manuell bestätigt",
                })
              }
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50",
                props.consentDocumented
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--color-surface-3)]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  props.consentDocumented ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </label>
          {!props.consentDocumented && (
            <input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="Quelle/Nachweis (z. B. Anfrage über Website, Visitenkarte …)"
              className="mt-2 w-full rounded-[10px] border border-[var(--color-hairline)] bg-white px-3 py-2 text-[12.5px] outline-none focus:border-[var(--color-copper-400)]"
            />
          )}
          {props.consentDocumented && props.consentSource && (
            <p className="mt-1.5 text-[12px] text-[var(--color-fg-mute)]">
              Quelle: {props.consentSource}
            </p>
          )}
        </div>

        {/* DNC setzen */}
        <button
          onClick={() => patch({ dnc: true, dncReason: "Manuell gesperrt" })}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#fef2f2] px-3 py-2 text-[12.5px] font-semibold text-[#d70015] ring-1 ring-[#fecaca] hover:bg-[#fee] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Ban className="h-3.5 w-3.5" />
          )}
          Nicht mehr anrufen (Opt-out)
        </button>
      </div>
    </Card>
  );
}

function ChannelBtn({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
        active
          ? "bg-[var(--color-fg)] text-white"
          : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
