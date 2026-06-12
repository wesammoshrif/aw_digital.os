import { Shell } from "@/components/Shell";
import { IOSGroup, IOSRow } from "@/components/ui/IOSList";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import {
  Phone,
  Volume2,
  Mic,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
} from "lucide-react";

export default function TelefonieSetupPage() {
  return (
    <Shell eyebrow="Einstellungen" title="Telefonie · easybell">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* ── Status-Karte ───────────────────────────────────────── */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-3 divide-x divide-[var(--color-hairline)]">
            <StatusTile
              icon={Phone}
              label="Wählen"
              status="ready"
              hint="tel:-Link triggert easybell-App"
            />
            <StatusTile
              icon={Volume2}
              label="PC-Ton (Kunde)"
              status="manual"
              hint="Per Bildschirmteilen abgreifen"
            />
            <StatusTile
              icon={Mic}
              label="Mikro (Du)"
              status="ready"
              hint="Deepgram live · Auto-Start"
            />
          </div>
        </Card>

        {/* ── Schritt 1 ──────────────────────────────────────────── */}
        <section>
          <SectionHeader
            n={1}
            title="easybell-Desktop-App installieren"
            subtitle="Wir nutzen deine vorhandene App fürs eigentliche Telefonieren — Souffleur lauscht parallel mit."
          />
          <IOSGroup
            footer="Sobald die App läuft und du eingeloggt bist, wird sie automatisch von Windows als »Tel-Handler« registriert. Der Anrufen-Button in der App schickt dann tel:+49… an easybell."
          >
            <IOSRow
              title="easybell-App herunterladen"
              subtitle="Windows-Installer von easybell.de"
              trailing={
                <a
                  href="https://www.easybell.de/business/app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-copper-600)]"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              }
              chevron
            />
            <IOSRow
              title="Mit Zugangsdaten einloggen"
              subtitle="Aus dem easybell-Kundenportal"
            />
            <IOSRow
              title="Headset einrichten"
              subtitle="Lautsprecher + Mikrofon in easybell-Einstellungen"
            />
          </IOSGroup>
        </section>

        {/* ── Schritt 2 ──────────────────────────────────────────── */}
        <section>
          <SectionHeader
            n={2}
            title="tel:-Links auf easybell legen"
            subtitle="Damit ein Klick auf »Anrufen + Souffleur« sofort wählt."
          />
          <IOSGroup
            footer="Im easybell-App-Setup ist das normalerweise automatisch. Falls nicht: Windows »Apps für tel-Protokoll« → easybell wählen."
          >
            <IOSRow
              title="Windows-Standardapp prüfen"
              subtitle="Einstellungen → Apps → Standard-Apps → »nach Protokoll« → tel"
              chevron
            />
            <IOSRow
              title="Test: Anrufen-Button drücken"
              subtitle="Ein Lead öffnen → großer blauer Button → easybell sollte aufspringen"
            />
          </IOSGroup>
        </section>

        {/* ── Schritt 3: das Wichtigste ──────────────────────────── */}
        <section>
          <SectionHeader
            n={3}
            title="PC-Ton an Souffleur weitergeben"
            subtitle="So hört der Souffleur deinen Kunden mit und transkribiert ihn live via Deepgram."
          />
          <Card className="px-5 py-5">
            <div className="space-y-4 text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[11px] font-semibold text-white">
                  1
                </span>
                <p>
                  Im Souffleur-Popup unten Mitte:{" "}
                  <Badge variant="copper">PC-Ton (Kunde)</Badge>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[11px] font-semibold text-white">
                  2
                </span>
                <p>
                  Chrome-Dialog: <strong>»Gesamter Bildschirm«</strong>{" "}
                  auswählen
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[11px] font-semibold text-white">
                  3
                </span>
                <p>
                  Häkchen bei{" "}
                  <strong className="rounded bg-[#fffbeb] px-1.5 py-0.5 text-[#b25000]">
                    ✓ Systemaudio teilen
                  </strong>{" "}
                  setzen (ganz unten im Dialog)
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-copper-500)] text-[11px] font-semibold text-white">
                  4
                </span>
                <p>
                  »Teilen« klicken → grünes{" "}
                  <Badge variant="success">Deepgram aktiv</Badge> erscheint
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-md border border-[#fde68a] bg-[#fffbeb] p-3 text-[12.5px] leading-relaxed text-[#7a5e1f]">
              <strong className="text-[#b25000]">Hinweis Chrome:</strong> Das
              Häkchen »Systemaudio teilen« erscheint nur, wenn du{" "}
              <em>»Gesamter Bildschirm«</em> wählst (nicht »Fenster« oder
              »Tab«). Das ist eine Windows-Einschränkung.
            </div>
          </Card>
        </section>

        {/* ── DSGVO ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            n={4}
            title="Rechtssicher telefonieren (§201 StGB)"
            subtitle="Das Mithören selbst ist nicht das Problem — das Speichern ist es."
          />
          <IOSGroup
            footer="Audio wird NICHT auf deinem Rechner oder Server gespeichert. Deepgram verarbeitet die Audio-Chunks flüchtig und liefert nur das Transkript zurück. Ein AVV mit Deepgram ist trotzdem empfehlenswert."
          >
            <IOSRow
              title="Standard: nichts speichern"
              subtitle="Souffleur hört flüchtig, schreibt nichts in die DB"
              trailing={
                <Badge variant="success" dot>
                  aktiv
                </Badge>
              }
            />
            <IOSRow
              title="Opt-in: Aufnahme/Transkript speichern"
              subtitle="Toggle im Souffleur-Popup oben rechts"
            />
            <IOSRow
              title="Eröffnungssatz bei Bedarf"
              subtitle="»Ich nehme das Gespräch für Qualitätszwecke auf — einverstanden?«"
            />
          </IOSGroup>
        </section>

        {/* ── Bekannte Grenzen ───────────────────────────────────── */}
        <section>
          <SectionHeader
            n={5}
            title="Was easybell (noch) nicht kann"
            subtitle="Limits, die nicht an unserem System liegen."
          />
          <IOSGroup>
            <IOSRow
              title="Click-to-Call REST-API"
              subtitle="Eingeschränkt verfügbar via POST /v1/calls (Beta)"
              trailing={
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              }
            />
            <IOSRow
              title="Call-Webhooks (angenommen/Dauer)"
              subtitle="Müssen wir mit Timer in der App simulieren"
              trailing={
                <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
              }
            />
            <IOSRow
              title="Browser-basiertes SIP-Softphone"
              subtitle="webrtc.easybell.de ist (Stand 2026) ein Platzhalter — für Welle 3"
              trailing={
                <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
              }
            />
          </IOSGroup>
          <div className="mt-3 rounded-md border border-[#fde68a] bg-[#fffbeb] p-3 text-[12.5px] leading-relaxed text-[#7a5e1f]">
            <strong className="text-[#b25000]">Verifiziert (Juni 2026):</strong>{" "}
            Der <strong>Click-to-Call REST-API Hook</strong> ist nun aktiv. 
            Wenn in der <code className="bg-amber-100 px-1">.env.local</code> ein 
            <code className="bg-amber-100 px-1">EASYBELL_API_KEY</code> hinterlegt ist, 
            triggert das System den Anruf direkt über die easybell-Server (erst klingelt 
            dein Telefon/App, dann der Kunde). Ohne Key fällt das System auf 
            lokale <code className="bg-amber-100 px-1">tel:-Links</code> zurück.
            <br />
            <br />
            <strong>Wichtig zum Browser-Softphone:</strong> easybell hat weiterhin KEINEN 
            öffentlichen WebSocket-SIP-Gateway für Standard-WebRTC. 
            <strong>Direkt-Anruf AUS dem Browser (ohne dass dein Telefon klingelt)</strong> 
            ist daher weiterhin nur über Umwege (Asterisk-Bridge) möglich.
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <ButtonLink href="/settings" variant="ghost" size="md">
            ← Einstellungen
          </ButtonLink>
          <ButtonLink href="/" variant="primary" size="md">
            Loslegen
          </ButtonLink>
        </div>
      </div>
    </Shell>
  );
}

function SectionHeader({
  n,
  title,
  subtitle,
}: {
  n: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="text-mono tabular text-[18px] font-semibold leading-none text-[var(--color-fg-faint)]">
        {String(n).padStart(2, "0")}
      </span>
      <div>
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-fg)]">
          {title}
        </h2>
        <p className="text-[13px] text-[var(--color-fg-mute)]">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  status,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: "ready" | "manual" | "blocked";
  hint: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[var(--color-fg-mute)]" />
        {status === "ready" ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
        ) : (
          <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
        )}
      </div>
      <div className="mt-3 text-[13.5px] font-semibold text-[var(--color-fg)]">
        {label}
      </div>
      <div className="mt-0.5 text-[11.5px] text-[var(--color-fg-mute)]">
        {hint}
      </div>
    </div>
  );
}
