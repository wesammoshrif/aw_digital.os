import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { listTriggers } from "@/lib/store";
import {
  Sparkles,
  AlertTriangle,
  Award,
  Banknote,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "copper" | "warm" | "success" | "danger" | "neutral";
    hook: (title: string) => string;
  }
> = {
  handelsregister_new: {
    label: "Neugründung",
    icon: Sparkles,
    tone: "copper",
    hook: (t) =>
      `Glückwunsch zur Eintragung — die meisten Betriebe bauen in den ersten 90 Tagen ihre Website auf. Hätten Sie 5 Minuten für ${t.split(" ")[0]}?`,
  },
  foerderung: {
    label: "Förderprogramm",
    icon: Banknote,
    tone: "success",
    hook: (t) =>
      `${t} — ich bin autorisierter Berater und kann das Förderpaket gemeinsam mit Ihnen abwickeln. 50% Förderung deckt mein Honorar.`,
  },
  hwk_press: {
    label: "HWK-Presse",
    icon: Award,
    tone: "warm",
    hook: (t) =>
      `Glückwunsch zur Meisterprüfung — viele frische Meister modernisieren ihre Website im ersten Quartal nach Bestehen. ${t}.`,
  },
  ssl_expired: {
    label: "SSL abgelaufen",
    icon: AlertTriangle,
    tone: "danger",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hook: (t) =>
      `Ihr SSL-Zertifikat ist abgelaufen — Browser blockieren die Seite. Das kostet jeden Tag Anfragen.`,
  },
  news_alert: {
    label: "Pressespiegel",
    icon: Newspaper,
    tone: "neutral",
    hook: () => "Pressebericht entdeckt — guter Anlass für ein Gespräch.",
  },
};

const fmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
});

export default async function TriggersPage() {
  const triggers = await listTriggers();

  return (
    <Shell
      eyebrow="Signale"
      title="Trigger-Feed"
      actions={
        <Badge variant="copper" dot>
          {triggers.length} Events
        </Badge>
      }
    >
      <p className="mb-6 max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--color-fg-dim)]">
        Neugründungen, Förderprogramme, HWK-Pressemitteilungen, SSL-Ablauf —
        warmer Anlass schlägt Kalt-Akquise um Faktor 3-8.
      </p>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-3">
          {triggers.map((t) => {
            const meta = TYPE_META[t.type] ?? TYPE_META.news_alert;
            const Icon = meta.icon;
            return (
              <Card
                key={t.id}
                className="group relative overflow-hidden transition hover:border-[var(--color-fg-faint)]"
              >
                <div className="flex items-start gap-4 px-5 py-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
                      meta.tone === "copper" &&
                        "border-[#cfe0fd] bg-[#eff5ff] text-[var(--color-copper-600)]",
                      meta.tone === "success" &&
                        "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]",
                      meta.tone === "warm" &&
                        "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
                      meta.tone === "danger" &&
                        "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]",
                      meta.tone === "neutral" &&
                        "border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-fg-dim)]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={meta.tone}>{meta.label}</Badge>
                      <span className="text-[10.5px] text-[var(--color-fg-mute)]">
                        {fmt.format(new Date(t.occurredAt))} · {t.source}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[14px] font-medium text-[var(--color-fg)]">
                      {t.title}
                    </div>
                    {t.description && (
                      <div className="mt-0.5 text-[12px] text-[var(--color-fg-mute)]">
                        {t.description}
                      </div>
                    )}
                    <div className="mt-3 rounded-md border-l-2 border-[var(--color-copper-500)] bg-[#eff5ff] py-2 pl-3 pr-3 text-[12.5px] italic leading-relaxed text-[var(--color-copper-700)]">
                      „{meta.hook(t.title)}&rdquo;
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {t.leadId ? (
                      <ButtonLink
                        href={`/leads/${t.leadId}`}
                        variant="primary"
                        size="sm"
                      >
                        Zum Lead
                      </ButtonLink>
                    ) : (
                      <ButtonLink href="/leads/new" variant="secondary" size="sm">
                        Lead anlegen
                      </ButtonLink>
                    )}
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg-dim)]"
                      >
                        Quelle <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <aside className="col-span-4 space-y-4">
          <Card className="px-5 py-4">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Aktive Feeds
            </div>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              <FeedItem ok name="Handelsregister · 6 Bundesländer" />
              <FeedItem ok name="HWK-Pressemitteilungen" />
              <FeedItem ok name="foerderdatenbank.de" />
              <FeedItem ok name="crt.sh · SSL-Ablauf" />
              <FeedItem name="Google News Alerts" />
              <FeedItem name="Innungs-Pressefeeds" />
            </ul>
          </Card>

          <Card className="px-5 py-4">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-fg-mute)]">
              Conversion-Multiplikator
            </div>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {[
                { t: "Förderprogramm", x: "8×" },
                { t: "Nachfolge / Übernahme", x: "6×" },
                { t: "Neugründung", x: "4×" },
                { t: "SSL / Tech-Defekt", x: "3×" },
                { t: "Pressespiegel", x: "2×" },
                { t: "Kalt-Lead (Baseline)", x: "1×" },
              ].map((r) => (
                <li
                  key={r.t}
                  className="flex items-center justify-between"
                >
                  <span className="text-[var(--color-fg-dim)]">{r.t}</span>
                  <span className="text-mono tabular text-[var(--color-copper-600)]">
                    {r.x}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}

function FeedItem({ ok, name }: { ok?: boolean; name: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[var(--color-fg-dim)]">{name}</span>
      <span
        className={cn(
          "text-[10.5px] uppercase tracking-[0.1em]",
          ok ? "text-[var(--color-success)]" : "text-[var(--color-fg-mute)]",
        )}
      >
        {ok ? "● aktiv" : "○ geplant"}
      </span>
    </li>
  );
}
