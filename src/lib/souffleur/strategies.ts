/**
 * Cold-Call Strategien & Psychologie-Framework
 * ─────────────────────────────────────────────────────────────────
 * Timing-Daten, Follow-up-Kadenz, Power-Questions, Pain-Amplification,
 * Micro-Commitment-Leiter und Nein-Gradienten.
 *
 * Wird vom Souffleur und der Haiku-Route genutzt, um kontextabhängig
 * die beste Strategie vorzuschlagen.
 *
 * Quellen: Triveo, Cognism, Umsatzuni, Vertriebsakademie, Salespower.
 */

// ── TIMING ──────────────────────────────────────────────────────

export const BEST_CALL_TIMES = {
  golden: {
    day: "Donnerstag",
    window: "16:00-17:30",
    why: "Feierabend-Fenster: Handwerker zurück im Büro oder im Auto. Laut Umsatzuni 20% besser als Freitag.",
  },
  good: [
    { day: "Dienstag", window: "16:00-18:00" },
    { day: "Mittwoch", window: "16:00-18:00" },
    { day: "Donnerstag", window: "17:30-18:30", note: "Bürokram-Zeit" },
  ],
  avoid: [
    { window: "8:00-9:00", why: "Baustellen-Start, unterwegs" },
    { window: "9:00-11:30", why: "Kernarbeitszeit Baustelle" },
    { window: "Freitag nachmittags", why: "Gedanklich im Wochenende" },
  ],
} as const;

// ── FOLLOW-UP-KADENZ ────────────────────────────────────────────

export interface CadenceStep {
  day: number;
  channel: "telefon" | "sms" | "whatsapp" | "email";
  action: string;
  template?: string;
}

export const FOLLOW_UP_CADENCE: CadenceStep[] = [
  {
    day: 1,
    channel: "telefon",
    action: "Erstanruf (Playbook)",
  },
  {
    day: 1,
    channel: "sms",
    action: "Kurze Nachricht nach Anruf",
    template:
      "Herr [Name], hier [Berater] von AW Digital. Wie besprochen: Ich melde mich [Tag] nochmal.",
  },
  {
    day: 3,
    channel: "telefon",
    action: "Zweiter Versuch (andere Uhrzeit)",
  },
  {
    day: 5,
    channel: "email",
    action: "Kurzmail mit Screenshot der analysierten Website",
    template:
      "Betreff: Ihr Betrieb bei Google — kurze Analyse\n\nHerr [Name], anbei ein Screenshot Ihrer Website-Analyse. Ein konkreter Verbesserungsvorschlag: [Punkt]. Darf ich Sie [Tag] kurz dazu anrufen?",
  },
  {
    day: 8,
    channel: "telefon",
    action: "Dritter Versuch, Bezug auf Mail",
  },
  {
    day: 10,
    channel: "whatsapp",
    action: "Vorher-Nachher-Beispiel eines Handwerker-Kunden",
  },
  {
    day: 14,
    channel: "telefon",
    action: "Vierter Versuch — letzter aktiver",
  },
  {
    day: 18,
    channel: "email",
    action: "Break-Up-Mail",
    template:
      "Herr [Name], ich möchte Sie nicht weiter belästigen. Falls Sie das Thema Website irgendwann angehen: meine Nummer haben Sie. Alles Gute!",
  },
  {
    day: 60,
    channel: "telefon",
    action: "Re-Engagement nur bei neuem Trigger",
  },
];

// ── POWER QUESTIONS ─────────────────────────────────────────────

export interface PowerQuestion {
  id: string;
  category: "awareness" | "future" | "contrast" | "decision";
  question: string;
  goal: string;
}

