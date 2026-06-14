import { Shell } from "@/components/Shell";
import { IOSGroup, IOSRow, IOSSwitch } from "@/components/ui/IOSList";
import {
  Database,
  Phone,
  Mail,
  MessageSquare,
  CreditCard,
  Sparkles,
  FileText,
  Gauge,
  Cloud,
} from "lucide-react";
export const dynamic = "force-dynamic";

function isConnected(key: string): boolean {
  switch (key) {
    case "supabase":  return !!process.env.DATABASE_URL;
    case "easybell":  return !!(process.env.ASTERISK_WSS || process.env.EASYBELL_SIP_USERNAME);
    case "brevo":     return !!process.env.BREVO_API_KEY;
    case "seven":     return !!process.env.SEVEN_API_KEY;
    case "stripe":    return !!process.env.STRIPE_SECRET_KEY;
    case "signwell":  return !!process.env.SIGNWELL_API_KEY;
    case "easybill":  return !!process.env.EASYBILL_API_KEY;
    case "claude":    return !!process.env.ANTHROPIC_API_KEY;
    case "pagespeed": return !!process.env.PAGESPEED_API_KEY;
    case "places":    return !!process.env.GOOGLE_PLACES_API_KEY;
    default:          return false;
  }
}

const INTEGRATIONS = [
  { key: "supabase", label: "Supabase", desc: "Postgres · EU/Frankfurt", icon: Database, color: "#34c759" },
  { key: "easybell", label: "easybell", desc: "Telefonie · Click-to-Call", icon: Phone, color: "#0071e3" },
  { key: "brevo", label: "Brevo", desc: "E-Mail · 300/Tag gratis", icon: Mail, color: "#ff9500" },
  { key: "seven", label: "seven.io", desc: "SMS · 0,075 €/SMS", icon: MessageSquare, color: "#34c759" },
  { key: "stripe", label: "Stripe", desc: "Anzahlung + Wartung", icon: CreditCard, color: "#635bff" },
  { key: "signwell", label: "SignWell", desc: "E-Signatur · eIDAS", icon: FileText, color: "#0071e3" },
  { key: "easybill", label: "easybill", desc: "Rechnungen · ZUGFeRD", icon: FileText, color: "#5856d6" },
  { key: "claude", label: "Anthropic Claude", desc: "Souffleur · Summary", icon: Sparkles, color: "#1d1d1f" },
  { key: "pagespeed", label: "Google PageSpeed", desc: "25.000 Calls/Tag · gratis", icon: Gauge, color: "#ff9500" },
  { key: "places", label: "Google Places", desc: "200 $ Free-Credit", icon: Cloud, color: "#0071e3" },
];

export default function SettingsPage() {
  return (
    <Shell title="Einstellungen">
      <div className="mx-auto grid max-w-5xl grid-cols-12 gap-x-10 gap-y-8">
        {/* ── Left column ──────────────────────────────────────────── */}
        <div className="col-span-7 space-y-8">
          <IOSGroup
            header="Anruf-Rampe"
            footer="Start 25 Anrufe/Tag, alle 14 Tage +10, bis maximal 100. Das Tagesziel rechnet sich selbst."
          >
            <IOSRow title="Start" trailing="25 Anrufe" />
            <IOSRow title="Schritt" trailing="+10 alle 14 Tage" />
            <IOSRow title="Intervall" trailing="14 Tage" />
            <IOSRow title="Maximum" trailing="100 Anrufe" />
          </IOSGroup>

          <IOSGroup header="Automatik">
            <IOSRow
              title="Tägliches Lead-Scraping"
              subtitle="OSM + Handelsregister, 06:00 Uhr"
              trailing={<IOSSwitch on />}
            />
            <IOSRow
              title="Trigger-Feeds"
              subtitle="Neugründungen, Förderung, SSL"
              trailing={<IOSSwitch on />}
            />
            <IOSRow
              title="Termin-Reminder (SMS)"
              subtitle="24 h vorher via seven.io"
              trailing={<IOSSwitch />}
            />
            <IOSRow
              title="Follow-up-Sequenzen"
              subtitle="Transaktional, §7 UWG-konform"
              trailing={<IOSSwitch on />}
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
          <IOSGroup header="Integrationen">
            {INTEGRATIONS.map((i) => {
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
                      "Einrichten"
                    )
                  }
                  chevron
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
