/**
 * Gesprächswärme (Phase) — wie „heiß" das Telefonat gerade ist.
 * Der Souffleur zeigt die Wärme prominent und die KI richtet den nächsten
 * Satz danach aus: KALT (Einstieg) → LAU (Bedarf) → WARM (Einwand) → HEISS (Abschluss).
 */

export type Phase = "kalt" | "lau" | "warm" | "heiss";

export const PHASES: {
  key: Phase;
  label: string;
  tagline: string; // was gerade passiert (für den Berater)
  aiGuidance: string; // Anweisung für die KI in dieser Phase
}[] = [
  {
    key: "kalt",
    label: "Kalt",
    tagline: "Einstieg — Aufmerksamkeit halten",
    aiGuidance:
      "Einstieg: in EINEM Satz Relevanz schaffen und um 30–60 Sekunden bitten. Noch kein Pitch, kein Preis.",
  },
  {
    key: "lau",
    label: "Lau",
    tagline: "Bedarf + Lösung zeigen",
    aiGuidance:
      "Bedarf wecken (Frage zum Ist-Zustand), und sobald der Bedarf klar ist: in 1–2 Sätzen sagen, was wir KONKRET tun (Website, die bei Google oben steht + mehr Anfragen) und was er davon hat — dann Richtung Termin. Nicht nur Fragen reihen.",
  },
  {
    key: "warm",
    label: "Warm",
    tagline: "Einwand — ist ein Kaufsignal",
    aiGuidance:
      "Einwand behandeln: kurz bestätigen, dann mit ROI/konkretem Beispiel kontern und zur Terminfrage führen.",
  },
  {
    key: "heiss",
    label: "Heiß",
    tagline: "Abschluss — Termin sichern",
    aiGuidance:
      "Abschluss: konkrete Terminalternative anbieten (Tag + Uhrzeit). Nicht weiter verkaufen, den Termin festmachen.",
  },
];

export const PHASE_INDEX: Record<Phase, number> = {
  kalt: 0,
  lau: 1,
  warm: 2,
  heiss: 3,
};

export function isPhase(s: unknown): s is Phase {
  return s === "kalt" || s === "lau" || s === "warm" || s === "heiss";
}

export function phaseGuidance(p: Phase): string {
  return PHASES.find((x) => x.key === p)?.aiGuidance ?? "";
}

/**
 * Lokale Sofort-Schätzung der Wärme (Fallback, bis die KI die Phase bestimmt).
 * Stützt sich auf Gesprächsdauer + erkannten Move-Typ + Nein-Gradient.
 */
export function estimatePhase(opts: {
  elapsedSec: number;
  moveKind?: string | null;
  neinTyp?: string | null;
  customerSpoke: boolean;
}): Phase {
  const { elapsedSec, moveKind, neinTyp, customerSpoke } = opts;
  if (moveKind === "closing" || moveKind === "signal") return "heiss";
  if (moveKind === "objection" || neinTyp) return "warm";
  if (customerSpoke || elapsedSec > 45) return "lau";
  return "kalt";
}

/**
 * Einstiegs-Treppe — VOR den Wärme-Phasen. Der Gesprächsanfang ist für einen
 * Anfänger der gefährlichste Moment, deshalb ist er eine feste Schiene statt
 * freier KI: Opener 1 (nur Erlaubnis) → zuhören → Opener 2/Bridge (der Grund)
 * → dann erst übernimmt die freie Phasen-Logik („frei").
 */
export type Stage = "opener1" | "warten" | "bridge" | "frei";

export const STAGES: {
  key: Stage;
  label: string;
  tagline: string; // was der Berater jetzt tut
}[] = [
  { key: "opener1", label: "Eröffnung", tagline: "Schritt 1: Erlaubnis holen — Satz vorlesen" },
  { key: "warten", label: "Zuhören", tagline: "Jetzt zuhören — NICHT reden, ihn reden lassen" },
  { key: "bridge", label: "Grund", tagline: "Schritt 2: jetzt der Grund + erste Frage" },
  { key: "frei", label: "Gespräch", tagline: "KI führt — Bedarf, Einwand, Termin" },
];

export function isStage(s: unknown): s is Stage {
  return s === "opener1" || s === "warten" || s === "bridge" || s === "frei";
}

/**
 * Anweisung an die KI je Einstiegs-Schritt. Erzwingt den Flow
 * Opener 1 → Kundenreaktion → Opener 2 → Phasen, damit die KI den Grund nie
 * über den Kunden hinwegfeuert. Bei "frei" greift wieder die Phasen-Logik.
 */
export function stageGuidance(s: Stage): string {
  switch (s) {
    case "opener1":
      return "AKTUELLER SCHRITT: Permission-Opener. Gib NUR eine kurze, freundliche Erlaubnis-Frage (max 15 Wörter). KEIN Grund, KEIN Pitch, KEIN Preis, KEIN Audit-Detail. Beispiel: „Hab ich Sie gerade ganz ungünstig erwischt?“";
    case "warten":
      return "AKTUELLER SCHRITT: Zuhören. Der Berater wartet auf die Kundenreaktion — gib KEINEN neuen Satz, antworte nur mit einem Bindestrich „—“.";
    case "bridge":
      return "AKTUELLER SCHRITT: Bridge / Opener 2. Der Kunde hat auf den Opener reagiert (siehe letzter Kundensatz). War es ein Brush-off (keine Zeit / kein Interesse / Mail schicken / haben schon eine Website / zu teuer / wer sind Sie?) → gib EINE Konter-Zeile: erst ANERKENNEN, dann kurz DREHEN, dann eine FRAGE. War es grünes Licht oder eine neutrale Rückfrage → sag JETZT kurz wer wir sind und was wir tun (wir bauen Handwerkern Websites, die bei Google oben stehen und mehr Anfragen bringen) + EIN konkretes Audit-Signal, und ende mit EINER offenen Bedarfsfrage.";
    default:
      return "";
  }
}