export const POWER_QUESTIONS: PowerQuestion[] = [
  // Awareness
  {
    id: "google_selbst",
    category: "awareness",
    question:
      "Wenn Sie privat einen Handwerker brauchen, was machen Sie als Erstes?",
    goal: "Selbstüberführung: Er sagt 'googeln' und widerlegt sein eigenes Nicht-Online-Sein",
  },
  {
    id: "empfehlung_anteil",
    category: "awareness",
    question:
      "Wie viele Aufträge kommen über Empfehlung und wie viele über andere Wege?",
    goal: "Klumpenrisiko sichtbar machen: 90%+ Empfehlung = Abhängigkeit",
  },
  {
    id: "empfehlung_weg",
    category: "awareness",
    question:
      "Wenn Ihr bester Empfehlungsgeber morgen aufhört, Sie weiterzuempfehlen, was dann?",
    goal: "Verwundbarkeit spüren lassen, keine Gegenargumente möglich",
  },

  // Future
  {
    id: "betrieb_5_jahre",
    category: "future",
    question:
      "Wo sehen Sie Ihren Betrieb in 5 Jahren? Und wie kommen die Kunden dann zu Ihnen?",
    goal: "Zukunfts-Ich überzeugt Gegenwarts-Ich",
  },
  {
    id: "geselle_kuendigt",
    category: "future",
    question:
      "Was passiert, wenn Ihr bester Geselle kündigt und Sie dringend Nachwuchs brauchen?",
    goal: "Recruiting-Schmerz mit Online-Präsenz verbinden",
  },
  {
    id: "regret_minimization",
    category: "future",
    question:
      "Wenn Sie in 5 Jahren zurückblicken: 'Gut, dass ich das angegangen bin' oder 'Hätte ich mal früher gemacht'?",
    goal: "Vermeidung zukünftiger Reue (Bezos-Framework)",
  },

  // Contrast
  {
    id: "google_test",
    category: "contrast",
    question:
      "Wenn ein Kunde Ihr Gewerk + Ihre Stadt googelt, wen findet er? Sie oder Ihren Konkurrenten?",
    goal: "Wettbewerbsrealität direkt konfrontieren",
  },
  {
    id: "zwei_betriebe",
    category: "contrast",
    question:
      "Zwei Betriebe: Einer hat eine professionelle Website mit Referenzen, der andere nichts. Wen rufen Sie an?",
    goal: "Perspektivwechsel, er gibt selbst die Antwort",
  },
  {
    id: "kosten_vergleich",
    category: "contrast",
    question:
      "Was kostet mehr: 2.000 Euro einmal oder 10 verlorene Aufträge pro Jahr?",
    goal: "Frame-Shift: Kosten vs. Investition",
  },

  // Decision
  {
    id: "was_zeigen",
    category: "decision",
    question:
      "Was müsste ich Ihnen zeigen, damit Sie sagen: Ja, das macht Sinn?",
    goal: "Er definiert selbst die Kaufkriterien",
  },
  {
    id: "ein_auftrag",
    category: "decision",
    question:
      "Angenommen, die Website bringt nur einen Auftrag pro Monat. Wäre das die Investition wert?",
    goal: "Minimalszenario, leicht zu bejahen",
  },
  {
    id: "was_haelt_ab",
    category: "decision",
    question:
      "Was hält Sie davon ab, das Thema jetzt anzugehen?",
    goal: "Echte Einwände auf den Tisch bringen",
  },
];

// ── PAIN AMPLIFICATION ──────────────────────────────────────────

export const PAIN_SEQUENCES = {
  google_test: [
    "Herr [Name], kurze Frage: Wenn Sie privat einen Handwerker brauchen, was machen Sie als Erstes?",
    "Genau. Und Ihre Kunden machen exakt dasselbe.",
    "Ich habe gerade '[Gewerk] [Stadt]' gegoogelt. Die ersten drei Ergebnisse sind [Konkurrent A], [B] und eine Bewertungsseite. Sie tauchen nicht auf.",
    "Stellen Sie sich vor, nur 3 Leute pro Woche suchen das. Das sind 12 Anfragen im Monat, die bei der Konkurrenz landen.",
  ],
  konkurrenz: [
    "Haben Sie mal geschaut, was [lokaler Konkurrent] online macht?",
    "Professionelle Seite, Google-Bewertungen, Maps-Eintrag. Wenn ein Kunde beide vergleicht, wer wirkt seriöser?",
    "Ihr Konkurrent investiert gerade in seine Online-Sichtbarkeit. In 6 Monaten hat er die Anfragen, die eigentlich Ihre wären.",
  ],
  fachkraefte: [
    "Mal ehrlich: Wie schwer ist es gerade, gute Gesellen oder Azubis zu finden?",
    "Ein 22-Jähriger googelt Ihren Betrieb als Erstes. Wenn da nichts Gescheites kommt, bewirbt er sich woanders.",
    "Sie verlieren Bewerber, ohne es zu merken. Die rufen nicht an und sagen 'Ihre Website war schlecht'. Die gehen einfach zum Nächsten.",
  ],
} as const;

