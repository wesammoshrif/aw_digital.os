/**
 * Gewerke-Playbook — Branchenspezifische Cold-Call-Karten
 * ─────────────────────────────────────────────────────────────────
 * Jede Karte enthält alles, was der Souffleur braucht, um im
 * Gespräch sofort branchenkundig zu wirken:
 *
 *   - hookSatz:       perfekter Einstiegssatz (ersetzt den generischen Opener)
 *   - painPoints:     Top 3 Website-Probleme genau dieser Branche
 *   - killerQuestion: die Frage, die den Bedarf auslöst
 *   - roiArgument:    branchenspezifische Rechnung (Auftragswert x Leads x Rate)
 *   - seasonalTiming: wann anrufen, welcher Aufhänger
 *   - triggerWords:   Regex für den Matcher (Kunden-Transkript)
 *   - auditHooks:     konkrete Sätze wenn Website langsam / nicht mobil / kein Ranking
 *
 * Inhalt: natürliches Deutsch, keine Floskeln, kein Floskel-Marketing.
 * Ziel: der Handwerker denkt "der kennt sich aus in meiner Branche".
 */

export interface TradeCard {
  /** Interner Schlüssel, muss zu lead.trade passen (lowercase, ohne Umlaute) */
  id: string;
  /** Anzeige-Name */
  label: string;
  /** Synonyme/Varianten, wie das Gewerk in lead.trade stehen könnte */
  aliases: string[];

  /** Der perfekte Eröffnungssatz, der Branchenkenntnis zeigt */
  hookSatz: string;

  /** Top 3 website-bezogene Schmerzpunkte */
  painPoints: [string, string, string];

  /** Die eine Frage, die den Bedarf auslöst */
  killerQuestion: string;

  /** Branchenspezifische ROI-Rechnung */
  roiArgument: string;

  /** Beste Monate und passender Aufhänger */
  seasonalTiming: {
    bestMonths: string;
    angle: string;
  };

  /** Keywords im Kunden-Transkript, die auf dieses Gewerk hinweisen */
  triggerWords: RegExp;

  /** Konkrete Audit-Aufhänger je nach gefundenem Problem */
  auditHooks: {
    slow: string;
    noMobile: string;
    noRanking: string;
  };
}

