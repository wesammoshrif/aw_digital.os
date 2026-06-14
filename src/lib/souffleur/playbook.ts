/**
 * Cold-Call-Playbook — DE
 * ─────────────────────────────────────────────────────────────
 * Die Einwand-Bibliothek des Souffleurs. Jeder "Move" hat:
 *   - trigger: Keywords/Regex, die im Transkript des KUNDEN auftauchen
 *   - line:    der empfohlene nächste Satz (groß im Pop-up)
 *   - alts:    2 Alternativen (Chips)
 *   - kind:    opener | objection | signal | closing | guidance
 *
 * Der lokale Matcher (matcher.ts) findet ohne API-Key in 0 ms die
 * passende Antwort. Haiku verfeinert später nur das Unklare.
 *
 * Inhalt: Verkauf von Premium-Websites (~2.000 €) + Wartung an
 * Handwerksbetriebe per Telefon-Akquise.
 */

export type MoveKind =
  | "opener"
  | "gatekeeper"
  | "objection"
  | "signal"
  | "closing"
  | "guidance";

export interface Move {
  id: string;
  kind: MoveKind;
  label: string; // kurzer Titel für den Button/Chip
  trigger: RegExp; // erkennt den Einwand im Kunden-Transkript
  line: string; // der große empfohlene Satz
  alts: string[]; // 2 Alternativen
}