// ── MICRO-COMMITMENT LEITER ─────────────────────────────────────

export const MICRO_COMMITMENTS = [
  {
    stufe: 1,
    typ: "Erlaubnis",
    phrase: "Darf ich Ihnen kurz eine Frage stellen? Dauert keine 30 Sekunden.",
  },
  {
    stufe: 2,
    typ: "Fakten",
    phrase:
      "Sie sind [Gewerk] in [Stadt], richtig? Kommen Ihre Neukunden hauptsächlich über Empfehlungen?",
  },
  {
    stufe: 3,
    typ: "Einsicht",
    phrase:
      "Stimmen Sie mir zu, dass die meisten Leute heute erstmal googeln, bevor sie jemanden anrufen?",
  },
  {
    stufe: 4,
    typ: "Schlussfolgerung",
    phrase:
      "Dann wäre es doch sinnvoll, dass Ihr Betrieb da auch gefunden wird, oder?",
  },
  {
    stufe: 5,
    typ: "Angebot",
    phrase:
      "Soll ich Ihnen kurz zeigen, wie Ihr Betrieb gerade online dasteht? Dauert 2 Minuten, kostenlos.",
  },
  {
    stufe: 6,
    typ: "Relevanz",
    phrase:
      "Das wäre doch interessant, oder? Zu sehen, was ein Kunde sieht, wenn er Sie sucht?",
  },
  {
    stufe: 7,
    typ: "Alternativ-Ja",
    phrase:
      "Ich schicke Ihnen eine kurze Auswertung und wir telefonieren Donnerstag 10 Minuten dazu. Vormittags oder nachmittags?",
  },
  {
    stufe: 8,
    typ: "Bestätigung",
    phrase:
      "Super, Donnerstag 14 Uhr. Sie bekommen vorher die Auswertung per Mail. Passt das so?",
  },
] as const;

// ── NEIN-GRADIENTEN ─────────────────────────────────────────────

export type NeinTyp = "reflexiv" | "weich" | "hart";

export interface NeinGradient {
  typ: NeinTyp;
  triggerWords: string[];
  stimmlicheMerkmale: string;
  behandlung: string;
  erfolgsquote: string;
}

/**
 * Klassifiziert ein „Nein" des Kunden nach Gradient (reflexiv/weich/hart) anhand
 * der Trigger-Wörter. Reihenfolge hart → weich → reflexiv, damit ein
 * entschiedenes Nein nicht von einer beiläufigen Floskel überschattet wird.
 * Gibt null zurück, wenn kein Nein-Muster greift.
 */
export function classifyNein(text: string | null | undefined): NeinTyp | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const typ of ["hart", "weich", "reflexiv"] as NeinTyp[]) {
    const g = NEIN_GRADIENTEN.find((x) => x.typ === typ);
    if (g && g.triggerWords.some((w) => t.includes(w))) return typ;
  }
  return null;
}

