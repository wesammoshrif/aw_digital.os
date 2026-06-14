/**
 * Leads-Finder-Quelle: Stellenanzeigen der Bundesagentur für Arbeit.
 *
 * Nutzt die offizielle, kostenlose Jobsuche-API (öffentlicher Key
 * `jobboerse-jobsuche`). Signal: „Betrieb stellt ein = wächst, hat Budget".
 *
 * WICHTIG (verifiziert 06/2026): Mit dem ÖFFENTLICHEN Key liefert die Suche
 * nur Firma/Ort/Gewerk — der Detail-Endpoint (`stellenangebotsBeschreibung`)
 * antwortet mit 403. Die Quelle ist daher standardmäßig ein reines
 * Wachstums-/Timing-Signal („Betrieb stellt ein"); Telefon/E-Mail/Website
 * kommen über die Anreicherung der anderen Quellen (OSM/Google/Impressum).
 *
 * Ist ein PRIVATER Key als `BA_API_KEY` gesetzt (mit Detail-Zugriff), zieht
 * der Adapter die Beschreibung und extrahiert Kontakte über den geteilten
 * Util `extractContacts` — dieselbe Logik wie in den anderen Adaptern.
 *
 * ⚖️ Rechtlich wie alle Finder-Quellen: nur als Signal nutzen, Erstkontakt
 * per Brief (UWG §7 / BVerwG 6 C 3.23). Siehe Quellen-Katalog im Finder.
 */
import type { FinderLead, SourceResult } from "../types";
import { extractContacts } from "../extractContacts";
import { detectBuilderSubdomain } from "../builderSubdomain";

const SEARCH_URL =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs";
const DETAIL_URL =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v2/jobdetails/";
const PUBLIC_KEY = "jobboerse-jobsuche";
// Optionaler privater Key mit Detail-Zugriff → schaltet Kontakt-Anreicherung frei.
const PRIVATE_KEY = process.env.BA_API_KEY;

// Wie viele Treffer je Gewerk holen und für wie viele Details (Kontakt-Parse).
const PER_TRADE = 20;
const MAX_DETAILS = 15; // Detail-Fetches deckeln (Latenz/Rate-Limit)
const FRESH_DAYS = 30; // nur frische Anzeigen = heißes Wachstumssignal

/** AW-Gewerk-Key → BA-Suchbegriff (`was`). Fallback = Key selbst. */
const TRADE_TERMS: Record<string, string> = {
  dachdecker: "Dachdecker",
  shk: "Anlagenmechaniker SHK",
  elektriker: "Elektriker",
  maler: "Maler und Lackierer",
  fliesenleger: "Fliesenleger",
  tischler: "Tischler",
  zimmerer: "Zimmerer",
  maurer: "Maurer",
  bauunternehmer: "Bauhelfer",
  galabau: "Garten- und Landschaftsbauer",
  fensterbauer: "Fenstermonteur",
  kfz: "Kfz-Mechatroniker",
  metallbau: "Metallbauer",
  geruestbau: "Gerüstbauer",
  stuckateur: "Stuckateur",
  trockenbau: "Trockenbaumonteur",
  bodenleger: "Bodenleger",
  schornsteinfeger: "Schornsteinfeger",
  estrichleger: "Estrichleger",
  physio: "Physiotherapeut",
  friseur: "Friseur",
  kosmetik: "Kosmetiker",
  gebaeudereinigung: "Gebäudereiniger",
};

interface BaJob {
  refnr?: string;
  arbeitgeber?: string;
  beruf?: string;
  titel?: string;
  arbeitsort?: { ort?: string; plz?: string };
}

interface BaDetail {
  stellenangebotsBeschreibung?: string;
}

