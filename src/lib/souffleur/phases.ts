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
    tagline: "Bedarf — Schmerz aufdecken",
    aiGuidance:
      "Bedarf wecken: eine konkrete Frage zum Ist-Zustand (wie kommen Kunden aktuell, was nervt online).",
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
