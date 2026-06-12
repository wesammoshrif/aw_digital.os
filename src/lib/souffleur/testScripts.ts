/**
 * Test-Skripte für den Souffleur — fiktiver Handwerker-Kunde
 * Reihenfolge so, dass jeder Einwand vom Matcher gefunden wird.
 *
 * Erweitert mit realistischen Szenarien aus der Vertriebsforschung:
 * - Pattern-Interrupt vs. reflexive Ablehnung
 * - Gestapelte Einwände (Vorwand-Ketten)
 * - Kaufsignal-Erkennung
 * - Branchen-spezifische Gespräche
 */

export interface ScriptStep {
  delayMs: number; // Pause VOR diesem Schritt
  text: string; // was der "Kunde" sagt
  note?: string; // optionaler Hinweis im Test-Hint
}

export const TEST_SCRIPTS: Record<string, ScriptStep[]> = {
  vollDurchlauf: [
    { delayMs: 1500, text: "Hallo, ja, wer ist denn da?" },
    {
      delayMs: 9000,
      text: "Keine Zeit gerade, ich bin auf der Baustelle. Was wollen Sie denn?",
      note: "Übe: Brücke + 30-Sekunden-Pitch",
    },
    {
      delayMs: 9000,
      text: "Eine Website? Haben wir doch schon. Macht mein Neffe für mich.",
      note: "Übe: Qualität hinterfragen, ohne den Neffen abzuwerten",
    },
    {
      delayMs: 9000,
      text: "Und was würde sowas ungefähr kosten bei Ihnen?",
      note: "Übe: Preis-Konter über ROI, nicht über Rabatt",
    },
    {
      delayMs: 9000,
      text: "Hmm. Schicken Sie mir doch einfach mal Unterlagen per Mail.",
      note: "Übe: E-Mail vermeiden, Termin festnageln",
    },
    {
      delayMs: 9000,
      text: "Naja, klingt ja eigentlich nicht uninteressant. Erzählen Sie nochmal genauer?",
      note: "Kaufsignal — sofort auf Termin spielen",
    },
    {
      delayMs: 9000,
      text: "Okay, machen wir einen Termin. Donnerstag würde mir passen.",
      note: "Abschluss: Termin festklopfen + Mail bestätigen",
    },
  ],

  schwieriger: [
    { delayMs: 1500, text: "Ja hallo, am Apparat." },
    {
      delayMs: 8000,
      text: "Nein, kein Interesse. Wir haben sowas nicht nötig.",
    },
    {
      delayMs: 8000,
      text: "Wir sind eh ausgelastet bis ins Frühjahr. Wozu mehr Werbung machen?",
    },
    {
      delayMs: 8000,
      text: "Ich entscheide das nicht. Müssen Sie mit dem Chef reden.",
    },
    {
      delayMs: 8000,
      text: "Wann der erreichbar ist? Müssen Sie nochmal anrufen.",
    },
  ],

  kurzeSession: [
    {
      delayMs: 1500,
      text: "Guten Tag, hier Müller. Was kann ich für Sie tun?",
    },
    {
      delayMs: 8000,
      text: "Interessant. Was kostet das denn so etwa?",
    },
    {
      delayMs: 8000,
      text: "Okay, dann machen wir mal einen Termin nächste Woche.",
    },
  ],

  // ── NEU: Social-Media-Typ ─────────────────────────────────────
  socialMedia: [
    { delayMs: 1500, text: "Ja, hallo? Firma Schneider." },
    {
      delayMs: 8000,
      text: "Website? Brauchen wir nicht, wir machen alles über Instagram. Haben 800 Follower.",
      note: "Übe: Social-Media-Einwand → Website als Zentrale positionieren",
    },
    {
      delayMs: 9000,
      text: "Ja, aber Instagram ist doch kostenlos. Warum soll ich noch Geld für eine Website ausgeben?",
      note: "Übe: Kosten-Konter → Plattform-Abhängigkeit + Google vs. Insta",
    },
    {
      delayMs: 9000,
      text: "Hmm, das mit der Google-Suche leuchtet ein. Aber DSGVO und der ganze Datenschutz-Kram schreckt mich ab.",
      note: "Übe: DSGVO-Angst nehmen → alles im Paket",
    },
    {
      delayMs: 8000,
      text: "Na gut, wie läuft das denn bei Ihnen genau ab?",
      note: "Kaufsignal → Ablauf erklären + Termin",
    },
  ],

  // ── NEU: Verbrannter Kunde ────────────────────────────────────
  verbrannterKunde: [
    { delayMs: 1500, text: "Ja bitte, wer ist dran?" },
    {
      delayMs: 8000,
      text: "Ach, schon wieder eine Agentur. Ich werde ständig angerufen, das nervt wirklich.",
      note: "Übe: Callcenter-Müdigkeit → Differenzierung durch Vorbereitung",
    },
    {
      delayMs: 9000,
      text: "Die letzte Agentur hat 3.000 Euro genommen und nix hat gebracht. Nie wieder.",
      note: "Übe: Verbrannt-Einwand → ehrliches Nachfragen + Garantie-Angebot",
    },
    {
      delayMs: 9000,
      text: "Hmm, und woher weiß ich, dass das bei Ihnen anders ist?",
      note: "Übe: Vertrauen aufbauen → Referenzen anbieten, Zahlung nach Live-Gang",
    },
    {
      delayMs: 8000,
      text: "Na gut, schicken Sie mir mal was, aber keine Hochglanz-Broschüre, was Konkretes.",
      note: "Übe: E-Mail-Einwand in konkreten nächsten Schritt umwandeln",
    },
  ],

  // ── NEU: Einzelkämpfer kurz vor Rente ─────────────────────────
  einzelkaempfer: [
    { delayMs: 1500, text: "Schmidt, ja?" },
    {
      delayMs: 8000,
      text: "Ich bin alleine, ein Einmann-Betrieb. Da lohnt sich keine Website.",
      note: "Übe: Einzelkämpfer-Einwand → Website als stiller Mitarbeiter",
    },
    {
      delayMs: 9000,
      text: "Außerdem bin ich 58, noch ein paar Jahre, dann ist Schluss.",
      note: "Übe: Renten-Einwand → Betriebswert steigern + letzte gute Jahre",
    },
    {
      delayMs: 9000,
      text: "Meine Kunden kommen alle über Mundpropaganda, hat immer gereicht.",
      note: "Übe: Mundpropaganda → Google-Validation nach Empfehlung",
    },
    {
      delayMs: 8000,
      text: "Naja, stimmt schon, der junge Maier aus dem Nachbardorf hat ne schicke Seite...",
      note: "Wettbewerbs-Signal → sofort konkret werden",
    },
  ],

  // ── NEU: Dachdecker mit Vorwand-Kette ─────────────────────────
  vorwandKette: [
    { delayMs: 1500, text: "Dachdeckerei Weber, guten Tag." },
    {
      delayMs: 8000,
      text: "Kein Interesse, wir sind voll ausgelastet.",
      note: "Vorwand 1: Kombination aus 'kein Interesse' + 'läuft gut'. Nicht argumentieren, isolieren!",
    },
    {
      delayMs: 9000,
      text: "Ja und außerdem nutzen wir MyHammer, da kommen genug Anfragen.",
      note: "Vorwand 2: Portal. Jetzt kommt der echte Einwand...",
    },
    {
      delayMs: 9000,
      text: "Na ja, ehrlich gesagt hatte ich mal eine Agentur und da wurde ich abgezockt. 5.000 Euro in den Sand gesetzt.",
      note: "ECHTER EINWAND: verbrannt. Jetzt empathisch rangehen, nicht verkaufen.",
    },
    {
      delayMs: 9000,
      text: "Wie, keine Anzahlung? Und Referenzen kann ich anrufen? Das klingt anders.",
      note: "Kaufsignal nach Vertrauensaufbau → Termin anbieten",
    },
    {
      delayMs: 8000,
      text: "Na gut, nächste Woche Mittwoch hätte ich Zeit. Nachmittags.",
      note: "Abschluss: E-Mail + Termin bestätigen",
    },
  ],
};
