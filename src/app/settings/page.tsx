import { Shell } from "@/components/Shell";
import { IOSGroup, IOSRow } from "@/components/ui/IOSList";
import {
  Database,
  Phone,
  Mail,
  Mic,
  MessageSquare,
  CreditCard,
  Sparkles,
  FileText,
  Gauge,
  Cloud,
} from "lucide-react";
export const dynamic = "force-dynamic";

// Nur die Integrationen, für die es WIRKLICH Code gibt, werden auf einen Env-Key
// geprüft. Die „geplant"-Liste (status:"planned") hat kein Backend und zeigt das
// auch ehrlich an — kein vorgetäuschtes „Verbunden".
function isConnected(key: string): boolean {
  switch (key) {
    case "supabase":  return !!process.env.DATABASE_URL;
    case "telephony": return !!(process.env.ASTERISK_WSS || process.env.EASYBELL_SIP_USERNAME);
    case "resend":    return !!process.env.RESEND_API_KEY;
    case "deepgram":  return !!process.env.DEEPGRAM_API_KEY;
    case "claude":    return !!process.env.ANTHROPIC_API_KEY;
    case "pagespeed": return !!process.env.PAGESPEED_API_KEY;
    case "places":    return !!process.env.GOOGLE_PLACES_API_KEY;
    default:          return false;
  }
}

// Aktive Integrationen = im Code verdrahtet (echter Pfad + Env-Key).
const ACTIVE = [
  { key: "supabase", label: "Supabase", desc: "Postgres · EU/Frankfurt", icon: Database, color: "#34c759" },
  { key: "telephony", label: "Telefonie", desc: "Asterisk-Brücke · easybell-Trunk", icon: Phone, color: "#0071e3" },
  { key: "resend", label: "Resend", desc: "E-Mail · transaktional (§7)", icon: Mail, color: "#ff9500" },
  { key: "deepgram", label: "Deepgram", desc: "Live-Transkription · nova-3 DE", icon: Mic, color: "#13ef93" },
  { key: "claude", label: "Anthropic Claude", desc: "Souffleur · Post-Call-Summary", icon: Sparkles, color: "#1d1d1f" },
  { key: "pagespeed", label: "Google PageSpeed", desc: "Website-Audit · gratis", icon: Gauge, color: "#ff9500" },
  { key: "places", label: "Google Places", desc: "Lead-Finder", icon: Cloud, color: "#0071e3" },
];

// Geplant = noch KEIN Backend. Ehrlich als „Geplant" markiert, statt einen
// nie erreichbaren „Verbunden"-Status vorzugaukeln.
const PLANNED = [
  { key: "seven", label: "seven.io", desc: "SMS-Reminder", icon: MessageSquare },
  { key: "stripe", label: "Stripe", desc: "Anzahlung + Wartung", icon: CreditCard },
  { key: "signwell", label: "SignWell", desc: "E-Signatur · eIDAS", icon: FileText },
  { key: "easybill", label: "easybill", desc: "Rechnungen · ZUGFeRD", icon: FileText },
];

export default function SettingsPage() {
  return (
    <Shell title="Einstellungen">
      <div className="mx-auto grid max-w-5xl grid-cols-12 gap-x-10 gap-y-8">
        {/* ── Left column ──────────────────────────────────────────── */}
        <div className="col-span-7 space-y-8">
          <IOSGroup
            header="Anruf-Rampe"
            footer="Fixe Vorgabe: Start 25 Anrufe/Tag, alle 14 Tage +10, bis maximal 100. Das Tagesziel rechnet sich daraus selbst (aktuell nicht editierbar)."
          >
            <IOSRow title="Start" trailing="25 Anrufe" />
            <IOSRow title="Schritt" trailing="+10 alle 14 Tage" />
            <IOSRow title="Intervall" trailing="14 Tage" />
            <IOSRow title="Maximum" trailing="100 Anrufe" />
          </IOSGroup>

          <IOSGroup
            header="Automatik"
            footer="Stündlicher Cron. Zeigt den echten Stand — kein Schalter, der nichts tut."
          >
            <IOSRow
              title="Termin-Reminder (E-Mail)"
              subtitle="24 h vorher an den Lead, sofern E-Mail hinterlegt"
              trailing={<span className="text-[var(--color-success)]">Aktiv</span>}
            />
            <IOSRow
              title="Wiederkehrende Wartungsrechnungen"
              subtitle="Monatliche MRR-Rechnung pro Wartungskunde"
              trailing={<span className="text-[var(--color-fg-mute)]">Geplant</span>}
            />
            <IOSRow
              title="Lead-Scraping"
              subtitle="OSM + Google Places"
              trailing={<span className="text-[var(--color-fg-mute)]">Manuell</span>}
            />
            <IOSRow
              title="Trigger-Feed"
              subtitle="Nur Handelsregister-Neugründungen real"
              trailing={<span className="text-[var(--color-fg-mute)]">Teilweise</span>}
            />
          </IOSGroup>

          <IOSGroup header="Daten">
            <IOSRow title="HTML-CRM importieren" subtitle="JSON-Export einlesen" chevron />
            <IOSRow title="CSV exportieren" subtitle="Für Excel / Numbers" chevron />
            <IOSRow title="JSON-Backup laden" subtitle="Vollständiger Snapshot" chevron />
            <IOSRow
              title={<span className="text-[var(--color-danger)]">Demo-Daten löschen</span>}
              chevron
            />
          </IOSGroup>
        </div>

        {/* ── Right column ─────────────────────────────────────────── */}
        <div className="col-span-5 space-y-8">
          <IOSGroup header="Integrationen" footer="Im System verdrahtet.">
            {ACTIVE.map((i) => {
              const Icon = i.icon;
              const connected = isConnected(i.key);
              return (
                <IOSRow
                  key={i.key}
                  icon={<Icon className="h-4 w-4" strokeWidth={2.2} />}
                  iconBg={i.color}
                  title={i.label}
                  subtitle={i.desc}
                  trailing={
                    connected ? (
                      <span className="text-[var(--color-success)]">Verbunden</span>
                    ) : (
                      <span className="text-[var(--color-warm)]">Key fehlt</span>
                    )
                  }
                />
              );
            })}
          </IOSGroup>

          <IOSGroup header="Geplant" footer="Noch kein Backend — bewusst als geplant markiert.">
            {PLANNED.map((i) => {
              const Icon = i.icon;
              return (
                <IOSRow
                  key={i.key}
                  icon={<Icon className="h-4 w-4 opacity-70" strokeWidth={2.2} />}
                  iconBg="#8e8e93"
                  title={i.label}
                  subtitle={i.desc}
                  trailing={<span className="text-[var(--color-fg-mute)]">Geplant</span>}
                />
              );
            })}
          </IOSGroup>

          <IOSGroup header="Recht" footer="Keine Rechtsberatung.">
            <IOSRow
              title="B2B-Telefonakquise"
              subtitle="i. d. R. zulässig (§7 UWG, mutmaßl. Einwilligung)"
            />
            <IOSRow
              title="Cold-E-Mail"
              subtitle="Ohne Einwilligung riskant — nur transaktional"
            />
            <IOSRow
              title="Anrufaufnahme"
              subtitle="Nur mit Zustimmung (§201 StGB)"
            />
          </IOSGroup>
        </div>
      </div>
    </Shell>
  );
}
