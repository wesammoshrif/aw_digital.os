/**
 * Preispalette AW Digital — Referenzdaten fürs Cockpit (Stand 06/2026).
 *
 * Statisch & versioniert (kein DB-Bedarf): die Preisliste ändert sich selten.
 * Zum Aktualisieren einfach hier editieren. `awFrom===awTo` = Fixpreis,
 * sonst Spanne „je nach Aufwand". `marketTypical=null` = kein sinnvoller
 * Marktvergleich. Quelle: Preispalette_AW-Digital.xlsx.
 */

export type PriceItem = {
  position: string;
  awFrom: number;
  awTo: number;
  unit: string;
  /** inklusive im Basis-Paket → kein Preis, sondern „inklusive". */
  included?: boolean;
  /** typischer Marktpreis (zum Argumentieren „andere nehmen X"). */
  marketTypical: number | null;
  note: string;
};

export type PriceCategory = {
  name: string;
  items: PriceItem[];
};

export const PRICING: PriceCategory[] = [
  {
    name: "Basis & Seiten",
    items: [
      {
        position:
          "Basis-Paket (Startseite + Setup + Google-Profil + Anfrageformular + 1 Jahr Hosting)",
        awFrom: 990,
        awTo: 990,
        unit: "einmalig",
        marketTypical: 999,
        note: "Einstieg = One-Pager „Starter“. Mobil, schnell, kein Baukasten.",
      },
      {
        position: "Weitere Standard-Unterseite (Über uns, Kontakt …)",
        awFrom: 120,
        awTo: 160,
        unit: "pro Seite",
        marketTypical: 225,
        note: "Mehraufwand Design + Content je Unterseite.",
      },
      {
        position: "Leistungs-/Spezialseite",
        awFrom: 160,
        awTo: 220,
        unit: "pro Seite",
        marketTypical: 300,
        note: "Mehr Inhalt, CTAs, Local-SEO.",
      },
      {
        position: "Landingpage (conversion-optimiert)",
        awFrom: 490,
        awTo: 790,
        unit: "pro Seite",
        marketTypical: 2500,
        note: "AW produktisiert; am Markt oft ein eigenes Mini-Projekt.",
      },
      {
        position: "Blogartikel (Erstellung + Einpflege)",
        awFrom: 90,
        awTo: 150,
        unit: "pro Artikel",
        marketTypical: 450,
        note: "1.000–1.500 Wörter inkl. Einpflege.",
      },
    ],
  },
  {
    name: "Design-Tiefe",
    items: [
      {
        position: "Template (Standard) – AW-Default",
        awFrom: 0,
        awTo: 0,
        unit: "inklusive",
        included: true,
        marketTypical: 800,
        note: "Vorlage an CI angepasst; schnell, günstig, profitabel.",
      },
      {
        position: "Semi-individuell (Vorlage stark angepasst)",
        awFrom: 390,
        awTo: 690,
        unit: "Aufpreis/Projekt",
        marketTypical: 3000,
        note: "Layout, Typo, UI deutlich angepasst – empfohlen für die meisten.",
      },
      {
        position: "Voll individuell (Custom-Design von Grund auf)",
        awFrom: 990,
        awTo: 1900,
        unit: "Aufpreis/Projekt",
        marketTypical: 7000,
        note: "100 % maßgeschneidert; Markt = 2,5–3× Template.",
      },
      {
        position: "Premium-Animationen / Interaktionen",
        awFrom: 290,
        awTo: 790,
        unit: "Aufpreis/Projekt",
        marketTypical: 600,
        note: "Scroll-/Hover-Effekte, Microinteractions (punktuell).",
      },
      {
        position: "Custom-Illustrationen / Grafiken",
        awFrom: 190,
        awTo: 590,
        unit: "Add-on",
        marketTypical: 750,
        note: "Individuelle Grafiken statt Stock.",
      },
    ],
  },
  {
    name: "Funktions-Add-ons",
    items: [
      {
        position: "Terminbuchung / Online-Kalender (Integration)",
        awFrom: 290,
        awTo: 490,
        unit: "einmalig",
        marketTypical: 1500,
        note: "Cal.com/Calendly/meetergo; Tool-Lizenz separat.",
      },
      {
        position: "Mitgliederbereich / Login / geschützter Bereich",
        awFrom: 1200,
        awTo: 2500,
        unit: "einmalig",
        marketTypical: 2800,
        note: "Je nach Rollen/Rechten/Bezahlschranke.",
      },
      {
        position: "Mehrsprachigkeit (pro zusätzliche Sprache)",
        awFrom: 290,
        awTo: 590,
        unit: "pro Sprache",
        marketTypical: 450,
        note: "Markt oft +30 % der Projektsumme; Übersetzung separat.",
      },
      {
        position: "Kontaktformular mehrstufig / mit CRM-Anbindung",
        awFrom: 190,
        awTo: 350,
        unit: "einmalig",
        marketTypical: 500,
        note: "Einfaches Formular ist im Basis-Paket inklusive.",
      },
      {
        position: "Bildergalerie / Portfolio",
        awFrom: 120,
        awTo: 290,
        unit: "einmalig",
        marketTypical: 400,
        note: "Filterbar/Lightbox teurer.",
      },
      {
        position: "Blog-Setup (technisch)",
        awFrom: 290,
        awTo: 490,
        unit: "einmalig",
        marketTypical: 800,
        note: "Kategorien, Templates; ohne laufende Texte.",
      },
      {
        position: "Cookie-Consent / DSGVO-Setup",
        awFrom: 150,
        awTo: 350,
        unit: "einmalig",
        marketTypical: 500,
        note: "Einfaches Setup; Basis teils inklusive.",
      },
      {
        position: "Newsletter-Anbindung (Mailchimp/Brevo)",
        awFrom: 150,
        awTo: 290,
        unit: "einmalig",
        marketTypical: 300,
        note: "Formular + Tool-Anbindung; Lizenz separat.",
      },
      {
        position: "WhatsApp- / Chat-Button",
        awFrom: 90,
        awTo: 190,
        unit: "einmalig",
        marketTypical: 200,
        note: "Click-to-Chat; Live-Chat-Tool separat.",
      },
      {
        position: "Google-Bewertungen-Widget",
        awFrom: 120,
        awTo: 250,
        unit: "einmalig",
        marketTypical: 250,
        note: "Einbindung via Widget (Elfsight).",
      },
      {
        position: "Online-Shop-Modul (klein, in bestehende Seite)",
        awFrom: 1500,
        awTo: 3500,
        unit: "einmalig",
        marketTypical: 2500,
        note: "WooCommerce, wenige Produkte.",
      },
      {
        position: "Notdienst-/Express-Seite (Handwerk)",
        awFrom: 150,
        awTo: 290,
        unit: "einmalig",
        marketTypical: null,
        note: "Notdienst-CTA, Klick-to-Call – typisch Handwerk.",
      },
    ],
  },
  {
    name: "Content & Kreativ",
    items: [
      {
        position: "Texterstellung pro Seite",
        awFrom: 80,
        awTo: 150,
        unit: "pro Seite",
        marketTypical: 200,
        note: "SEO-Text inkl. Einpflege.",
      },
      {
        position: "Texte-Paket (5 Seiten)",
        awFrom: 390,
        awTo: 690,
        unit: "Paket",
        marketTypical: 1500,
        note: "AW günstiger als spezialisierte Textbüros.",
      },
      {
        position: "Logo-Design",
        awFrom: 350,
        awTo: 690,
        unit: "einmalig",
        marketTypical: 750,
        note: "Wortlogo bis Bildmarke.",
      },
      {
        position: "Branding / CI komplett",
        awFrom: 1200,
        awTo: 2500,
        unit: "einmalig",
        marketTypical: 2000,
        note: "Logo, Farben, Typo, Guidelines.",
      },
      {
        position: "Profi-Fotoshooting vor Ort",
        awFrom: 390,
        awTo: 690,
        unit: "einmalig",
        marketTypical: 450,
        note: "Halber Tag, ortsabhängig.",
      },
      {
        position: "Stock-Bilder-Paket (kuratiert)",
        awFrom: 90,
        awTo: 190,
        unit: "einmalig",
        marketTypical: null,
        note: "Lizenzbilder + Auswahl.",
      },
      {
        position: "Imagevideo (kurz)",
        awFrom: 690,
        awTo: 1900,
        unit: "einmalig",
        marketTypical: null,
        note: "30–60 Sek, Hero-Video.",
      },
    ],
  },
  {
    name: "SEO & Marketing",
    items: [
      {
        position: "Local-SEO-Setup (einmalig)",
        awFrom: 390,
        awTo: 590,
        unit: "einmalig",
        marketTypical: 2000,
        note: "Keyword-Recherche, OnPage-Basis, Google-Profil.",
      },
      {
        position: "Local-SEO Light",
        awFrom: 299,
        awTo: 299,
        unit: "€/Monat",
        marketTypical: 400,
        note: "GBP-Optimierung, NAP, ~2 Beiträge, Basis-Reporting, Pflege.",
      },
      {
        position: "Local-SEO Standard",
        awFrom: 599,
        awTo: 599,
        unit: "€/Monat",
        marketTypical: 900,
        note: "+ ~4 Beiträge, Monitoring ~50 Keywords, Citations, Bewertungen.",
      },
      {
        position: "Local-SEO Advanced",
        awFrom: 999,
        awTo: 999,
        unit: "€/Monat",
        marketTypical: 1500,
        note: "+ Linkaufbau, technisches SEO, Tracking, monatlicher Call.",
      },
      {
        position: "Google-Ads-Betreuung (Fix)",
        awFrom: 299,
        awTo: 499,
        unit: "€/Monat",
        marketTypical: 600,
        note: "Management-Fee; Werbebudget exkl. (alt.: 10–20 % v. Budget).",
      },
      {
        position: "Social-Media-Basis",
        awFrom: 499,
        awTo: 899,
        unit: "€/Monat",
        marketTypical: 2000,
        note: "1–2 Kanäle, Content + Posting.",
      },
    ],
  },
  {
    name: "Pflege & Hosting",
    items: [
      {
        position: "Pflege Basis",
        awFrom: 29,
        awTo: 49,
        unit: "€/Monat",
        marketTypical: 50,
        note: "Core-/Plugin-Updates, Backups, Security-Monitoring, E-Mail-Support ~48 h.",
      },
      {
        position: "Pflege Standard",
        awFrom: 69,
        awTo: 99,
        unit: "€/Monat",
        marketTypical: 99,
        note: "+ kleine Änderungen (1–2 Std/Mt), Performance-Checks, Reporting.",
      },
      {
        position: "Pflege Premium",
        awFrom: 149,
        awTo: 199,
        unit: "€/Monat",
        marketTypical: 175,
        note: "+ Monitoring, Prio-Support, 2–4 Std/Mt, fester Ansprechpartner.",
      },
      {
        position: "Hosting (ab Jahr 2)",
        awFrom: 9,
        awTo: 19,
        unit: "€/Monat",
        marketTypical: 10,
        note: "1. Jahr im Paket inklusive; danach in Pflege enthaltbar.",
      },
    ],
  },
  {
    name: "Stunden & Custom",
    items: [
      {
        position: "Stundensatz",
        awFrom: 85,
        awTo: 95,
        unit: "€/Std",
        marketTypical: 104,
        note: "AW-Satz; Markt Freelancer-Senior bis Agentur.",
      },
      {
        position: "Tagessatz",
        awFrom: 690,
        awTo: 760,
        unit: "€/Tag",
        marketTypical: 900,
        note: "Für größere Blöcke / Vor-Ort.",
      },
      {
        position: "Web-App / Custom-Projekt (ab)",
        awFrom: 8000,
        awTo: 30000,
        unit: "€/Projekt",
        marketTypical: 25000,
        note: "Nach Scoping; Adelinos-Typ (Login, Stripe, Dashboard).",
      },
      {
        position: "Buchungssystem custom",
        awFrom: 1900,
        awTo: 3500,
        unit: "€/Projekt",
        marketTypical: 2500,
        note: "Eigenes Buchungssystem nach Bedarf.",
      },
      {
        position: "Onlineshop WooCommerce",
        awFrom: 2500,
        awTo: 6000,
        unit: "€/Projekt",
        marketTypical: 3000,
        note: "Vollwertiger Shop auf WooCommerce-Basis.",
      },
      {
        position: "Onlineshop Shopware",
        awFrom: 6000,
        awTo: 15000,
        unit: "€/Projekt",
        marketTypical: 5500,
        note: "Größere Shops auf Shopware.",
      },
    ],
  },
];

// Wiederkehrend (gelb markieren) vs. einmalig (blau) — der wichtigste
// Unterschied, den ein Neuling sofort sehen muss.
export function isRecurring(unit: string): boolean {
  return unit.startsWith("€/Monat");
}

const nf = new Intl.NumberFormat("de-DE");

/** AW-Preis menschenlesbar: Fixpreis, Spanne oder „inklusive". */
export function formatAwPrice(item: PriceItem): string {
  if (item.included) return "inklusive";
  if (item.awFrom === item.awTo) return `${nf.format(item.awFrom)} €`;
  return `${nf.format(item.awFrom)}–${nf.format(item.awTo)} €`;
}

export function formatEuro(n: number): string {
  return `${nf.format(n)} €`;
}