/* {hook} wird zur Laufzeit durch den Audit-Hook des Leads ersetzt. */
export const PLAYBOOK: Move[] = [
  // ── ERÖFFNUNG ────────────────────────────────────────────────
  {
    id: "opener",
    kind: "opener",
    label: "Eröffnung",
    trigger: /\b(hallo|guten tag|ja bitte|am apparat|firma|spreche|wer ist da)\b/i,
    line: "Guten Tag, hier ist [Name] von AW Digital. Ich habe mir kurz Ihre Website angesehen — {hook} Haben Sie 60 Sekunden?",
    alts: [
      "Ich mach's kurz: Mir ist an Ihrer Website ein Punkt aufgefallen, der Sie täglich Anfragen kostet. Darf ich?",
      "Ich rufe an, weil ich glaube, dass Sie online mehr aus Ihrem Betrieb holen können. 30 Sekunden?",
    ],
  },

  // ── EINWÄNDE ─────────────────────────────────────────────────
  {
    id: "no_time",
    kind: "objection",
    label: "Keine Zeit",
    trigger: /\b(keine zeit|gerade schlecht|im stress|baustelle|unterwegs|später|kein moment|viel zu tun)\b/i,
    line: "Verstehe — Sie sind am Arbeiten, nicht am Telefon. Genau 30 Sekunden, dann entscheiden Sie. Passt das oder rufe ich Donnerstag früh nochmal an?",
    alts: [
      "Kein Problem — wann passt es besser, heute Nachmittag oder morgen früh?",
      "Dann fasse ich's in einem Satz: Ihre Seite lädt zu langsam, das kostet Kunden. Wollen Sie die Zahlen?",
    ],
  },
  {
    id: "no_interest",
    kind: "objection",
    label: "Kein Interesse",
    trigger: /\b(kein interesse|brauch(e|en) (ich|wir) nicht|nicht interessiert|will nichts|lassen sie|nein danke)\b/i,
    line: "Das höre ich oft — bis die Betriebe sehen, wie viele Anfragen über eine schlechte Website verloren gehen. Darf ich Ihnen kostenlos zeigen, wo Sie stehen?",
    alts: [
      "Völlig fair. Eine Frage noch: Woher kommen Ihre neuen Kunden aktuell — Empfehlung oder online?",
      "Verstanden. Dann schicke ich Ihnen nur die Kurz-Analyse Ihrer Seite, ganz unverbindlich. Welche E-Mail?",
    ],
  },
  {
    id: "have_website",
    kind: "objection",
    label: "Haben schon Website",
    trigger: /\b(haben (schon|bereits)|gibt(s)? schon|website haben wir|homepage|seite haben|ist vorhanden)\b/i,
    line: "Das weiß ich — ich habe sie mir angesehen. Genau deshalb rufe ich an: Auf dem Handy lädt sie über 8 Sekunden, da springen 3 von 4 Besuchern ab. Soll ich's Ihnen zeigen?",
    alts: [
      "Haben ist gut — die Frage ist, ob sie Anfragen bringt. Wie viele kommen pro Monat über die Seite?",
      "Klar. Wann wurde sie zuletzt überarbeitet? Bei den meisten ist sie 4-5 Jahre alt und mobil unbrauchbar.",
    ],
  },
  {
    id: "price",
    kind: "objection",
    label: "Zu teuer / Preis",
    // "kosten" (Infinitiv) und "preislich" ergänzt — Konjunktiv "was würde das kosten"
    // ist am Telefon die Standardform und matchte vorher nie.
    trigger: /\b(teuer|kostet|kosten|preis|preislich|was kostet|wie viel|zu viel geld|budget|leisten|lohnt sich)\b/i,
    line: "Faire Frage. Eine neue Website kostet etwa so viel wie ein mittlerer Auftrag — und holt den über das Jahr ein Vielfaches rein. Soll ich Ihnen rechnen, ab wann sie sich trägt?",
    alts: [
      "Weniger als Sie denken, und in Raten möglich. Wichtiger: Was ist Ihnen ein zusätzlicher Auftrag pro Monat wert?",
      "Es gibt aktuell die go-digital-Förderung — der Staat übernimmt 50 %. Soll ich das für Sie prüfen?",
    ],
  },
  {
    id: "send_email",
    kind: "objection",
    label: "Schicken Sie E-Mail",
    trigger: /\b(schicken sie|mail|e-mail|email|unterlagen|per post|zusenden|schick(en)? mir)\b/i,
    line: "Mache ich — und damit es nicht untergeht: Ich schicke Ihnen die konkrete Analyse Ihrer Seite, nicht nur Werbung. Auf welche Adresse, und rufe ich Freitag kurz zum Feedback an?",
    alts: [
      "Gerne. Eine E-Mail liest keiner — lassen Sie uns 10 Minuten per Video machen, da zeige ich's live. Wann?",
      "Klar. Damit ich's passend mache: Was ist Ihr wichtigstes Gewerk, das mehr laufen soll?",
    ],
  },
  {
    id: "no_decision",
    kind: "objection",
    label: "Nicht Entscheider",
    trigger: /\b(chef|inhaber|kollege|partner|frau|mann|nicht (mein|meine)|entscheide(t)? nicht|muss (ich )?fragen)\b/i,
    line: "Verstehe — wer trifft solche Entscheidungen bei Ihnen, und wann erreiche ich die Person am besten?",
    alts: [
      "Kein Problem. Soll ich Ihnen die Analyse schicken, die Sie intern weitergeben können?",
      "Wann sind Sie und der Chef mal zusammen erreichbar? Dann zeige ich's in 10 Minuten beiden.",
    ],
  },
  {
    id: "have_agency",
    kind: "objection",
    label: "Haben Agentur/Neffe",
    // "agentur" wurde rausgezogen — sonst verschattet have_agency die spezifischeren
    // Karten verbrannt ("letzte Agentur hat 3000 € genommen") und callcenter_fatigue.
    trigger: /\b(macht (jemand|mein|der)|neffe|sohn|bekannte(r)?|jemand der das macht|betreut|eigene agentur|unsere agentur|haben (eine )?agentur)\b/i,
    line: "Das ist oft so — Familie ist super für den Start. Aber wenn es um echte Kundenanfragen und Google-Ranking geht, braucht es meist Profi-Werkzeug. Darf ich Ihnen den Unterschied in 2 Minuten zeigen?",
    alts: [
      "Verständlich. Hat Ihr Bekannter auch die Ladezeiten und die DSGVO-Sicherheit im Griff? Da wird's oft teuer für den Chef.",
      "Klar. Aber Hand aufs Herz: Haben Sie ein schlechtes Gewissen, wenn Sie ihn nach 2 Jahren mal um eine Änderung bitten müssen?",
    ],
  },
  {
    id: "happy_now",
    kind: "objection",
    label: "Läuft gut / genug Aufträge",
    trigger: /\b(läuft|genug (auftr|arbeit)|ausgelastet|voll|brauchen keine (neue|mehr)|zufrieden)\b/i,
    line: "Ein Luxusproblem — Glückwunsch! Aber geht es Ihnen um *mehr* Arbeit oder um *bessere* Arbeit? Mit einer Top-Website ziehen Sie die Premium-Kunden an und können die mühsamen Aufträge aussortieren. Wäre das interessant?",
    alts: [
      "Top! Dann ist jetzt der perfekte Zeitpunkt, um die Fachkräfte-Suche über die Website zu automatisieren. Fehlen Ihnen gute Leute?",
      "Verstanden. Aber eine Website ist wie ein digitaler Mitarbeiter — sie schläft nie. Wollen wir sie so aufstellen, dass sie für Sie filtert?",
    ],
  },

  // ── NEUE EINWÄNDE (erweitert) ─────────────────────────────────
  {
    id: "social_media",
    kind: "objection",
    label: "Machen Social Media",
    trigger:
      /\b(facebook|instagram|insta|social media|soziale medien|poste|posting|reichweite|follower)\b/i,
    line: "Super, dass Sie digital aktiv sind. Aber wenn jemand bei Google Ihr Gewerk + Stadt sucht, taucht Instagram auf Seite 4 auf. 93 % klicken auf organische Google-Ergebnisse. Die Website ist die Zentrale, Social Media der Lautsprecher.",
    alts: [
      "Gerade weil Sie Social Media nutzen: Wo landet der Interessent, der mehr wissen will? Ohne Website denkt er: Gibt's den Betrieb wirklich?",
      "Instagram gehört Meta, nicht Ihnen. Ändert sich der Algorithmus, ist die Reichweite weg. Die Website kontrollieren Sie selbst.",
    ],
  },
  {
    id: "callcenter_fatigue",
    kind: "objection",
    label: "Schon 10x angerufen",
    // "nerv" mit Suffix-Gruppe, sonst matcht "nervt"/"nerven"/"nervig" nicht.
    trigger:
      /\b(schon.*angerufen|hundert.*mal|ständig.*agentur|jede.*woche|nerv[a-zäöüß]*|wieder.*einer|immer.*dasselbe|dauernd.*anrufe)\b/i,
    line: "Das glaube ich Ihnen sofort. Ich bin kein Callcenter. Ich habe mir vorher Ihre Google-Präsenz angeschaut und gesehen, dass Sie für drei wichtige Suchbegriffe nicht auftauchen. Das wollte ich Ihnen einmal mitteilen.",
    alts: [
      "Ich rufe heute genau vier Betriebe an, nicht vierhundert. Und ich habe konkret gesehen, dass Ihr Wettbewerber bei Google auf Platz 1 steht.",
      "Was genau hat Sie bei den anderen gestört? Dann weiß ich sofort, ob ich anders bin oder Ihnen besser keine Zeit stehle.",
    ],
  },
  {
    id: "kumpel_macht",
    kind: "objection",
    label: "Kumpel/Bekannter",
    trigger:
      /\b(kumpel|bekannter|schwager|nachbar|cousin|bruder|freund|kollege).*(macht|kümmert|hat.*gebaut|pflegt|baut|hilft)\b/i,
    line: "Wenn bei Ihnen ein Kunde anruft und sagt 'Mein Kumpel macht das', würden Sie dem empfehlen, das professionell machen zu lassen? Bei einer Website ist es wie beim Heizungsbau: der Fachmann macht den Unterschied.",
    alts: [
      "Gerade deshalb lohnt sich ein kurzer Blick: Zwischen 'funktioniert irgendwie' und 'bringt Aufträge' liegt der Unterschied.",
      "Und was passiert, wenn der mal keine Zeit hat? Wir übergeben Ihnen alles, Zugänge, Inhalte, es gehört Ihnen.",
    ],
  },
  {
    id: "dsgvo_angst",
    kind: "objection",
    label: "DSGVO / Datenschutz",
    trigger:
      /\b(dsgvo|datenschutz|abmahnung|abgemahnt|cookie|rechtlich|impressum|anwalt|kompliziert|abmahn)\b/i,
    line: "Das nehmen wir komplett ab: Impressum, Datenschutzerklärung, Cookie-Banner, alles im Paket. Und wer KEINE Website hat, hat trotzdem DSGVO-Pflichten für sein Google-Profil. Mit der Website sind Sie auf der sicheren Seite.",
    alts: [
      "Die Handwerkskammer warnt: Auch ein Google-Profil braucht ein korrektes Impressum. Wir sorgen dafür, dass alles stimmt.",
      "Ein SHK-Betrieb hat mir dasselbe gesagt. Zwei Wochen später war alles sauber eingerichtet, seitdem ist er entspannt.",
    ],
  },
  {
    id: "google_ads",
    kind: "objection",
    label: "Machen Google Ads",
    trigger:
      /\b(google.*ads|werbung.*schalten|anzeigen|klickwerbung|bezahlte.*werbung|adwords|online.*werbung)\b/i,
    line: "Ads ohne Website ist wie ein Schild auf der Autobahn, das auf einen leeren Parkplatz zeigt. Nur 6,8 % klicken auf Anzeigen, 93 % auf normale Ergebnisse. Und sobald Sie das Budget abstellen, sind Sie unsichtbar.",
    alts: [
      "Bei 8 Euro pro Klick und 50 Klicks im Monat sind das 4.800 Euro im Jahr. Für ein Drittel haben Sie eine Website, die dauerhaft arbeitet.",
      "Gerade weil Sie Ads nutzen: Google bewertet Ihre Anzeige besser, wenn die Zielseite professionell ist. Ohne Website zahlen Sie Höchstpreis.",
    ],
  },
  {
    id: "einzelkaempfer",
    kind: "objection",
    label: "Bin Einzelkämpfer",
    // Entgieren: "nur.*ich" matchte auch "nur damit ich das verstehe";
    // "bin.*allein" und "ein.*mann" jetzt direkte Nachbarschaft.
    trigger:
      /\b(einmann|ein-?mann-?betrieb|einzelkämpfer|solo|freelancer|garage|nebenbei|(bin|arbeite|mache alles)( ganz)? allein(e)?|nur ich|kleinbetrieb|kleinst-?betrieb)\b/i,
    line: "Gerade als Einzelkämpfer ist die Website Ihr bester Mitarbeiter: arbeitet rund um die Uhr, auch samstags, wenn Sie auf der Baustelle stehen. Statt jeden Auftrag zu nehmen, kommen die richtigen Anfragen zu Ihnen.",
    alts: [
      "Ein Fliesenleger, auch alleine unterwegs, bekommt seit der Website drei Anfragen pro Woche und kann sich die besten raussuchen.",
      "Wenn die Website nur einen Auftrag im Monat bringt, was wäre der wert? Bei 3.000 Euro hat sie sich sofort bezahlt.",
    ],
  },
  {
    id: "vor_rente",
    kind: "objection",
    label: "Kurz vor Rente",
    trigger:
      // "alter" raus (matchte "mein alter Geselle"), "noch.*jahre" auf Renten-Kontext einengen.
      /\b(rente|aufhören|nachfolger|schluss machen|ruhestand|pension|letzte.*jahre|noch (ein )?(paar|wenige) jahre|bald (ist )?ende)\b|übergabe/i,
    line: "Gerade deswegen: Ein Betrieb mit professioneller Website und Google-Bewertungen ist deutlich mehr wert. Das ist wie beim Hausverkauf: renoviert bringt mehr als unrenoviert.",
    alts: [
      "Die letzten Jahre sollen die entspanntesten sein, oder? Mit der Website kommen die guten Aufträge, keine Preisdrückerei.",
      "Ein Dachdeckerbetrieb hat seinen Betrieb für 30.000 Euro mehr verkauft, weil er eine Website mit Anfragen-Pipeline hatte.",
    ],
  },
  {
    id: "verbrannt",
    kind: "objection",
    label: "Schlechte Erfahrung",
    trigger:
      /\b(schlechte.*erfahrung|verbrannt|abgezockt|nie.*wieder|letzte.*agentur|betrogen|nix.*gebracht|geld.*versenkt|reingelegt|enttäuscht)\b/i,
    line: "Das tut mir ehrlich leid. Was genau ist da schiefgelaufen? Das hilft mir zu verstehen, ob wir der richtige Partner sind. Wenn nicht, sage ich Ihnen das direkt.",
    alts: [
      "Deswegen arbeiten wir anders: Sie zahlen die zweite Hälfte erst, wenn die Seite live ist. Alle Zugänge gehören Ihnen. Kein Knebelvertrag.",
      "Rufen Sie drei Betriebe an, für die wir gebaut haben, und fragen Sie selbst. Das ist mehr wert als jedes Versprechen von mir.",
    ],
  },
  {
    id: "portal",
    kind: "objection",
    label: "Nutzen MyHammer/Portal",
    trigger:
      /\b(myhammer|check24|handwerker.*portal|plattform|bewertungsportal|aufträge.*über.*portal)\b/i,
    line: "Portale bringen Aufträge, aber Sie konkurrieren immer mit dem billigsten. Mit der eigenen Website kommen Kunden direkt zu Ihnen, ohne Preisvergleich, ohne Provision. Das sind die besseren Aufträge.",
    alts: [
      "Das Portal entscheidet, wie oft Sie angezeigt werden. Ihre Website kontrollieren Sie selbst.",
      "Beides zusammen ist am besten. Aber wenn jemand Sie auf MyHammer findet und dann googelt: ohne eigene Website gehen Sie leer aus.",
    ],
  },
  {
    id: "mundpropaganda",
    kind: "objection",
    label: "Nur Mundpropaganda",
    trigger:
      /\b(nische|speziell|nur.*privat|sucht.*niemand|kennt.*jeder|mundpropaganda|mund.*zu.*mund|persönlich|empfehlung.*reicht)\b/i,
    line: "Mundpropaganda ist Gold wert. Aber was passiert, wenn jemand Ihren Namen empfohlen bekommt und Sie googelt? 90 % tun genau das. Wenn da nichts kommt, war die Empfehlung umsonst.",
    alts: [
      "Gerade weil Sie spezialisiert sind: Wer nach Ihrem Gewerk + Stadt sucht, will genau Sie. Kein Streuverlust.",
      "Empfehlung ist Kanal eins. Die Website ist Ihr zweites Standbein, das Sie kontrollieren.",
    ],
  },

  // ── KAUFSIGNALE ──────────────────────────────────────────────
  {
    id: "signal_interest",
    kind: "signal",
    label: "Zeigt Interesse",
    // "aha" entfernt — Füllwort, das in jedem zweiten Satz vorkommt und
    // ständig den eigentlichen Einwand-Tipp überschrieben hat.
    trigger: /\b(interessant|erzählen sie|wie meinen|was kostet das genau|wie läuft das|klingt gut|hört sich gut)\b/i,
    line: "Super. Am einfachsten zeige ich's Ihnen live in 15 Minuten — ich baue Ihnen vorab einen Entwurf, wie Ihre neue Seite aussehen könnte. Passt Mittwoch oder Donnerstag besser?",
    alts: [
      "Dann lassen Sie uns einen kurzen Termin machen, da sehen Sie alles konkret. Vormittags oder nachmittags?",
      "Ich schicke Ihnen sofort die Analyse und einen Mockup-Link — und wir telefonieren morgen 10 Minuten dazu.",
    ],
  },
  {
    id: "signal_when",
    kind: "signal",
    label: "Fragt nach Ablauf/Zeit",
    trigger: /\b(wie lange|dauer|wann fertig|ablauf|wie geht (es|das) weiter|nächste schritte)\b/i,
    line: "Schnell: Wir machen einen 15-Minuten-Termin, ich baue den Entwurf, Sie geben Inhalte — in der Regel ist die Seite in 2-3 Wochen online. Sollen wir den Termin gleich setzen?",
    alts: [
      "Der erste Entwurf steht in wenigen Tagen. Lassen Sie uns den Kickoff terminieren — wann passt es?",
      "Ganz wenig Aufwand für Sie. Ich brauche 15 Minuten von Ihnen, den Rest mache ich. Heute oder morgen?",
    ],
  },

  {
    id: "signal_recruiting",
    kind: "signal",
    label: "Braucht Mitarbeiter",
    trigger:
      /\b(mitarbeiter|geselle|azubi|fachkraft|personal|bewerber|suchen.*leute|keiner will|niemand bewirbt|nachwuchs)\b/i,
    line: "Genau da hilft die Website doppelt: Ein 22-Jähriger googelt Ihren Betrieb als Erstes. Wenn da nichts kommt, bewirbt er sich woanders. Sie verlieren Bewerber, ohne es zu merken.",
    alts: [
      "Wir bauen einen Karriere-Bereich ein, der junge Leute anspricht. Das kostet nichts extra und bringt Bewerbungen.",
      "Kunden UND Mitarbeiter finden Sie über die Website. Zwei Fliegen mit einer Klappe.",
    ],
  },

  // ── GATEKEEPER (Sekretariat / Mitarbeiter am Telefon) ────────
  {
    id: "gk_durchstellen",
    kind: "gatekeeper",
    label: "Durchstellen lassen",
    trigger:
      /\b(worum geht|um was geht|in welcher angelegenheit|kann ich (etwas|was) ausrichten|nicht (im haus|da|erreichbar)|in einer besprechung|wer (sind sie|ruft an)|sind sie von)\b/i,
    line: "Es geht um die Außendarstellung von [Firma] — ich hatte mir das angesehen und wollte Herrn [Chef] kurz eine Rückmeldung geben. Können Sie mich einen Moment durchstellen?",
    alts: [
      "Verstehe. Sagen Sie ihm einfach, es geht um die Website und dauert 2 Minuten — er weiß dann Bescheid. Ist er gerade da?",
      "Kein Thema. Wann erreiche ich Herrn [Chef] heute am besten direkt?",
    ],
  },
  {
    id: "gk_rueckruf",
    kind: "gatekeeper",
    label: "Rückrufzeit sichern",
    trigger:
      /\b(rufen sie (später|nochmal)|am besten (erreichen|anrufen)|wann (ist|wäre) er (da|erreichbar)|versuchen sie es|später nochmal)\b/i,
    line: "Mache ich gern. Wann erreiche ich Herrn [Chef] am besten direkt — eher vormittags oder am späten Nachmittag?",
    alts: [
      "Passt. Gibt es eine Durchwahl oder Handynummer, unter der ich ihn direkt bekomme?",
      "Alles klar. Ich notiere mir [Tag] nachmittags. Sagen Sie ihm, AW Digital wegen der Website meldet sich nochmal?",
    ],
  },

  // ── ABSCHLUSS ────────────────────────────────────────────────
  {
    id: "closing",
    kind: "closing",
    label: "Termin setzen",
    // Erweitert um Wochentage und natürliche Terminzusagen ("Donnerstag um drei",
    // "nächste Woche Mittwoch hätte ich Zeit") — Kunden sagen am Telefon nie das Wort "Termin".
    // Bewusst OHNE blanke Wochentage — „Donnerstag hab ich keine Zeit" darf
    // nicht als Abschluss-Signal den Zeit-Einwand überschatten. Wochentage
    // kommen über „nächste woche" + Terminvokabular trotzdem durch.
    trigger:
      /\b(termin|treffen|videocall|zoom|wann können|machen wir|einverstanden|ok machen wir|hätte (ich )?(da )?zeit|würde (mir )?(gehen|passen)|nächste woche)\b/i,
    line: "Perfekt. Ich trage uns für [Tag] um [Uhrzeit] ein und schicke Ihnen gleich die Einladung plus den ersten Entwurf. Auf welche E-Mail darf das?",
    alts: [
      "Top. Ich bestätige per SMS und Mail. Wie ist Ihre beste Nummer und E-Mail?",
      "Sehr gut — dann bis [Tag]. Ich bereite Ihren Mockup-Entwurf vor, damit Sie direkt was sehen.",
    ],
  },
];

