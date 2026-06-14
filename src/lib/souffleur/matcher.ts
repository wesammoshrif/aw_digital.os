/**
 * Lokaler Einwand-Matcher — 0 ms, kein API-Key.
 * Nimmt das rollende Kunden-Transkript und findet den besten Move.
 */

import { PLAYBOOK, type Move } from "./playbook";

/* Reihenfolge = Priorität. closing/gatekeeper hoch; objection VOR signal,
   damit eine Signal-Floskel („klingt interessant, aber…") keinen echten
   Einwand im selben Satz überschattet. */
const PRIORITY: Move["kind"][] = [
  "closing",
  "gatekeeper",
  "objection",
  "signal",
  "opener",
];

// Verneinung entschärft positive Signale/Abschlüsse („passt mir gar nicht",
// „klingt nicht interessant"). NICHT auf Einwände anwenden — dort IST das Nein
// gerade der Treffer.
const NEGATION_BEFORE =
  /\b(nicht|kein|keine|keinen|nie|niemals|weder|ohne)\b[^.!?]{0,18}$/;
const NEGATION_AFTER = /^[^.!?]{0,16}\b(nicht|nie|niemals)\b/;

function negatedAround(hay: string, idx: number, len: number): boolean {
  const before = hay.slice(Math.max(0, idx - 24), idx);
  const after = hay.slice(idx + len, idx + len + 18);
  return NEGATION_BEFORE.test(before) || NEGATION_AFTER.test(after);
}

export function matchMove(transcript: string): Move | null {
  if (!transcript.trim()) return null;
  // nur die letzten ~160 Zeichen betrachten (aktueller Satz des Kunden)
  const recent = transcript.slice(-160).toLowerCase();

  for (const kind of PRIORITY) {
    // Innerhalb eines Kinds: längster Match gewinnt → spezifische Karten
    // (social_media: "instagram") schlagen generische ("brauchen wir nicht").
    let best: { move: Move; len: number } | null = null;
    for (const m of PLAYBOOK) {
      if (m.kind !== kind) continue;
      const match = recent.match(m.trigger);
      if (!match) continue;
      // Negierte Kaufsignale/Abschlüsse verwerfen.
      if (
        (kind === "closing" || kind === "signal") &&
        match.index !== undefined &&
        negatedAround(recent, match.index, match[0].length)
      ) {
        continue;
      }
      const len = match[0].length;
      if (!best || len > best.len) best = { move: m, len };
    }
    if (best) return best.move;
  }
  return null;
}
