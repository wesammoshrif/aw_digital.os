/**
 * Lokaler Einwand-Matcher — 0 ms, kein API-Key.
 * Nimmt das rollende Kunden-Transkript und findet den besten Move.
 */

import { PLAYBOOK, type Move } from "./playbook";

/* Reihenfolge = Priorität: spezifische Einwände vor Signalen/Eröffnung. */
const PRIORITY: Move["kind"][] = [
  "closing",
  "signal",
  "objection",
  "opener",
];

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
      const len = match[0].length;
      if (!best || len > best.len) best = { move: m, len };
    }
    if (best) return best.move;
  }
  return null;
}
