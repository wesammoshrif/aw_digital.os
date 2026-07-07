/**
 * Lead-Enrichment + Pain-Score (P2).
 *
 * - `parseTrade`: rät das Gewerk aus Firmenname/Website, wenn die Quelle keins
 *   liefert (viele Altbestand-Leads sind „unbekannt").
 * - `painLevel`: EIN klarer Score 1–5. RICHTUNG: **höher = mehr Schmerz = heißer
 *   = weiter oben in der Queue** (5 = keine Website, 1 = top-moderne Seite).
 *   Ersetzt die verwirrende „niedriger = größerer Hebel"-Logik im UI.
 */

// ── Gewerk-Erkennung ───────────────────────────────────────────────
// Reihenfolge = Priorität (spezifisch vor generisch).
const TRADE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /gas.?wasser|sanit|klempner|installat|heizung|shk\b|bäder|\bbad\b|klima|lüftung/i, label: "Sanitär/Heizung" },
  { re: /dachdeck|bedachung|dachbau|\bdach\b/i, label: "Dachdecker" },
  { re: /elektro|elektrik|elektrotechn/i, label: "Elektriker" },
  { re: /garten.?(bau|pflege)|landschaft|gala.?bau|grünfläch|baumpflege|gärtner/i, label: "GaLaBau" },
  { re: /maler|lackier|anstrich|malerei/i, label: "Maler" },
  { re: /fliesen/i, label: "Fliesenleger" },
  { re: /zimmer(ei|er)|holzbau/i, label: "Zimmerei" },
  { re: /tischler|schreiner|möbel/i, label: "Tischler" },
  { re: /fenster|rolll?aden|markisen|\btüren\b/i, label: "Fenster/Türen" },
  { re: /trockenbau/i, label: "Trockenbau" },
  { re: /gerüst/i, label: "Gerüstbau" },
  { re: /metallbau|schlosser|stahlbau|schmied/i, label: "Metallbau" },
  { re: /estrich/i, label: "Estrich" },
  { re: /stuckateur|verputz|\bputz\b|stuck\b/i, label: "Stuckateur" },
  { re: /parkett|bodenleg|\bboden\b/i, label: "Bodenleger" },
  { re: /gebäudereinig|glasreinig|reinigung/i, label: "Reinigung" },
  { re: /hausmeister|gebäudeservice|facility/i, label: "Hausmeister" },
  { re: /schornstein/i, label: "Schornsteinfeger" },
  { re: /solar|photovolta|\bpv\b/i, label: "Solar/PV" },
  { re: /kfz|karosserie|autohaus|automobil|werkstatt/i, label: "KFZ" },
  { re: /zaun|zäune/i, label: "Zaunbau" },
  { re: /umzug|transporte/i, label: "Umzug" },
  { re: /maurer|hochbau|rohbau|bauunternehm|baugeschäft|bauservice/i, label: "Bau" },
];

// Alte Kurz-Keys (aus dem OSM-Scraper) auf saubere Labels heben.
const KEY_LABELS: Record<string, string> = {
  dachdecker: "Dachdecker",
  maler: "Maler",
  elektriker: "Elektriker",
  shk: "Sanitär/Heizung",
  tischler: "Tischler",
  fliesenleger: "Fliesenleger",
  maurer: "Bau",
  galabau: "GaLaBau",
  bauunternehmer: "Bau",
  solar: "Solar/PV",
  hausmeister: "Hausmeister",
};

const clean = (s: string) =>
  s
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[-_.]/g, " ");

/** Gewerk aus Text (Firmenname, Website) raten. null, wenn nichts passt. */
export function parseTrade(...parts: (string | null | undefined)[]): string | null {
  const hay = clean(parts.filter(Boolean).join(" "));
  for (const { re, label } of TRADE_PATTERNS) if (re.test(hay)) return label;
  return null;
}

/** Anzeige-Gewerk: gespeichertes trade (auf Label gehoben) sonst geraten. */
export function displayTrade(lead: {
  trade?: string | null;
  company?: string | null;
  website?: string | null;
}): string | null {
  const t = (lead.trade ?? "").trim();
  if (t && t.toLowerCase() !== "unbekannt") return KEY_LABELS[t.toLowerCase()] ?? t;
  return parseTrade(lead.company, lead.website);
}

// ── Pain-Score 1–5 (höher = heißer) ────────────────────────────────
const BUILDER_RE =
  /jimdo|wixsite|wix\.com|business\.site|weebly|jouwweb|webnode|1und1|ionos|sites\.google|npage|beepworld|homepage-?baukasten|my-?homepage/i;

export type PainInfo = { level: 1 | 2 | 3 | 4 | 5; reason: string };

/** EIN klarer Hebel-Score: 5 = größter Verkaufs-Hebel, 1 = kaum Hebel. */
export function painInfo(lead: {
  website?: string | null;
  painScore?: number | null;
}): PainInfo {
  const site = (lead.website ?? "").trim();
  if (!site) return { level: 5, reason: "Keine Website — größter Hebel" };
  if (BUILDER_RE.test(site))
    return { level: 4, reason: "Gratis-Baukasten — leicht zu schlagen" };
  const ps = lead.painScore;
  if (ps != null) {
    if (ps < 25) return { level: 5, reason: "Website mit gravierenden Mängeln" };
    if (ps < 45) return { level: 4, reason: "Website mit klaren Schwächen" };
    if (ps < 65) return { level: 3, reason: "Website mittelmäßig" };
    if (ps < 85) return { level: 2, reason: "Website recht gut" };
    return { level: 1, reason: "Website top — wenig Hebel" };
  }
  return { level: 3, reason: "Website vorhanden, noch nicht auditiert" };
}

export function painLevel(lead: {
  website?: string | null;
  painScore?: number | null;
}): number {
  return painInfo(lead).level;
}

const LEVEL_META: Record<number, { label: string; tone: "hot" | "warm" | "neutral" | "cold" }> = {
  5: { label: "Sehr heiß", tone: "hot" },
  4: { label: "Heiß", tone: "hot" },
  3: { label: "Mittel", tone: "warm" },
  2: { label: "Kühl", tone: "neutral" },
  1: { label: "Kalt", tone: "cold" },
};

export function painMeta(level: number) {
  return LEVEL_META[level] ?? LEVEL_META[3];
}