export const TRADE_PLAYBOOK: TradeCard[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. DACHDECKER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "dachdecker",
    label: "Dachdecker",
    aliases: [
      "dachdecker",
      "dachdeckerei",
      "dachdeckermeister",
      "bedachung",
      "dachbau",
      "dachdecker-",
      "spenglerei",
    ],

    hookSatz:
      "Herr [Name], kurze Frage: Wenn jemand in [Stadt] nach einem Sturm 'Dachdecker Notdienst' googelt, tauchen Sie dann auf? Ich habe es gerade getestet.",

    painPoints: [
      "Nach Sturmereignissen suchen Hausbesitzer sofort online. Wer nicht auf Seite 1 steht, verliert diese 5.000-bis-15.000-Euro-Aufträge an den Wettbewerber, der sichtbar ist.",
      "Die meisten Dachdecker-Websites zeigen null Referenzbilder von oben. Dabei überzeugen genau diese Vorher-Nachher-Aufnahmen den Kunden, weil er das Dach selbst nie sieht.",
      "Kein Notdienst-Button auf der Startseite. Bei Sturmschäden ruft der Kunde den ersten an, den er findet. Ohne klaren 'Jetzt anrufen'-Button geht er zum nächsten Treffer.",
    ],

    killerQuestion:
      "Wenn nächste Woche Sturmwarnung ist und 200 Leute in Ihrer Region 'Dachdecker Notdienst' googeln, wie viele davon landen bei Ihnen?",

    roiArgument:
      "Ein durchschnittlicher Dachauftrag bringt 8.000 bis 15.000 Euro. Wenn die Website nur einen zusätzlichen Auftrag pro Monat bringt, sind das 100.000 Euro im Jahr. Die Website kostet weniger als ein Arbeitstag auf dem Dach.",

    seasonalTiming: {
      bestMonths: "Februar bis April (vor der Saison) und Oktober bis November (nach Herbststürmen)",
      angle:
        "Im Frühjahr: 'Die Saison startet, jetzt die Sichtbarkeit aufbauen, bevor die Anfragen kommen.' Im Herbst: 'Nach den letzten Stürmen haben viele gesucht. Waren Sie sichtbar?'",
    },

    triggerWords:
      /\b(dach|dachstein|ziegel|sturm|schiefer|flachdach|steildach|dachsanierung|dachfenster|gaube|eindeckung|blech|rinne|dachrinne|ortgang|first|dämm|aufsparren|undicht|leck)\b/i,

    auditHooks: {
      slow: "Ihre Website braucht über 6 Sekunden zum Laden. Wenn ein Hausbesitzer bei Regen ein Leck im Dach hat, wartet er keine 6 Sekunden. Der klickt den nächsten Treffer.",
      noMobile:
        "Ihre Seite ist auf dem Handy kaum bedienbar. 70 % der Notdienst-Suchen passieren vom Smartphone, direkt aus dem Haus mit dem tropfenden Dach.",
      noRanking:
        "Für 'Dachdecker [Stadt]' tauchen Sie auf Google gar nicht auf den ersten 20 Positionen auf. Ihre Konkurrenz schon. Das heißt: jede Sturm-Anfrage geht an jemand anderen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. MALER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "maler",
    label: "Maler & Lackierer",
    aliases: [
      "maler",
      "malerbetrieb",
      "malermeister",
      "maler und lackierer",
      "malerei",
      "lackierer",
      "anstrich",
    ],

    hookSatz:
      "Herr [Name], Ihre Arbeit lebt von Farbe und Wirkung. Aber Ihre Website zeigt das gerade nicht. Darf ich Ihnen zeigen, was ich meine?",

    painPoints: [
      "Maler verkaufen ein visuelles Ergebnis. Aber die meisten Maler-Websites haben entweder gar keine Bilder oder nur verwackelte Handy-Fotos ohne Vorher-Nachher-Vergleich. Der Kunde kann sich das Ergebnis nicht vorstellen.",
      "Kein klarer Unterschied zwischen Innen und Außen, Privat und Gewerbe. Der Kunde weiß nicht, ob der Betrieb sein Problem löst, und ruft jemand anderen an.",
      "Viele Maler-Seiten ranken nur für den Firmennamen. Wer 'Maler [Stadt]' oder 'Fassade streichen lassen [Stadt]' sucht, findet den Betrieb nicht.",
    ],

    killerQuestion:
      "Wenn ein Kunde seine Wohnung renovieren will und drei Maler vergleicht, wonach entscheidet er? Nach Bildern. Wie viele Referenzbilder hat Ihre Website?",

    roiArgument:
      "Ein Innenanstrich bringt 2.000 bis 5.000 Euro, eine Fassade 8.000 bis 20.000 Euro. Zwei zusätzliche Anfragen pro Monat durch bessere Sichtbarkeit bedeuten 50.000 bis 80.000 Euro Mehrertrag im Jahr. Dafür reichen oft schon gute Bilder und ein Google-Eintrag.",

    seasonalTiming: {
      bestMonths: "Januar bis März (vor Frühjahrssaison) und September bis Oktober (Fassaden vor dem Winter)",
      angle:
        "Im Winter: 'Die Auftragsbücher werden dünner, jetzt ist die Zeit, die Online-Sichtbarkeit für das Frühjahr aufzubauen.' Im Herbst: 'Fassadenanstriche laufen noch bis Oktober. Sind Sie für die letzten Wochen sichtbar?'",
    },

    triggerWords:
      /\b(maler|streichen|anstrich|farbe|fassade|putz|tapezier|lackier|innenanstrich|außenanstrich|rauhfaser|wdvs|vollwärmeschutz|gestaltung|dekorativ|spachtel|stuck|trockenbau|schimmel)\b/i,

    auditHooks: {
      slow: "Ihre Seite lädt langsam und die Bilder laden stückweise. Der erste Eindruck zählt bei einem Maler doppelt. Wenn die Website schlecht aussieht, denkt der Kunde: so wird die Arbeit auch.",
      noMobile:
        "Auf dem Handy sieht Ihre Seite zusammengestaucht aus. Genau dort scrollen Leute abends durch, wenn sie einen Maler suchen. Ohne gute mobile Darstellung verlieren Sie diese Interessenten.",
      noRanking:
        "Für 'Maler [Stadt]' und 'Wohnung streichen lassen [Stadt]' ranken Sie nicht. Das sind die Suchanfragen, über die Privatkunden ihren Maler finden.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. ELEKTRIKER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "elektriker",
    label: "Elektriker",
    aliases: [
      "elektriker",
      "elektro",
      "elektrotechnik",
      "elektroinstallation",
      "elektrofachbetrieb",
      "elektrobetrieb",
      "elektrotechniker",
      "elektroniker",
    ],

    hookSatz:
      "Herr [Name], ich habe gerade 'Elektriker Notdienst [Stadt]' gegoogelt. Wissen Sie, wer auf Platz 1 steht? Nicht Sie. Haben Sie 30 Sekunden?",

    painPoints: [
      "Elektriker-Notdienst ist ein Sofort-Geschäft. Wenn abends der Strom ausfällt, googelt der Kunde vom Handy und ruft den ersten an. Ohne mobil-optimierte Seite mit Notdienst-Nummer ist dieser Auftrag weg.",
      "Smart Home und Wallbox/E-Mobilität sind Zukunftsthemen mit hoher Marge. Aber kaum ein Elektro-Betrieb zeigt das auf seiner Website. Wer danach sucht, findet nur die großen Ketten.",
      "Viele Elektriker-Seiten sind reine Leistungslisten ohne Erklärung. Der Privatkunde versteht nicht, was der Betrieb für ihn tun kann, und ruft den nächsten an.",
    ],

    killerQuestion:
      "Wie viele Wallbox-Anfragen haben Sie dieses Jahr über Ihre Website bekommen? Denn jeder dritte Neuwagen ist elektrisch, und die Besitzer suchen alle einen Elektriker für die Installation.",

    roiArgument:
      "Eine Wallbox-Installation bringt 1.500 bis 3.000 Euro, ein Smart-Home-Projekt 5.000 bis 15.000 Euro, ein Notdienst-Einsatz 200 bis 800 Euro. Drei Wallbox-Anfragen pro Monat über die Website sind 50.000 Euro Mehrumsatz im Jahr, und diese Kunden kommen immer wieder.",

    seasonalTiming: {
      bestMonths: "Oktober bis Januar (Wallbox-Saison, nach Auto-Kauf im Herbst) und März bis Mai (Neubau/Renovierung startet)",
      angle:
        "Im Herbst: 'Die neuen E-Autos werden ausgeliefert. Die Besitzer suchen jetzt Elektriker für die Wallbox. Finden die Sie?' Im Frühjahr: 'Bausaison startet. Smart Home und PV sind die Themen. Zeigt Ihre Website das?'",
    },

    triggerWords:
      /\b(elektr|strom|sicherung|kurzschluss|wallbox|ladestation|e-auto|smart.?home|knx|photovoltaik|pv|solar|zähler|verteil|schalt|kabel|leitung|notdienst|installation|beleuchtung|led|hausstrom|wärmepumpe)\b/i,

    auditHooks: {
      slow: "Ihre Website lädt über 5 Sekunden. Wer abends bei Stromausfall einen Elektriker sucht, wartet nicht. Der nimmt den, dessen Seite sofort da ist und eine Nummer zeigt.",
      noMobile:
        "Auf dem Handy ist Ihre Telefonnummer nicht klickbar und die Seite verschoben. 80 % der Notdienst-Suchen kommen vom Smartphone. Das kostet Sie jeden Abend Aufträge.",
      noRanking:
        "Für 'Elektriker [Stadt]' und 'Wallbox installieren [Stadt]' sind Sie auf Google unsichtbar. Das sind genau die Kunden, die Geld ausgeben wollen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. SHK (Sanitär, Heizung, Klima)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "shk",
    label: "Sanitär / Heizung / Klima (SHK)",
    aliases: [
      "shk",
      "sanitär",
      "heizung",
      "klima",
      "sanitärbetrieb",
      "heizungsbauer",
      "klempner",
      "installateur",
      "haustechnik",
      "anlagenmechaniker",
      "gas wasser",
      "lüftung",
    ],

    hookSatz:
      "Herr [Name], jeder zweite Hausbesitzer will gerade seine Heizung tauschen. Wenn die 'Wärmepumpe Installateur [Stadt]' googeln, finden die Sie?",

    painPoints: [
      "Die Wärmepumpen-Nachfrage ist enorm, aber auf den meisten SHK-Websites steht nur 'Heizung'. Wer nach 'Wärmepumpe einbauen' sucht, findet Viessmann und Bosch, nicht den lokalen Betrieb.",
      "Rohrbruch, verstopftes Rohr, Heizung defekt: das sind Notfälle. Wenn die Website keine klare Notdienst-Nummer zeigt und kein 'Sofort anrufen'-Button sichtbar ist, verliert der Betrieb diese dringenden Aufträge.",
      "Die Kunden vergleichen mittlerweile online. Komplettbad-Umbau ist ein 15.000-bis-30.000-Euro-Projekt. Ohne überzeugende Bilder und Referenzen geht der Auftrag an den Betrieb, der sich besser präsentiert.",
    ],

    killerQuestion:
      "Seit dem Heizungsgesetz informieren sich Hausbesitzer online über Wärmepumpen, bevor sie den Installateur anrufen. Was findet jemand, der in [Stadt] danach sucht? Ihren Betrieb oder Ihren Wettbewerber?",

    roiArgument:
      "Ein Wärmepumpen-Einbau bringt 15.000 bis 30.000 Euro, ein Komplettbad 20.000 bis 40.000 Euro. Ein einziger zusätzlicher Wärmepumpen-Auftrag pro Quartal über die Website sind 60.000 bis 120.000 Euro Mehrumsatz im Jahr. Die Website holt sich in einem Auftrag zurück.",

    seasonalTiming: {
      bestMonths: "August bis November (Heizungssaison-Vorbereitung) und Januar bis März (Frostschäden, Rohrbrüche)",
      angle:
        "Im Herbst: 'Heizungssaison startet. Wärmepumpe ist das Thema Nr. 1. Werden die Anfragen bei Ihnen landen?' Im Winter: 'Rohrbrüche und Heizungsausfälle: jetzt suchen die Leute verzweifelt. Sind Sie auf Seite 1?'",
    },

    triggerWords:
      /\b(sanitär|heizung|wärmepumpe|klima|rohrbruch|verstopf|bad|badsanierung|komplett.?bad|dusche|wanne|boiler|warmwasser|gas|pellet|fernwärme|fußboden.?heizung|thermenwartung|abwasser|notdienst|klempner|installat)\b/i,

    auditHooks: {
      slow: "Ihre Website braucht über 7 Sekunden. Wer um Mitternacht einen Rohrbruch hat, klickt nicht den langsamsten Treffer an, sondern den schnellsten.",
      noMobile:
        "Auf dem Handy kann man Ihre Notdienst-Nummer nicht antippen. Der Kunde mit dem Wasserrohrbruch hält das Handy in einer Hand und einen Eimer in der anderen. Da muss ein Klick reichen.",
      noRanking:
        "Für 'Wärmepumpe Installateur [Stadt]' und 'Heizung tauschen [Stadt]' sind Sie nicht sichtbar. Das sind Kunden mit 20.000-Euro-Projekten, die gerade einen Betrieb suchen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. SCHREINER / TISCHLER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "schreiner",
    label: "Schreiner / Tischler",
    aliases: [
      "schreiner",
      "schreinerei",
      "tischler",
      "tischlerei",
      "möbelbau",
      "schreinermeister",
      "tischlermeister",
      "innenausbau",
    ],

    hookSatz:
      "Herr [Name], Sie bauen Einzelstücke, aber Ihre Website sieht aus wie von der Stange. Das passt nicht zusammen, oder?",

    painPoints: [
      "Schreiner machen Unikate, aber ihre Websites zeigen das nicht. Ohne hochwertige Galerie mit Detailbildern, Materialien und Fertigungsprozess kann der Kunde den Unterschied zur Ikea-Küche nicht erkennen. Warum sollte er 12.000 Euro zahlen, wenn er den Mehrwert nicht sieht?",
      "Kein Konfigurator oder Anfrageformular mit Maßangaben. Der Kunde, der eine Einbauküche oder einen Schrank nach Maß will, muss wissen, wie der Prozess läuft. Ohne klare Schritte (Beratung, Aufmaß, Entwurf, Fertigung) traut er sich nicht, anzufragen.",
      "Die Website spiegelt nicht die Qualität der Arbeit wider. Eine billig wirkende Seite neben einem 15.000-Euro-Esstisch aus Massivholz erzeugt einen Bruch. Der Kunde, der bereit ist, für Qualität zu zahlen, erwartet auch eine professionelle Außenwirkung.",
    ],

    killerQuestion:
      "Wenn ein Kunde 15.000 Euro für eine Maßküche ausgeben will und sich zwischen drei Schreinern entscheidet, welcher macht den besten ersten Eindruck? Der mit den besten Bildern online. Wie sieht Ihre Galerie aus?",

    roiArgument:
      "Eine Maßküche bringt 10.000 bis 25.000 Euro, ein begehbarer Kleiderschrank 4.000 bis 8.000 Euro. Kunden, die nach 'Schreiner Maßmöbel' suchen, haben Budget. Ein zusätzlicher Küchen-Auftrag pro Monat durch bessere Darstellung sind 150.000 bis 250.000 Euro im Jahr.",

    seasonalTiming: {
      bestMonths: "September bis November (Planungsphase für Winterumbau) und Januar bis Februar (Neujahrsvorsätze: neue Küche, neues Bad)",
      angle:
        "Im Herbst: 'Die Leute planen jetzt ihre Umbau-Projekte fürs neue Jahr. Wer online am besten aussieht, bekommt die Anfragen.' Im Januar: 'Gute Vorsätze, neues Wohnzimmer. Die Suchen nach Maßmöbeln steigen gerade. Sind Sie sichtbar?'",
    },

    triggerWords:
      /\b(schreiner|tischler|möbel|maßmöbel|einbau|küche|massivholz|furnier|oberfläche|holzart|eiche|nuss|werkstatt|cnc|einzelstück|unikat|einbauschrank|garderobe|regal|treppe|türen|innenausbau|werkbank)\b/i,

    auditHooks: {
      slow: "Ihre Bildergalerie braucht ewig zum Laden. Der Kunde will Ihre Arbeit sehen, aber er wartet nicht 10 Sekunden auf jedes Bild. Er geht zum nächsten Schreiner.",
      noMobile:
        "Auf dem Handy kann man Ihre Galerie kaum durchscrollen. Paare sitzen abends auf dem Sofa, zeigen sich gegenseitig Küchen und entscheiden dann, wen sie anrufen. Am Handy.",
      noRanking:
        "Für 'Schreiner [Stadt]' und 'Maßküche [Stadt]' finde ich Sie nicht. Das sind Kunden, die bereit sind, für handgemachte Qualität zu bezahlen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. GARTEN- UND LANDSCHAFTSBAU (GaLaBau)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "galabau",
    label: "Garten- & Landschaftsbau",
    aliases: [
      "galabau",
      "gartenbau",
      "landschaftsbau",
      "garten- und landschaftsbau",
      "gartengestaltung",
      "gärtner",
      "landschaftsgärtner",
      "gartenpflege",
    ],

    hookSatz:
      "Herr [Name], Ihre Arbeit verwandelt Gärten. Aber wenn ich 'Gartengestaltung [Stadt]' google, finde ich Sie nicht. Die Anfragen gehen gerade an andere.",

    painPoints: [
      "GaLaBau lebt von Vorher-Nachher-Bildern. Nichts überzeugt mehr als ein Foto von der kahlen Fläche neben dem fertigen Traumgarten. Die meisten Betriebe haben diese Bilder auf dem Handy, aber nicht auf der Website.",
      "Saisonale Buchungsengpässe: Im Frühjahr sind die guten Betriebe ausgebucht, im Winter steht das Telefon still. Eine Website mit Online-Anfrage und Planungskalender füllt die Auftragsbücher schon im Winter.",
      "Kein konkretes Leistungsspektrum: Pflaster, Pool, Bewässerung, Bepflanzung, Terrassenbau, Mauern? Der Kunde weiß nicht, ob der Betrieb alles aus einer Hand macht oder nur Rasen mäht.",
    ],

    killerQuestion:
      "Im Februar und März suchen Hausbesitzer ihren GaLaBauer für die Saison. Wie viele Anfragen haben Sie letztes Frühjahr über die Website bekommen? Null? Dann haben andere die Aufträge gemacht.",

    roiArgument:
      "Ein Terrassenbau bringt 8.000 bis 20.000 Euro, eine komplette Gartengestaltung 15.000 bis 50.000 Euro. Zwei Anfragen pro Monat über die Website in der Saison sind 100.000 Euro Mehrumsatz. Und die Kunden bleiben oft für die Pflege.",

    seasonalTiming: {
      bestMonths: "November bis Februar (Winter: Planungsphase vor der Saison)",
      angle:
        "Im Winter: 'Gerade planen Hausbesitzer ihre Gartenprojekte fürs Frühjahr. Wer jetzt online sichtbar ist, bekommt die Anfragen, bevor die Saison losgeht.' Im Spätsommer: 'Die nächste Saison planen die Kunden ab Oktober. Sind Sie bereit?'",
    },

    triggerWords:
      /\b(garten|terrasse|pflaster|naturstein|bepflanz|rasen|rollrasen|pool|teich|zaun|hecke|baumschnitt|baumfäll|bewässerung|mähroboter|hochbeet|sichtschutz|gartenmauer|außenanlage|landschaft|grünfläche|spielplatz|wegebau)\b/i,

    auditHooks: {
      slow: "Ihre Website lädt langsam und die Gartenbilder ruckeln rein. Der Kunde will sich inspirieren lassen, nicht warten. Pinterest und Houzz laden in unter einer Sekunde. Ihre Seite konkurriert damit.",
      noMobile:
        "Auf dem Handy sieht Ihre Seite gequetscht aus. Hausbesitzer scrollen abends auf der Couch durch Garten-Ideen. Wenn Ihre Seite am Handy schlecht aussieht, merken die sich nicht Ihren Namen.",
      noRanking:
        "Für 'Garten anlegen [Stadt]' und 'Terrassenbau [Stadt]' erscheinen Sie nicht. Das sind Kunden, die 10.000 bis 30.000 Euro in ihren Garten investieren wollen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. FLIESENLEGER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "fliesenleger",
    label: "Fliesenleger",
    aliases: [
      "fliesenleger",
      "fliesen",
      "fliesenlegermeister",
      "plattenleger",
      "fliesen- und plattenleger",
      "fliesenbetrieb",
    ],

    hookSatz:
      "Herr [Name], Bäder sind gerade das Renovierungsthema Nummer eins. Wenn jemand 'Badezimmer Fliesen [Stadt]' googelt, findet er Ihren Betrieb?",

    painPoints: [
      "Fliesenleger-Arbeit ist zu 100 % visuell. Großformatige Fliesen, Walk-in-Duschen, Mosaike: das muss man sehen, nicht lesen. Die meisten Fliesenleger-Websites haben drei unscharfe Bilder von 2018.",
      "Bathroom-Trends ändern sich ständig: XXL-Fliesen, Natursteinoptik, bodengleiche Duschen, LED-Nischen. Wer diese Begriffe nicht auf der Website hat, taucht bei den Suchen nicht auf.",
      "Kein Vertrauensaufbau: Der Kunde gibt 10.000 bis 25.000 Euro für ein neues Bad aus. Ohne Referenzen, Bewertungen und einen professionellen Auftritt traut er sich das nicht.",
    ],

    killerQuestion:
      "Ihr Kunde gibt 15.000 Euro für ein neues Bad aus. Er vergleicht drei Betriebe online. Wenn Ihre Seite nur eine Telefonnummer und eine Leistungsliste zeigt, für wen entscheidet er sich? Für den mit den Bildern.",

    roiArgument:
      "Eine Komplett-Badverfliesung bringt 5.000 bis 15.000 Euro. Gewerbeprojekte (Hotel-Lobby, Restaurant) liegen bei 20.000 bis 50.000 Euro. Ein zusätzlicher Bad-Auftrag pro Monat sind 60.000 bis 120.000 Euro im Jahr. Das holt jede Website vielfach rein.",

    seasonalTiming: {
      bestMonths: "September bis November (Badumbau-Planung für den Winter) und Januar bis März (Neujahr = Renovierungspläne)",
      angle:
        "Im Herbst: 'Badsanierungen werden über den Winter gemacht. Die Kunden suchen jetzt ihren Fliesenleger. Finden die Sie?' Im Januar: 'Neues Jahr, neues Bad. Die Suchen nach Badsanierung steigen gerade um 40 %. Sind Sie sichtbar?'",
    },

    triggerWords:
      /\b(fliese|kachel|mosaik|naturstein|bad|badsanier|dusche|bodenfliese|wandfliese|großformat|xxl|verfug|silikon|abdicht|feinsteinzeug|terrakotta|marmor|fugenlos|epoxid|bodengleich|barrierfrei)\b/i,

    auditHooks: {
      slow: "Ihre Bildergalerie lädt in Etappen. Der Kunde will ein Gefühl für Ihr Können bekommen. Wenn die Bilder ruckeln und langsam laden, denkt er: unprofessionell.",
      noMobile:
        "Auf dem Handy sieht Ihre Galerie zerquetscht aus. Paare zeigen sich gegenseitig Bad-Ideen auf dem Sofa, immer am Handy. Wenn Ihre Bilder da nicht wirken, sind Sie raus.",
      noRanking:
        "Für 'Fliesenleger [Stadt]' und 'Bad sanieren [Stadt]' finde ich Sie auf Google nicht. Das sind Kunden mit Budget, die gerade jemanden suchen.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. ZIMMERER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "zimmerer",
    label: "Zimmerer / Holzbau",
    aliases: [
      "zimmerer",
      "zimmerei",
      "zimmermeister",
      "holzbau",
      "holzbaubetrieb",
      "holzrahmenbau",
      "blockhausbau",
      "dachstuhl",
    ],

    hookSatz:
      "Herr [Name], Holzbau ist gerade das Zukunftsthema. KfW-Förderung, CO2-Bilanz, Nachhaltigkeit. Aber wenn ich 'Holzhaus bauen [Stadt]' google, finde ich Ihren Betrieb nicht. Darf ich Ihnen zeigen, was da passiert?",

    painPoints: [
      "Holzbau ist der am stärksten wachsende Bereich im Hausbau. Jedes vierte neue Wohngebäude wird in Holzbauweise gebaut. Aber die meisten Zimmerei-Websites sehen aus wie 2015 und zeigen nicht, dass der Betrieb zukunftsfähig baut.",
      "Nachhaltigkeit und CO2-Bilanz sind für Bauherren echte Entscheidungskriterien geworden. Wer das auf der Website nicht kommuniziert, verschenkt den stärksten Wettbewerbsvorteil gegenüber Massivbau.",
      "Holzbau-Projekte sind komplex und hochpreisig. Der Kunde braucht Vertrauen: Projektdokumentationen, Zeitraffer vom Aufbau, Testimonials zufriedener Bauherren. Ohne das verliert der Betrieb an die großen Fertighaus-Anbieter.",
    ],

    killerQuestion:
      "Jedes vierte neue Haus wird aus Holz gebaut. Wenn ein Bauherr 'Holzbau Zimmerei [Region]' sucht, findet er lokale Betriebe wie Ihren? Oder landet er bei Weberhaus und Schwörer?",

    roiArgument:
      "Ein Holzrahmenbau bringt 80.000 bis 200.000 Euro, ein Dachstuhl 15.000 bis 40.000 Euro, eine Aufstockung 50.000 bis 120.000 Euro. Ein einziger zusätzlicher Hausbau-Auftrag pro Jahr über die Website rechtfertigt die Investition um das Hundertfache.",

    seasonalTiming: {
      bestMonths: "Oktober bis Februar (Planungsphase für Frühjahrsbaubeginn) und Mai bis Juni (zweite Planungswelle)",
      angle:
        "Im Winter: 'Bauherren planen jetzt für das Frühjahr. Wer online professionell auftritt, bekommt die Beratungstermine.' Im Mai: 'Grundstückspreise, Förderprogramme, Nachhaltigkeit: Holzbau ist das Thema. Zeigt Ihre Website, warum Holz die bessere Wahl ist?'",
    },

    triggerWords:
      /\b(zimmer|holzbau|holzrahmenbau|dachstuhl|sparren|pfette|abbund|carport|pergola|balkon|holz.?haus|blockhaus|aufstockung|anbau|holzkonstruktion|fachwerk|brettschichtholz|bsh|kfw|nachhaltig|co2|ökologisch|massivholz.?wand|gauben|gaupe)\b/i,

    auditHooks: {
      slow: "Ihre Website lädt zu langsam. Ein Bauherr, der ein Haus für 300.000 Euro plant, erwartet einen professionellen Auftritt. Lange Ladezeit signalisiert das Gegenteil.",
      noMobile:
        "Auf dem Handy kann man Ihre Projektbilder nicht ordentlich sehen. Bauherren recherchieren mobil, zeigen dem Partner am Abend Beispiele. Wenn Ihre Seite am Handy nicht funktioniert, kommen die nie auf Sie zurück.",
      noRanking:
        "Für 'Holzbau [Region]' und 'Zimmerei [Stadt]' sind Sie nicht sichtbar. Die Bauherren, die Holz bauen wollen, suchen genau so. Und landen bei Ihrer Konkurrenz.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. GERÜSTBAUER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "geruestbauer",
    label: "Gerüstbauer",
    aliases: [
      "gerüstbau",
      "gerüstbauer",
      "gerüstvermietung",
      "gerüstverleih",
      "gerüstmontage",
      "gerüstbaufirma",
    ],

    hookSatz:
      "Herr [Name], ich sehe, dass Sie Gerüstbau machen. Wenn ein Dachdecker oder Maler in [Stadt] einen Gerüstbauer braucht und googelt, tauchen Sie da auf? Ich habe es gerade geprüft.",

    painPoints: [
      "Gerüstbau ist B2B-Geschäft: Dachdecker, Maler, Fassadenbauer, Bauunternehmen sind die Kunden. Aber die Website spricht wie ein Endkunden-Flyer. Ohne klare Angaben zu Leistungsspektrum, Lieferzeiten und Einsatzgebiet ruft der Subunternehmer jemand anderen an.",
      "Google Maps ist für Gerüstbauer überlebenswichtig. Der Dachdecker, der auf der Baustelle steht, googelt 'Gerüstbau in der Nähe'. Ohne gepflegten Google-Eintrag mit Bildern, Öffnungszeiten und Bewertungen ist der Betrieb unsichtbar.",
      "Keine Preistransparenz: Laufmeter-Preise, Standzeit, Auf-/Abbau, Fahrkosten, Sondergerüste. Der Geschäftskunde will schnell kalkulieren. Ohne diese Informationen fragt er den nächsten an.",
    ],

    killerQuestion:
      "Wenn ein Dachdecker in Ihrer Region kurzfristig ein Gerüst braucht und 'Gerüstbau [Stadt]' googelt, steht Ihre Nummer da? Oder die vom Wettbewerber?",

    roiArgument:
      "Ein Fassadengerüst bringt 2.000 bis 8.000 Euro, Großprojekte 15.000 bis 50.000 Euro. Gerüstbau lebt von Wiederkehr: der Dachdecker, der Sie einmal bucht, ruft 20 Mal im Jahr an. Ein einziger neuer Stammkunde über Google bringt 30.000 bis 80.000 Euro pro Jahr.",

    seasonalTiming: {
      bestMonths: "Februar bis April (vor der Bausaison) und August bis September (Herbst-Fassaden)",
      angle:
        "Im Frühjahr: 'Die Bausaison startet. Dachdecker und Maler suchen jetzt ihre Gerüst-Partner. Wenn die googeln, finden die Sie?' Im Spätsommer: 'Fassadensaison bis November. Sind Sie für die Subunternehmer sichtbar, die jetzt planen?'",
    },

    triggerWords:
      /\b(gerüst|rüstung|fassadengerüst|standgerüst|hängegerüst|fahrgerüst|rollgerüst|schutzgerüst|arbeitsgerüst|auf.?bau|ab.?bau|einrüst|standzeit|laufmeter|gerüstfeld|peri|layher|plettac|konsole|belag|schutzwand|fangnetz|subunternehm)\b/i,

    auditHooks: {
      slow: "Ihre Seite lädt langsam. Ein Bauleiter auf der Baustelle hat keine Zeit zu warten. Der braucht in 10 Sekunden eine Nummer und einen Eindruck. Wenn Ihre Seite das nicht liefert, ruft er den nächsten an.",
      noMobile:
        "Auf dem Handy ist Ihre Seite kaum bedienbar. Der Dachdecker steht auf der Baustelle und googelt 'Gerüstbau'. Wenn Ihre Seite am Handy nicht funktioniert, geht der Auftrag an jemand anderen.",
      noRanking:
        "Für 'Gerüstbau [Stadt]' und 'Gerüst mieten [Stadt]' finde ich Sie auf Google nicht. Das sind die Suchen, über die Subunternehmer und Bauleiter ihren Gerüstbauer finden.",
    },
  },
];

// ── Helper-Funktionen ──────────────────────────────────────────────

/**
 * Findet die passende Trade-Karte für einen Lead.
 * Vergleicht lead.trade (case-insensitive) gegen id und aliases.
 * Gibt null zurück, wenn kein Match gefunden wird.
 */
export function getTradeCard(trade: string | null | undefined): TradeCard | null {
  if (!trade) return null;
  const t = trade.toLowerCase().trim();
  if (t.length < 3) return null;
  // BESTEN Treffer wählen, nicht den ersten in Array-Reihenfolge — sonst
  // liefert ein Freitext wie "anlagenmechaniker shk" je nach Reihenfolge die
  // falsche Branchenkarte. Score nach Spezifität des Alias.
  let best: TradeCard | null = null;
  let bestScore = 0;
  for (const card of TRADE_PLAYBOOK) {
    let score = 0;
    if (card.id === t) score = 1000;
    else {
      for (const a of card.aliases) {
        if (a === t) score = Math.max(score, 900);
        // Substring nur ab Mindestlänge 4 (sonst matcht "bau" auf alles).
        else if (t.includes(a) && a.length >= 4) score = Math.max(score, 100 + a.length);
        else if (a.includes(t) && t.length >= 4) score = Math.max(score, 50 + t.length);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Ersetzt [Name] und [Stadt] im Hook-Satz.
 */
export function fillTradeHook(
  hookSatz: string,
  contactName?: string | null,
  city?: string | null,
): string {
  let s = hookSatz;
  if (contactName) {
    s = s.replace("[Name]", contactName);
  } else {
    // Wenn kein Name bekannt, generischen Anrede-Teil entfernen
    s = s.replace("Herr [Name], ", "").replace("Herr [Name],", "");
  }
  s = s.replace(/\[Stadt\]/g, city ?? "Ihrer Region");
  s = s.replace(/\[Region\]/g, city ?? "Ihrer Region");
  return s;
}

/**
 * Baut den trade-spezifischen Kontext-String für den Haiku-Prompt.
 * Wird an den /api/souffleur/suggest-Endpoint übergeben.
 */
export function buildTradeContext(card: TradeCard): string {
  return [
    `Gewerk: ${card.label}`,
    `Schmerzpunkte: ${card.painPoints.join(" | ")}`,
    `Killer-Frage: ${card.killerQuestion}`,
    `ROI: ${card.roiArgument}`,
    `Saison: ${card.seasonalTiming.angle}`,
  ].join("\n");
}
