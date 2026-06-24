"use client";

import { useMemo, useState } from "react";
import { Mail, X, Loader2, Check, AlertCircle } from "lucide-react";
import {
  buildEmail,
  EMAIL_KIND_IS_AD,
  EMAIL_KIND_LABEL,
  type EmailKind,
} from "@/lib/email/templates";

/**
 * Mail-Compose-Panel: vorbefüllter, editierbarer Wortlaut + Pflicht-Einwilligung
 * (UWG §7). Sendet über /api/emails/send. Empfänger = Lead-E-Mail (wird, falls
 * leer, hier erfasst und am Lead gespeichert).
 */
export function EmailCompose({
  lead,
  defaultKind = "followup_call",
  callId,
  onClose,
}: {
  lead: {
    id: string;
    contactName?: string | null;
    company?: string | null;
    email?: string | null;
    website?: string | null;
  };
  defaultKind?: EmailKind;
  callId?: string | null;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<EmailKind>(defaultKind);
  const agentName = useMemo(() => {
    try {
      return localStorage.getItem("aw_rep_name") ?? "";
    } catch {
      return "";
    }
  }, []);
  const tpl = useMemo(
    () =>
      buildEmail(kind, {
        leadName: lead.contactName,
        agentName,
        domain: lead.website,
      }),
    [kind, lead.contactName, lead.website, agentName],
  );

  const [subject, setSubject] = useState(tpl.subject);
  const [text, setText] = useState(tpl.text);
  const [touched, setTouched] = useState(false);
  const [email, setEmail] = useState(lead.email ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sent: boolean; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsConsent = EMAIL_KIND_IS_AD[kind];

  // Vorlage wechseln, solange der Berater den Text nicht selbst editiert hat.
  function switchKind(k: EmailKind) {
    setKind(k);
    if (!touched) {
      const t = buildEmail(k, {
        leadName: lead.contactName,
        agentName,
        domain: lead.website,
      });
      setSubject(t.subject);
      setText(t.text);
    }
  }

  async function send() {
    setError(null);
    if (!email.trim()) return setError("Bitte eine E-Mail-Adresse eintragen.");
    if (needsConsent && !consent)
      return setError(
        "Bitte bestätigen, dass der Kunde im Anruf um die Zusendung gebeten hat.",
      );
    setBusy(true);
    try {
      if (email.trim() !== (lead.email ?? "")) {
        await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }).catch(() => {});
      }
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          kind,
          subject,
          text,
          consentFromCall: consent,
          callId: callId ?? null,
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        setError(res.error ?? "Senden fehlgeschlagen.");
        setBusy(false);
        return;
      }
      setDone({ sent: !!res.sent, reason: res.reason });
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-2)]">
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-3">
          <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--color-fg)]">
            <Mail className="h-4 w-4 text-[var(--color-copper-600)]" />
            Mail an {lead.company ?? "Kunde"}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <Check className="h-10 w-10 text-[#1a7f37]" />
            <p className="text-[15px] font-semibold text-[var(--color-fg)]">
              {done.sent ? "Mail gesendet." : "Erfasst (Versand inaktiv)."}
            </p>
            {!done.sent && (
              <p className="max-w-[380px] text-[12.5px] leading-relaxed text-[var(--color-fg-mute)]">
                Resend ist noch nicht konfiguriert ({done.reason ?? "no-key"}) —
                die Mail wurde protokolliert, aber nicht versendet. RESEND_API_KEY
                + verifizierte Domain setzen, dann geht sie echt raus.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 rounded-full bg-[var(--color-surface-2)] px-5 py-2 text-[13px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface-3)]"
            >
              Schließen
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EMAIL_KIND_LABEL) as EmailKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => switchKind(k)}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition ${
                    k === kind
                      ? "bg-[var(--color-copper-500)] text-white"
                      : "bg-[var(--color-surface-2)] text-[var(--color-fg-mute)] hover:bg-[var(--color-surface-3)]"
                  }`}
                >
                  {EMAIL_KIND_LABEL[k]}
                </button>
              ))}
            </div>

            <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-mute)]">
              An
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunde@betrieb.de"
                className="mt-1 w-full rounded-[10px] border border-[var(--color-hairline)] px-3 py-2 text-[14px] font-normal normal-case text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-mute)]">
              Betreff
              <input
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setTouched(true);
                }}
                className="mt-1 w-full rounded-[10px] border border-[var(--color-hairline)] px-3 py-2 text-[14px] font-normal normal-case text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-mute)]">
              Text
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTouched(true);
                }}
                rows={11}
                className="mt-1 w-full resize-y rounded-[10px] border border-[var(--color-hairline)] px-3 py-2 text-[13.5px] font-normal normal-case leading-relaxed text-[var(--color-fg)] outline-none focus:border-[var(--color-copper-400)]"
              />
            </label>

            {needsConsent && (
              <label className="flex items-start gap-2 rounded-[10px] bg-[#fff8ec] px-3 py-2 text-[12px] leading-snug text-[#7a5b16]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                Der Kunde hat im Anruf ausdrücklich um die Zusendung gebeten
                (Pflicht — Werbe-Mail ohne Einwilligung ist unzulässig).
              </label>
            )}

            {error && (
              <p className="flex items-start gap-1.5 text-[12px] text-[#d70015]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]"
              >
                Abbrechen
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-copper-500)] px-5 py-2 text-[13px] font-semibold text-white shadow-copper hover:bg-[#0077ed] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Senden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