async function getJson<T>(
  url: string,
  apiKey: string,
  timeoutMs = 9000,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Such-Treffer → FinderLead (mit optional angereicherten Kontaktdaten). */
function toLead(
  trade: string,
  job: BaJob,
  fallbackCity: string,
  contacts: { phone: string | null; phoneType: "mobile" | "landline" | null; email: string | null; website: string | null },
): FinderLead {
  // Eigene BA-/Jobbörsen-Domains nicht als „Firmen-Website" werten.
  const website =
    contacts.website && /arbeitsagentur\.de|jobboerse|bund\.de/i.test(contacts.website)
      ? null
      : contacts.website;
  return {
    source: "stellenanzeigen",
    company: job.arbeitgeber ?? "Unbekannt",
    trade,
    phone: contacts.phone,
    phoneType: contacts.phoneType,
    website,
    builderPlatform: detectBuilderSubdomain(website),
    email: contacts.email,
    street: null,
    city: job.arbeitsort?.ort ?? fallbackCity,
    postalCode: job.arbeitsort?.plz ?? null,
    rating: null,
    userRatingsTotal: null,
    externalId: `ba:${job.refnr}`,
  };
}

const EMPTY_CONTACTS = {
  phone: null,
  phoneType: null,
  email: null,
  website: null,
} as const;

export async function findStellenanzeigen(
  city: string,
  trades: string[],
): Promise<SourceResult> {
  const wanted = trades.length > 0 ? trades : Object.keys(TRADE_TERMS);

  // 1) Suche je Gewerk (parallel, fehlertolerant).
  const searches = await Promise.allSettled(
    wanted.map(async (t) => {
      const was = TRADE_TERMS[t] ?? t;
      const params = new URLSearchParams({
        was,
        wo: city,
        umkreis: "25",
        size: String(PER_TRADE),
        page: "1",
        angebotsart: "1",
        veroeffentlichtseit: String(FRESH_DAYS),
      });
      const data = await getJson<{ stellenangebote?: BaJob[] }>(
        `${SEARCH_URL}?${params}`,
        PUBLIC_KEY,
      );
      return (data?.stellenangebote ?? []).map((j) => ({ trade: t, job: j }));
    }),
  );

  const jobs = searches
    .filter(
      (s): s is PromiseFulfilledResult<Array<{ trade: string; job: BaJob }>> =>
        s.status === "fulfilled",
    )
    .flatMap((s) => s.value)
    .filter((x) => x.job.refnr && x.job.arbeitgeber);

  if (jobs.length === 0) {
    const allFailed = searches.every((s) => s.status === "rejected");
    return {
      source: "stellenanzeigen",
      status: allFailed ? "error" : "ok",
      count: 0,
      message: allFailed
        ? "Arbeitsagentur-API nicht erreichbar."
        : "Keine passenden Stellenanzeigen gefunden.",
      leads: [],
    };
  }

  // Je Arbeitgeber nur eine Anzeige (Dedup vor den teuren Detail-Fetches).
  const byEmployer = new Map<string, { trade: string; job: BaJob }>();
  for (const x of jobs) {
    const key = (x.job.arbeitgeber ?? "").toLowerCase().replace(/\s+/g, "");
    if (!byEmployer.has(key)) byEmployer.set(key, x);
  }
  // ── Ohne privaten Key: Signal-only (Detail-Endpoint = 403) ──────────
  if (!PRIVATE_KEY) {
    const employers = [...byEmployer.values()];
    const leads = employers.map(({ trade, job }) =>
      toLead(trade, job, city, EMPTY_CONTACTS),
    );
    return {
      source: "stellenanzeigen",
      status: "ok",
      count: leads.length,
      message:
        "Signal: Betrieb stellt ein. Kontakt via Anreicherung (BA-Detail-API ohne privaten BA_API_KEY gesperrt).",
      leads,
    };
  }

  // ── Mit privatem Key: Beschreibung holen + Kontakte extrahieren ─────
  const unique = [...byEmployer.values()].slice(0, MAX_DETAILS);
  const leads: FinderLead[] = await Promise.all(
    unique.map(async ({ trade, job }) => {
      const detail = await getJson<BaDetail>(
        DETAIL_URL + Buffer.from(job.refnr as string, "utf8").toString("base64"),
        PRIVATE_KEY,
      );
      const c = extractContacts(detail?.stellenangebotsBeschreibung ?? "");
      return toLead(trade, job, city, c);
    }),
  );

  return {
    source: "stellenanzeigen",
    status: "ok",
    count: leads.length,
    message:
      jobs.length > unique.length
        ? `${unique.length} von ${jobs.length} Treffern angereichert (Detail-Limit).`
        : undefined,
    leads,
  };
}
