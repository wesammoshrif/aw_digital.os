/**
 * Mockup-Template-System
 * ─────────────────────────────────────────────────────────────
 * 5 statische Gewerk-Templates als JSX, parametrisiert durch
 * Lead-Daten (Logo-Farben, Firmenname, NAP, Telefonnummer).
 *
 * Auto-Swap-Engine: Logo via Brandfetch-Fallback, Farben via
 * harmonische Copper-Palette, Hero-Bild aus Bibliothek nach Gewerk.
 */

export type TemplateId =
  | "dachdecker-clean"
  | "maler-bold"
  | "elektriker-tech"
  | "shk-trust"
  | "tischler-warm";

export interface TemplateBrief {
  id: TemplateId;
  label: string;
  trade: string;
  archetype: string;
  palette: { bg: string; fg: string; accent: string; muted: string };
  type: { hero: string; body: string };
  heroImage: string;
  ctas: string[];
  proofPoints: string[];
}

export const TEMPLATES: Record<TemplateId, TemplateBrief> = {
  "dachdecker-clean": {
    id: "dachdecker-clean",
    label: "Dachdecker — Clean Trust",
    trade: "dachdecker",
    archetype: "Meisterbetrieb in 3. Generation",
    palette: {
      bg: "#0d1419",
      fg: "#f4f1ec",
      accent: "#c08252",
      muted: "#7a8893",
    },
    type: {
      hero: "Söhne, Inter Tight",
      body: "Inter, 16/24",
    },
    heroImage:
      "linear-gradient(180deg, #0d1419 0%, transparent 40%), url('/templates/roof-aerial.jpg')",
    ctas: ["Termin vereinbaren", "Notfall-Hotline", "Referenzen ansehen"],
    proofPoints: [
      "Meisterbetrieb seit 1962",
      "Innung Hannover",
      "ZVDH-Mitglied",
    ],
  },
  "maler-bold": {
    id: "maler-bold",
    label: "Maler — Bold Editorial",
    trade: "maler",
    archetype: "Lokaler Premium-Anbieter",
    palette: {
      bg: "#1a1817",
      fg: "#f4ece0",
      accent: "#e8a05c",
      muted: "#9a8a78",
    },
    type: {
      hero: "Tiempos Headline, 64",
      body: "Söhne, 17/26",
    },
    heroImage:
      "radial-gradient(ellipse at 70% 30%, #2b1f17 0%, #1a1817 60%)",
    ctas: ["Kostenfreies Vor-Ort-Angebot", "Galerie", "WhatsApp"],
    proofPoints: ["4,9 ★ · 87 Rezensionen", "Innungsbetrieb", "20 km Umkreis"],
  },
  "elektriker-tech": {
    id: "elektriker-tech",
    label: "Elektriker — Tech Minimal",
    trade: "elektriker",
    archetype: "Smart Home + Photovoltaik",
    palette: {
      bg: "#0a0e14",
      fg: "#e6e9ef",
      accent: "#cd7f32",
      muted: "#5a6573",
    },
    type: {
      hero: "Geist, 60",
      body: "Geist, 16/24",
    },
    heroImage:
      "linear-gradient(135deg, #0a0e14 0%, #131b25 100%)",
    ctas: ["Termin online", "PV-Rechner", "24h-Notdienst"],
    proofPoints: ["ZVEH-Mitglied", "PV-zertifiziert", "Smart-Home Partner"],
  },
  "shk-trust": {
    id: "shk-trust",
    label: "SHK — Trust Forward",
    trade: "shk",
    archetype: "Wärmepumpen + Sanitär",
    palette: {
      bg: "#0e1318",
      fg: "#eef1f4",
      accent: "#5a8db8",
      muted: "#6b7785",
    },
    type: {
      hero: "Inter Display, 56",
      body: "Inter, 16/26",
    },
    heroImage:
      "linear-gradient(180deg, #131b22 0%, #0e1318 80%)",
    ctas: ["Förderberatung", "Notdienst rund um die Uhr", "Vor-Ort-Termin"],
    proofPoints: ["BAFA-zertifiziert", "Daikin Pro", "ZVSHK"],
  },
  "tischler-warm": {
    id: "tischler-warm",
    label: "Tischler — Warm Craft",
    trade: "tischler",
    archetype: "Möbel aus Massivholz, regional",
    palette: {
      bg: "#1c1612",
      fg: "#f0e6d8",
      accent: "#b8854c",
      muted: "#8a7a66",
    },
    type: {
      hero: "Söhne Breit, 58",
      body: "Söhne, 16/24",
    },
    heroImage:
      "linear-gradient(135deg, #2b1f17 0%, #1c1612 100%)",
    ctas: ["Projekt besprechen", "Werkstatt-Tour", "Galerie"],
    proofPoints: ["Meisterwerkstatt seit 1987", "FSC-Holz", "Werkbund"],
  },
};

export function pickTemplate(trade: string | null | undefined): TemplateBrief {
  if (!trade) return TEMPLATES["dachdecker-clean"];
  const map: Record<string, TemplateId> = {
    dachdecker: "dachdecker-clean",
    maler: "maler-bold",
    elektriker: "elektriker-tech",
    shk: "shk-trust",
    tischler: "tischler-warm",
    solar: "elektriker-tech",
    fliesenleger: "tischler-warm",
    maurer: "dachdecker-clean",
    galabau: "tischler-warm",
  };
  return TEMPLATES[map[trade] ?? "dachdecker-clean"];
}