/* Manuell antippbare Schnell-Einwände (Reihenfolge im Pop-up).
   Erste Reihe: häufigste 8 Einwände. Zweite Reihe: erweiterte. */
export const QUICK_OBJECTIONS = [
  // Reihe 1 — Klassiker
  "no_time",
  "no_interest",
  "have_website",
  "price",
  "send_email",
  "no_decision",
  "have_agency",
  "happy_now",
  // Reihe 2 — Erweitert
  "social_media",
  "callcenter_fatigue",
  "kumpel_macht",
  "verbrannt",
  "einzelkaempfer",
  "vor_rente",
  "portal",
  "mundpropaganda",
] as const;

export const KIND_LABEL: Record<MoveKind, string> = {
  opener: "Eröffnung",
  gatekeeper: "Gatekeeper",
  objection: "Einwand",
  signal: "Kaufsignal",
  closing: "Abschluss",
  guidance: "Hinweis",
};

/**
 * Voicemail-Skript (~15 Sek.) für den Dispo „Mailbox". Nummer zweimal,
 * konkretes Audit-Signal statt Produktwerbung, ein Satz Neugier.
 * {hook} → Audit-Hook, [Nummer] → eigene Rückrufnummer.
 */
export const VOICEMAIL_SCRIPT =
  "Guten Tag Herr [Name], hier [Berater] von AW Digital. Ich rufe an, weil mir an Ihrer Website etwas aufgefallen ist: {hook} Das kostet Sie gerade Anfragen. Rufen Sie mich kurz zurück unter [Nummer] — ich wiederhole: [Nummer]. Dauert keine zwei Minuten. Danke, und bis dann!";

export function getMove(id: string): Move | undefined {
  return PLAYBOOK.find((m) => m.id === id);
}

export function fillHook(text: string, hook?: string | null): string {
  return text.replace(
    "{hook}",
    hook ?? "da ist mir ein Punkt aufgefallen, der Sie Anfragen kostet.",
  );
}