export const NEIN_GRADIENTEN: NeinGradient[] = [
  {
    typ: "reflexiv",
    triggerWords: [
      "kein interesse",
      "brauchen wir nicht",
      "rufen sie nicht mehr an",
      "nein danke passt schon",
    ],
    stimmlicheMerkmale: "Monoton, schnell, keine Gegenfragen",
    behandlung:
      "NICHT argumentieren. Muster brechen: 'Nur eine kurze Frage, damit ich Sie nicht nochmal störe: Wer kümmert sich bei Ihnen um neue Kundenanfragen?'",
    erfolgsquote: "30% lassen sich in ein Gespräch umwandeln",
  },
  {
    typ: "weich",
    triggerWords: [
      "im moment nicht so",
      "weiß nicht",
      "muss ich überlegen",
      "grundsätzlich schon aber",
      "nicht jetzt vielleicht später",
      "wie muss ich mir das vorstellen",
    ],
    stimmlicheMerkmale:
      "Stimme geht hoch am Satzende, langsamer, Pausen, Gegenfragen",
    behandlung:
      "Sofort konkreten Nutzen liefern: 'Wie viele Anfragen bekommen Sie aktuell pro Monat über das Internet?'",
    erfolgsquote: "50-60% konvertieren bei richtiger Behandlung",
  },
  {
    typ: "hart",
    triggerWords: [
      "habe mich entschieden",
      "intern besprochen",
      "definitiv nicht in frage",
      "streichen sie meine nummer",
      "gerade erst neue website",
      "geschäft schließt",
    ],
    stimmlicheMerkmale:
      "Ruhig, bestimmt, kurze Sätze, keine Gegenfragen, begründet",
    behandlung:
      "Akzeptieren, Tür offen lassen: 'Respektiere ich. Falls sich was ändert, haben Sie meine Nummer. Alles Gute!'",
    erfolgsquote: "Unter 5%, nachfassen nach 6-12 Monaten",
  },
];

// ── GOLDENE REGELN ──────────────────────────────────────────────

export const GOLDEN_RULES = [
  "Nie länger als 30 Sekunden am Stück reden. Fragen stellen, Stille aushalten.",
  "Namen SPARSAM einsetzen: einmal zur Begrüßung, danach nur an Schlüsselstellen (Einwand drehen, Abschluss). NICHT in jedem Satz — ständige Wiederholung wirkt aufdringlich und einstudiert.",
  "Erst Schmerz, dann Lösung. Nie mit dem Produkt anfangen.",
  "Branchen-Sprache: 'Aufträge' statt 'Leads', 'Sichtbarkeit' statt 'SEO', 'gefunden werden' statt 'Conversion'.",
  "Handwerker-Ehre respektieren. Nie suggerieren, sein Betrieb sei schlecht. 'Ihre Arbeit ist top, online sieht man das nur nicht.'",
  "Konkret statt vage, aber NIE erfundene Zahlen/Statistiken behaupten — lieber 'mehr Anfragen über Google' als eine ausgedachte Prozentzahl.",
  "Ein Ziel pro Anruf: Termin. Nicht verkaufen, nur den nächsten Schritt sichern.",
  "Bei Ablehnung sauber rausgehen. Tür offen lassen, Respekt zeigen.",
] as const;

// ── SAISONALE AUFHÄNGER ─────────────────────────────────────────

export const SEASONAL_HOOKS: Record<string, { months: number[]; hook: string }> = {
  fruehling: {
    months: [3, 4, 5],
    hook: "Die Saison startet gerade. Die Leute suchen jetzt aktiv nach Handwerkern. Wenn Ihre Seite in 3 Wochen steht, fangen Sie noch die Hauptsaison ab.",
  },
  sommer: {
    months: [6, 7, 8],
    hook: "Sie sind jetzt voll ausgelastet, das weiß ich. Aber die Kunden für September/Oktober entscheiden jetzt, wen sie beauftragen.",
  },
  herbst: {
    months: [9, 10, 11],
    hook: "Das Winterloch kommt. Wer jetzt die Website aufbaut, hat im Frühjahr vollen Auftragseingang, während andere bei null anfangen.",
  },
  winter: {
    months: [12, 1, 2],
    hook: "Gerade jetzt, wo weniger los ist, ist die beste Zeit. Dann sind Sie im Frühjahr startklar, wenn die Nachfrage anzieht.",
  },
};
