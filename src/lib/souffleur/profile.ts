/**
 * Cold-Calling-Profil — der Stil, in dem der KI-Dirigent die Sätze formuliert.
 * Pro Browser in localStorage gespeichert (wie der Berater-Name). Die reinen
 * Hilfsfunktionen (profileToHints, normalizeProfile) sind serverseitig nutzbar
 * (kein localStorage auf Modul-Ebene → der suggest-Route-Import ist sicher).
 */

export type Freundlichkeit = "direkt" | "ausgewogen" | "herzlich";
export type Genauigkeit = "locker" | "ausgewogen" | "praezise";
export type Anrede = "sie" | "du";

export type ColdCallProfile = {
  /** Wie warm/persönlich der Ton ist. */
  freundlichkeit: Freundlichkeit;
  /** Wie schnell/direkt auf den nächsten Schritt (Termin) zugesteuert wird. */
  genauigkeit: Genauigkeit;
  /** Anrede-Form. */
  anrede: Anrede;
  /** Lockerer Humor erlaubt? */
  humor: boolean;
  /** Freie Zusatz-Anweisung (z.B. „erwähne unsere Garantie"). */
  stilnotiz?: string;
};

export const DEFAULT_PROFILE: ColdCallProfile = {
  freundlichkeit: "ausgewogen",
  genauigkeit: "ausgewogen",
  anrede: "sie",
  humor: false,
};

const KEY = "aw_coldcall_profile";

export function normalizeProfile(raw: unknown): ColdCallProfile {
  const p = (raw ?? {}) as Partial<ColdCallProfile>;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], def: T): T =>
    allowed.includes(v as T) ? (v as T) : def;
  return {
    freundlichkeit: oneOf(p.freundlichkeit, ["direkt", "ausgewogen", "herzlich"], "ausgewogen"),
    genauigkeit: oneOf(p.genauigkeit, ["locker", "ausgewogen", "praezise"], "ausgewogen"),
    anrede: oneOf(p.anrede, ["sie", "du"], "sie"),
    humor: typeof p.humor === "boolean" ? p.humor : false,
    stilnotiz: typeof p.stilnotiz === "string" ? p.stilnotiz.slice(0, 300) : undefined,
  };
}

export function loadProfile(): ColdCallProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: ColdCallProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(normalizeProfile(p)));
  } catch {
    /* localStorage voll/gesperrt — egal */
  }
}

/** Übersetzt das Profil in klare Stil-Anweisungen für den KI-Dirigenten. */
export function profileToHints(raw: unknown): string {
  const p = normalizeProfile(raw);
  const freundlichkeit: Record<Freundlichkeit, string> = {
    direkt: "Ton: sachlich und direkt, keine Anbiederung, keine Floskeln.",
    ausgewogen: "Ton: freundlich aber zielstrebig, professionell auf Augenhöhe.",
    herzlich: "Ton: warm, persönlich und zugewandt; nimm den Menschen mit.",
  };
  const genauigkeit: Record<Genauigkeit, string> = {
    locker: "Tempo: lass kurz Smalltalk/Aufwärmen zu, bevor du zum Punkt kommst.",
    ausgewogen: "Tempo: zügig, aber ohne zu drängen — eine kurze Brücke, dann zum Punkt.",
    praezise: "Tempo: sofort und glasklar auf den Punkt, keine Umwege, jede Zeile zielt auf den Termin.",
  };
  const anrede =
    p.anrede === "du"
      ? "Anrede: DUZE den Kunden durchgängig (locker, du/dein), nie siezen."
      : "Anrede: SIEZE den Kunden durchgängig (höflich, Sie/Ihr), nie duzen.";
  const lines = [freundlichkeit[p.freundlichkeit], genauigkeit[p.genauigkeit], anrede];
  if (p.humor) lines.push("Humor: ein dezenter, sympathischer Spruch ist erlaubt — nie albern.");
  if (p.stilnotiz?.trim()) lines.push(`Zusätzliche Vorgabe des Beraters: ${p.stilnotiz.trim()}`);
  return "STIL-PROFIL (immer einhalten):\n" + lines.map((l) => `- ${l}`).join("\n");
}
