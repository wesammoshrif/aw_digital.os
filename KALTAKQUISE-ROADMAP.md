# AW Digital OS — Kaltakquise-Pfad: Tiefenanalyse & 100%-Roadmap

_7 Multi-Agenten-Analysen (am echten Code) + Synthese · Stand 14.06.2026._

## Executive Summary

Der Kaltakquise-Pfad von AW Digital OS ist ein erstaunlich tief gebautes Solo-Cockpit: Mehr-Quellen-Lead-Finder mit ehrlichem Quellen-Status, deterministischer Website-Audit mit echten, abmahnsicheren Verkaufssignalen (Gratis-Baukasten, kein SSL, kein Impressum, altes Footer-Jahr), zweistufiger Live-Souffleur (0-ms-Regex + Haiku-Verfeinerung), 9 gewerksscharfe TradeCards mit echten ROI-Rechnungen, eine breite Einwand-Bibliothek (20+ Karten, feldgehärtet) und eine saubere deterministische Kadenz-Engine. Das ist konzeptionell Profi-Niveau und schlägt jedes generische Cold-Call-Tool.

Was fürs 100%-Niveau fehlt, ist NICHT mehr Content, sondern das VERDRAHTEN des bereits gebauten Contents und das Schließen von drei stillen End-to-End-Brüchen. Drei Befunde tauchen über mehrere Analysen hinweg deckungsgleich auf und sind die eigentliche Story: (1) Die gesamte Strategie-Engine strategies.ts (Nein-Gradienten, Micro-Commitment-Leiter, Power-Questions, Pain-Sequenzen, 8-Touch-Kadenz-Templates, Golden Rules) ist toter Code — von keiner Datei importiert, erreicht weder UI noch Haiku-Prompt. (2) Der Priorisierungs-USP (Pain-Score) wird beim Import komplett weggeworfen: jeder frische Lead startet mit painScore=null, landet ungeordnet in der Queue, website-lose Leads (die heißesten Ziele) bekommen per Filter NIE einen Score. (3) Die Termin-/Follow-up-Automatik läuft strukturell im Leeren: die Dispo 'appointment' schreibt nie eine appointments-Row, der einzige Cron findet daher dauerhaft 0 Zeilen, connectRate ist in Produktion permanent 0% (durationSec wird nie gesendet), und überfällige Wiedervorlagen werden nie eskaliert.

Netto: Das System sieht in der Mock-Demo fertig aus, leakt aber genau an den drei Stellen, die über die Termin- und Abschlussquote entscheiden — Priorisierung am Anfang, Methodik in der Mitte, Termin-Persistenz und Nachfassen am Ende. Fürs Spitzenniveau braucht es vor allem Integration statt Neubau, plus zwei echte neue Fähigkeiten (Gatekeeper/Mailbox-Skripte und ein faktenbelegter Sichtbarkeits-Check). Go-Live am 14.06.2026 ohne die P0-Punkte bedeutet: live gehen ohne Erreichungsquote, ohne Terminerinnerung und mit zufällig sortierter Queue.

## Reifegrad je Dimension

| Dimension | Reife | Urteil |
|---|---|---|
| Lead-Beschaffung & Tagesqueue-Priorisierung | **4/10** | Starke Mehr-Quellen-Beschaffung, aber der Import wirft alle Priorisierungs-Signale weg — die Queue startet blind und website-lose Top-Leads versinken dauerhaft unten. |
| Gesprächs-Einstieg & Audit-Hook (erste 10 Sekunden) | **6/10** | Robuste, gratis-fähige Hooks mit echten Signalen, aber der Opener nennt nur EINEN generischen Schmerz ohne Gewerk/Stadt, und der stärkste Handwerker-Hebel (echtes Ranking) fehlt als Datenbasis. |
| Live-Souffleur — Echtzeit-Coaching | **6/10** | Clevere zweistufige 0-ms+Haiku-Architektur, aber Tipps kommen oft zu spät (Debounce-Reset), reagieren auf Satzfragmente, kennen keine Verneinung und fallen bei WSS-Abriss still aus. |
| Einwandbehandlung, Playbooks & Abschluss-Logik | **6/10** | Breite, feldgehärtete Einwand-Bibliothek mit exzellenter Branchentiefe, aber nur EINE Closing-Karte, keine Einwand-Eskalation und die taktisch wertvollste Strategie-Datei ist toter Code. |
| Telefonie & Call-Mechanik (Asterisk/easybell/SIP) | **4/10** | Ehrliche Zwei-Wege-Strategie mit solidem Inbound-Audio-Fix, aber der Browser-Pfad ist durch Timeout-Race, fehlende Mikro-/Autoplay-Behandlung und unverifizierten Audio-Weg nicht alltagstauglich. |
| Disposition, Kadenz & Follow-up | **4/10** | Sauberer deterministischer Kadenz-Kern, aber drei strukturelle Brüche: Termine werden nie persistiert, connectRate ist immer 0%, und überfällige Wiedervorlagen versanden ohne Eskalation. |
| Cold-Call-Profi-Strategie (Elite-Methodik) | **5/10** | Profi-Methodik vollständig gebaut, aber abgeklemmt: strategies.ts erreicht den Call nie, kein Gatekeeper-/Mailbox-Skript, rein reaktives Pingpong statt geführter Terminierung. |

## Top-Lücken (nach Hebel)

**#1 [P0] Strategie-Engine (strategies.ts) ist komplett toter Code — Nein-Gradienten, Micro-Commitment-Leiter, Power-Questions, 8-Touch-Kadenz erreichen den Call nie**  
In DREI Analysen unabhängig als P0 bestätigt: grep findet 0 Consumer. Die taktisch wertvollste Methodik (reflexives vs. hartes Nein unterscheiden, Ja-Leiter zum Termin, Selbstüberführungs-Fragen) ist gebaut, aber weder im UI noch im Haiku-Prompt. Hier entsteht aus einem Hallo ein Termin — abgeklemmt bleibt das System reaktives Pingpong und die Terminquote weit unter dem, was der vorhandene Content hergibt. Reine Verdrahtungsarbeit, kein Neubau — höchster Hebel pro Aufwand.

**#2 [P0] appointment-Dispo persistiert NIE einen Termin — Reminder-Cron läuft dauerhaft im Leeren**  
Der wertvollste Moment der Akquise (der vereinbarte Termin) wird nirgends als appointments-Row gespeichert; es gibt keinen /api/appointments-Endpoint, kein Datums-Picker, applyCadence(appointmentAt) ist toter Code. Der einzige Cron selektiert nur appointments → findet in Prod 0 Zeilen. Vergessene Termine = No-Shows = direkter Verlust der mühsam erkämpften Terminquote. Blockiert den Go-Live.

**#3 [P0] Import wirft Pain-Score/Signale weg & website-lose Leads bekommen NIE einen Score — Queue startet blind**  
Der gesamte Pain-Score-USP verpufft: import/route.ts persistiert painScore/builderPlatform/rating nicht (alle null=Rang100), Select ohne ORDER BY → zufällige Reihenfolge. /api/audit/pending filtert hart auf isNotNull(website), also bekommen die KAUFWILLIGSTEN Ziele (kein Online-Auftritt) NIE einen Score und stehen nie in den Top-12. Der Berater telefoniert ungeordnet und priorisiert paradox die Betriebe mit dem geringsten Bedarf.

**#4 [P0] Audit-Hook ignoriert Gewerk+Stadt und nennt nur EINEN generischen Schmerz; echter Ranking-Check fehlt**  
Der Opener ist der einzige Hebel über den ersten Einwand. buildHook bekommt kein trade/city → klingt wie jeder Callcenter-Anruf ('Ihre Seite lädt 6s'). Die branchenscharfen tradePlaybook.auditHooks sind totes Datenfeld. Das emotional stärkste Handwerker-Argument ('Wettbewerber steht bei Google oben, Sie nicht') ist reine Behauptung ohne Datengrundlage — fliegt ein Bluff auf, ist das Gespräch tot. Größter Einzelhebel auf die Opener-Durchbruchsrate.

**#5 [P0] connectRate ist in Produktion strukturell immer 0% — der Berater fliegt blind**  
CallMode sendet nie durationSec, calls.durationSec ist immer null, connected=durationSec>0 also immer 0. Die zentrale Kaltakquise-KPI (Erreichungsquote) und avgDuration sind permanent 0. Ohne diese Zahl kann der Solo-Berater Listenqualität und Performance nicht steuern. Trivialer Fix (Timer mitschreiben), aber blockierend fürs datenbasierte Steuern.

**#6 [P0] Kein Gatekeeper- und kein Mailbox-Skript — Gespräche brechen vor dem Entscheider ab**  
Der Opener unterstellt, dass der Entscheider abhebt; bei Handwerksbetrieben ist oft Buerokraft/Frau/Geselle am Telefon. 0 Treffer für Gatekeeper-Behandlung im Playbook. Mailbox existiert nur als Klick-Dispo ohne Sprechtext, obwohl die Mehrheit der Calls dort landet. Beide sind systematische Trichter-Verluste GANZ VORNE — ohne sie sinkt die effektive Entscheider-Connect-Rate drastisch.

**#7 [P1] Nur EINE Closing-Karte, keine Closing-Techniken-Vielfalt und keine Einwand-Eskalation**  
Der kritischste Moment (Kaufsignal→fester Termin) ist mit einem Satz unterversorgt: kein Alternativ-/Trial-/Annahme-Close, keine No-Show-Prävention. Der zustandslose Matcher behandelt jeden Einwand isoliert ohne Gedächtnis — bei Vorwand-Ketten (im Handwerk die Regel) kommt der Berater nie zum echten Einwand durch. Weiche Interessenten und drehbare Gespräche gehen verloren.

**#8 [P1] Browser-Telefonie-Pfad nicht alltagstauglich: Timeout-Race, fehlende Mikro-/Autoplay-Behandlung, unverifizierter Audio-Weg**  
call() feuert nach starrem 2500ms-Timeout statt auf 'registered' → ~30% Leerläufe; kein getUserMedia-Check (blockiertes Mikro = Kunde hört nichts); Autoplay-Block nur geloggt; Audio Telefon→Browser laut Handoff selbst 'nicht final verifiziert'. Folge: der Berater fällt auf den manuellen tel:-Weg zurück, der In-App-Dialer wird nie genutzt — Durchsatz pro Stunde sinkt.

**#9 [P1] Keine echte Multi-Touch-Kadenz & überfällige Wiedervorlagen versanden ohne Eskalation**  
Die 'Kadenz' ist faktisch nur ein Re-Dial-Timer; die fertigen 8-Touch-Templates (SMS/Mail/WhatsApp) erreichen den Berater nirgends, kein automatischer E-Mail-/Audit-Touch. nextStepAt wird nur client-seitig beim Dashboard-Öffnen berechnet — macht der Berater einen Tag Pause, gibt es NULL Erinnerung. Callbacks mit zugesagtem Datum (die heißesten Leads) sind der größte stille Funnel-Leak.

**#10 [P1] Live-Souffleur: Tipps kommen zu spät, reagieren auf Satzfragmente, kennen keine Verneinung, fallen bei WSS-Abriss still aus**  
Der 800ms-Debounce wird bei jedem is_final neu armiert → bei langem Kundenmonolog feuert Haiku nie rechtzeitig; kein Endpointing/UtteranceEnd → Matcher arbeitet auf halben Sätzen; keine Negationserkennung → sichere Fehltipps ('Preis ist mir egal' triggert Preis-Einwand); kein WSS-Reconnect → stiller Totalausfall mitten im wichtigsten Call. Falsch-positive Echtzeit-Tipps sind teurer als gar keine — der Berater verliert das Vertrauen ins Tool.

**#11 [P1] Finder-Sortierung priorisiert hohes Rating statt Web-Lücke; kein Auto-Audit nach Import**  
Die Trefferliste sortiert nach 'hat Telefon' + rating absteigend — ein 4,8-Sterne-Betrieb mit perfekter Seite steht oben, ist aber der schlechteste Lead. builderPlatform/'keine Website' fließen nicht ein. Plus: nichts triggert /api/audit/pending nach Import → Priorisierung findet faktisch gar nicht statt, weil der manuelle Schritt vergessen wird. Der Berater selektiert die am wenigsten kaufwilligen Betriebe.

**#12 [P1] Kein persistiertes Transkript/Recording & keine Funnel-Conversion-Metriken — Lernschleife fehlt komplett**  
Deepgram transkribiert live, aber nichts persistiert es (nur note.trim() landet als 'transcript'); kein Recording, kein status_change-Logging, keine Übergangsraten (reached→termin→won, Show-Rate). Ohne Nachbereitung kann der Berater nicht erkennen, an welcher Stufe Leads leaken oder welche Sätze funktionieren — Quotensteigerung bleibt Bauchgefühl statt datenbasiert.

**#13 [P2] Drei nicht-atomare Dispo-Schreibvorgänge + Import-Dedup ohne Normalisierung**  
saveDispo feuert 3 ungeschützte fetches (calls sogar .catch verschluckt) → bei Netzfehler inkonsistentes Lead-Gedächtnis. Import-Dedup vergleicht exakte Strings ('Müller' vs 'Mueller') statt der normalisierten dedupKey-Logik → Doppel-Leads = peinlicher Doppelanruf (UWG-Risiko). Beide untergraben Datenqualität und Wiederaufsatz-Gespräche.

**#14 [P2] SIP-Passwort im Klartext & Cron-Endpoint offen — blockiert sicheres Online-Gehen**  
/api/sip/config liefert Trunk-Credentials als Klartext ohne Auth; CRON_SECRET ist nur optional. Für Single-User akzeptiert, aber sobald Multi-Device/Online: Trunk-Hijack-Vektor (fremde telefonieren auf Kosten/Caller-ID, easybell-Nummer wird gesperrt → Totalausfall der Akquise). Indirekt, aber harter Blocker fürs Skalieren.

## P0 — Blockierend / sofort

### Strategie-Engine strategies.ts in Live-Souffleur UND Haiku-Prompt verdrahten

**Anweisung:** strategies.ts aus dem Tot-Zustand holen: (1) In SouffleurRoom.tsx ein Coach-Panel rendern, das bei objection-Moves den passenden NEIN_GRADIENT (reflexiv/weich/hart inkl. Behandlungssatz) einblendet, 2-3 antippbare POWER_QUESTIONS als Chips dauerhaft anbietet und die MICRO_COMMITMENTS-Leiter als horizontalen Stepper zeigt. Dafür classifyNein(text) in strategies.ts ergänzen und exportieren, einen Nein-Counter im State führen. (2) Im /api/souffleur/suggest-System-Prompt GOLDEN_RULES als feste Verhaltensregeln und den erkannten Nein-Typ + aktuelle Phase/Pain-Sequenz mitgeben, damit Haiku phasengerecht und regelkonform terminiert statt generisch reagiert. Body um neinTyp/phase erweitern.

**Dateien:** `src/components/Souffleur/SouffleurRoom.tsx (Imports + Coach-Panel + Nein-Counter), src/lib/souffleur/strategies.ts (classifyNein exportieren), src/app/api/souffleur/suggest/route.ts:13-19 (SYSTEM erweitern) + :48-64 (Kontextblock)`

_Über drei Analysen als P0 bestätigt. Die methodisch wertvollsten Assets sind bereits gebaut und nur abgeklemmt — höchster Hebel pro Aufwand. Verwandelt reaktives Pingpong in geführte Terminierung; reflexive Neins (~30% drehbar) werden behandelt statt weggedrückt._

### Termin-Persistenz beim appointment-Dispo erzwingen (neuer Endpoint + Date-Picker)

**Anweisung:** Neuen Endpoint POST /api/appointments anlegen, der in die appointments-Tabelle schreibt (leadId, startsAt, title, reminderAt = startsAt - 24h, status='scheduled'). In CallMode.tsx beim Dispo-Key 'appointment' VOR dem PATCH einen Pflicht-Date-Time-Picker einblenden; das gewählte Datum an applyCadence als options.appointmentAt (Feld existiert bereits in cadence.ts:74, ist toter Code) UND an /api/appointments übergeben. Damit bekommt der stündliche Cron-Tick erstmals echten Input.

**Dateien:** `neu: src/app/api/appointments/route.ts; src/components/CallMode.tsx (saveDispo + Date-Picker-UI); src/lib/cadence.ts:74 (appointmentAt durchreichen); src/lib/store.ts (createAppointment-Helper analog createProject)`

_Schließt den größten Funnel-Leak am Pipeline-Ende: ohne diesen Fix wird KEIN vereinbarter Termin gespeichert und der einzige Cron findet in Prod dauerhaft 0 Zeilen. Vergessene Termine = No-Shows = direkter Quotenverlust. Blockiert den Go-Live am 14.06._

### Quick-Pain-Score beim Import setzen + website-lose Leads als Max-Pain behandeln + Auto-Audit triggern

**Anweisung:** Drei verbundene Fixes: (1) In import/route.ts vor dem insert quickPainScore(lead) berechnen und persistieren (start 60; keine Website -30; builderPlatform -20; rating==null -5; phoneType=='mobile' -5) und builderPlatform/rating/phoneType in leads bzw. custom-jsonb übernehmen. (2) In audit/pending/route.ts die isNotNull(website)-Bedingung aufheben: website-lose Leads NICHT überspringen, sondern direkt painScore=10 + Hook 'Sie haben aktuell keine Website…' setzen ohne runAudit; nur Leads MIT website durch runAudit. (3) Nach erfolgreichem Insert in import/route.ts fire-and-forget /api/audit/pending mit limit=Anzahl-Website-Leads triggern (oder Cron einrichten) plus Import-Toast 'X Leads werden im Hintergrund auditiert'.

**Dateien:** `src/app/api/finder/import/route.ts:74-88 (insert + quickPainScore + Post-Import-Trigger), neue Hilfsfunktion in src/lib/finder/, src/app/api/audit/pending/route.ts:38-39 + 70-77 (website-Filter aufheben), src/app/leads/finder/page.tsx:onImport (UI-Feedback)`

_Der Pain-Score-USP verpufft heute komplett: frische Leads sind ungeordnet (Rang 100), die kaufwilligsten (kein Online-Auftritt) bekommen NIE einen Score. Mit diesen Fixes ist die Queue ab Sekunde 1 sinnvoll sortiert und priorisiert endlich die heißesten Ziele in den Top-12 statt sie zu begraben._

### Audit-Hook branchen-/ortsscharf machen (trade+city in buildHook) + echten Sichtbarkeits-Check ergänzen

**Anweisung:** (1) buildHook-Signatur um {trade, city} erweitern, in runAudit mit Lead-Daten speisen (trade/city als optionale Parameter, von route.ts und pending/route.ts durchgereicht). Bei erkanntem Gewerk den passenden Satz aus tradePlaybook.auditHooks (slow/noMobile/noRanking) wählen und [Stadt] via fillTradeHook ersetzen, sodass aus 'Ihre Website lädt 6s' → 'Wer bei Regen in Mainz ein Dachleck hat, wartet keine 6 Sekunden auf Ihre Seite'. (2) Leichtgewichtigen Sichtbarkeits-Check fetchLocalVisibility in runAudit ergänzen (Google-Business-Profile-Existenz/Bewertungen via vorhandener Places-API oder SERP-Position für '[trade] [city]'), Ergebnis als Flag no_local_ranking + dediziertem Hook + Pain-Abzug -15, damit die noRanking-Behauptung faktenbelegt ist.

**Dateien:** `src/lib/audit/website.ts (buildHook :364-400, runAudit-Signatur :42-46 + Aufruf :150-155, neuer fetchLocalVisibility-Helfer), src/lib/souffleur/tradePlaybook.ts (fillTradeHook wiederverwenden), src/app/api/audit/route.ts:28 + src/app/api/audit/pending/route.ts:84-87 (trade/city übergeben)`

_Der Opener entscheidet über den ersten Einwand — der größte Einzelhebel auf die Durchbruchsrate. Ein generischer Tech-Satz triggert sofort Abwehr; Stadt+Gewerk+konkreter Ranking-Verlust durchbricht den Gatekeeper. Der echte Sichtbarkeits-Beleg verhindert, dass der Berater bluffen muss und auffliegt._

### connectRate reparieren: durationSec aus Call-Timer mitschreiben

**Anweisung:** In CallMode.tsx beim Anruf-Start (active=true / initiateSystemCall) startTs=Date.now() merken; in saveDispo durationSec=Math.round((Date.now()-startTs)/1000) berechnen und im POST /api/calls-Body mitsenden (calls/route.ts:65 nimmt body.durationSec bereits an — nur der Client liefert ihn nicht). Optional externalCallId=crypto.randomUUID() für Idempotenz.

**Dateien:** `src/components/CallMode.tsx (Timer + Body bei :117-125)`

_Trivialer Fix, aber blockierend: ohne durationSec ist connectRate/avgDuration in Produktion permanent 0%. Die zentrale Kaltakquise-KPI fehlt — der Berater kann Listenqualität und Erreichbarkeit nicht steuern und fliegt blind in den Go-Live._

### Gatekeeper- und Mailbox-Skripte ins Playbook aufnehmen

**Anweisung:** (1) Gatekeeper-Moves ergänzen (kind opener/objection oder neues kind 'gatekeeper'): Trigger 'worum gehts|in welcher angelegenheit|kann ich was ausrichten|ist nicht da|besprechung', line die kurz/sachlich mit Chef-Namensnennung + konkretem Grund durchstellen lässt, plus Move 'Rückrufzeit beim Gatekeeper sichern'. (2) Voicemail-Move mit fertigem 15-Sek-Text bauen (Nummer zweimal, konkretes Audit-Signal {hook} statt Produktwerbung, ein Satz Neugier); beim Dispo-Klick 'Mailbox' in SouffleurRoom/CallMode diesen Text groß einblenden zum Vorlesen.

**Dateien:** `src/lib/souffleur/playbook.ts (PLAYBOOK + QUICK_OBJECTIONS, neue Moves), src/components/Souffleur/SouffleurRoom.tsx + src/components/CallMode.tsx (Anzeige bei Dispo voicemail)`

_Zwei systematische Trichter-Verluste GANZ VORNE: ohne Gatekeeper-Technik bricht ein großer Teil der Gespräche ab, bevor der Pitch startet; die Mehrheit der Calls landet auf der Mailbox, ein guter Hinterlass-Text mit Audit-Signal erzeugt Rückrufe ohne mehr Anrufe._

## P1 — Hoher Hebel

### Closing-Techniken-Bibliothek ergänzen + Einwand-Eskalation mit Gedächtnis

**Anweisung:** (1) In playbook.ts 3-4 neue closing-Moves: alternativ_close ('Mittwoch oder Donnerstag?'), trial_close ('Wenn ich Ihnen zeige, dass Sie auf Seite 1 kommen — wäre das einen 15-Min-Termin wert?'), assumptive_close, no_show_prevention ('Ich schicke die Einladung jetzt, bestätigen Sie kurz?'). MICRO_COMMITMENTS Stufe 7-8 als alts wiederverwenden. (2) matchMove um objectionCount-Ref erweitern: bei zweitem/drittem Einwand eine Isolations-Frage einblenden ('Mal angenommen, X wäre gelöst — gäbe es dann noch etwas?'). vorwandKette aus testScripts.ts als Referenz.

**Dateien:** `src/lib/souffleur/playbook.ts:308-324 (closing-Block), src/lib/souffleur/matcher.ts:16 (Signatur + nextOnRepeat), src/components/Souffleur/SouffleurRoom.tsx (objectionCount-State)`

_Der kritischste Moment (Kaufsignal→Termin) ist mit einem Satz unterversorgt; abgestufte Closes terminieren weiche Interessenten. Vorwand-Ketten sind im Handwerk die Regel — ohne Eskalation kommt der Berater nie zum echten Einwand durch._

### Browser-Telefonie alltagstauglich machen: registered-Gate, Mikro-/Autoplay-Behandlung, WSS-Reconnect, Audio-Health-Indikator

**Anweisung:** (1) call() an 'registered'-Event koppeln statt setTimeout(2500): pendingCall-Number speichern, im registered-Handler auslösen (Timeout 8s mit klarer Fehlermeldung), bei registrationFailed sofort abbrechen. (2) Vor erstem call() getUserMedia({audio:true}); NotAllowedError → deutscher Fehlerzustand 'Mikrofon blockiert — bitte freigeben'; Autoplay-catch mit UI-Flag 'Ton aktivieren' verbinden, das play() nach Klick wiederholt. (3) disconnected-Handler: Reconnect mit Backoff (1/2/4s, max 5) statt terminalem error, jssip connection_recovery-Optionen setzen. (4) attachRemoteAudio Track-Count an UI geben → 'Kunde hörbar'-Indikator vor dem Sprechen.

**Dateien:** `src/components/Souffleur/SipDialer.tsx:80-88 (dialBrowser), src/lib/sip/client.ts:71-73/102-127/146-157/199-204 (registered, autoplay, getUserMedia, reconnect, audio-health)`

_Der Browser-Pfad ist heute nicht alltagstauglich (Timeout-Race ~30% Leerläufe, stumme Calls bei blockiertem Mikro/Autoplay, stiller Totalausfall bei WSS-Abriss). Ohne diese Fixes fällt der Berater auf den manuellen tel:-Weg zurück und der Durchsatz pro Stunde leidet._

### Echte Multi-Touch-Kadenz verdrahten + Cron-Eskalation überfälliger Wiedervorlagen

**Anweisung:** (1) applyCadence um channel/autoAction pro Dispo erweitern (interested → send_audit_email, voicemail → send_followup_email); FOLLOW_UP_CADENCE-Step-Templates aus strategies.ts ([Name]/[Tag] gefüllt) zurückgeben und im Lead-Detail/CallMode mit Kopier-Button für SMS/Mail/WhatsApp anzeigen; in saveDispo bei gesetzter autoAction sendEmail auslösen. (2) In cron/tick/route.ts zweiten Block: leads mit locked=false, status NOT IN (won,lost), nextStepAt überfällig selektieren und Tages-Digest an den BERATER senden ('X überfällige Wiedervorlagen, davon Y Callbacks'); nudgeSentAt-Feld gegen Spam; vercel.json um Morgen-Cron '0 7 * * *' ergänzen.

**Dateien:** `src/lib/cadence.ts:31-101 (channel/autoAction + followUpTemplate), src/components/CallMode.tsx (autoAction auslösen + UI), src/lib/email.ts (Wiederverwendung), src/app/api/cron/tick/route.ts (zweiter Block nach :116), vercel.json (zweiter Cron), src/lib/schema.ts (nudgeSentAt)`

_Cold-Call-Conversion entsteht zu großen Teilen im Follow-up (Touch 3-6); reine Telefon-Wiederholung lässt nicht-erreichte Leads kalt liegen. Callbacks mit zugesagtem Datum sind die heißesten Leads — ohne aktive Eskalation versanden genau die halb zugesagten Termine._

### Live-Souffleur-Präzision: Sprechpausen-Trigger, Negations-Guard, WSS-Reconnect

**Anweisung:** (1) 800ms-Debounce in onCustomerText ersetzen durch UtteranceEnd-Trigger: Deepgram mit utterance_end_ms=1000 & endpointing=300 konfigurieren, UtteranceEnd-Event abonnieren und erst dann Haiku-Fetch; lokaler Matcher weiter sofort auf is_final. (2) In matcher.ts vor Treffer prüfen, ob Verneinung (kein/keine/nicht/nie) im 25-Zeichen-Fenster vor dem Keyword steht → Move überspringen; optionales antiTrigger-Feld im Move-Interface. (3) WS-onclose-Reconnect für die Kunden-Pipeline (analog SIP, sichtbarer 'Verbinde neu…'-Status).

**Dateien:** `src/components/Souffleur/SouffleurRoom.tsx:293-331 (onCustomerText) + WS-URLs :203/394/492 + onclose :423-426, src/lib/souffleur/matcher.ts:16-35 (Negations-Guard), src/lib/souffleur/playbook.ts (Move-Interface antiTrigger)`

_Tipps kommen heute oft zu spät (Debounce-Reset bei Monolog), reagieren auf Satzfragmente und produzieren bei fehlender Negationserkennung sichere Fehltipps. Falsch-positive Echtzeit-Tipps sind teurer als gar keine — der Berater verliert sonst das Vertrauen und schaut nicht mehr hin._

### Finder-Sortierung auf Verkaufs-Signale umstellen + Branche aus Transkript erkennen

**Anweisung:** (1) Final-Sortierung in finder/index.ts:80-84 durch Score-Funktion ersetzen: belohne keine Website (höchste Prio), builderPlatform gesetzt, Telefon vorhanden, mobil>Festnetz; rating NUR als schwacher Tiebreaker und in Kaufwilligkeit (niedriges Rating = mehr Bedarf); optional Gewerk-Gewicht (dachdecker/shk/galabau hoch). (2) detectTradeFromTranscript(text) in tradePlaybook.ts, das TRADE_PLAYBOOK.triggerWords gegen das Kunden-Transkript matcht (längster Match) und als Override greift, wenn getTradeCard(lead.trade) null liefert; tradeCard in SouffleurRoom von useMemo auf State umstellen.

**Dateien:** `src/lib/finder/index.ts:80-84 (Sortier-Score), src/lib/souffleur/tradePlaybook.ts (detectTradeFromTranscript, nutzt vorhandene triggerWords), src/components/Souffleur/SouffleurRoom.tsx:113-123`

_Heute steht ein 4,8-Sterne-Betrieb mit perfekter Seite oben — der schlechteste Lead. Schon die Trefferliste muss die richtigen Leads zeigen. Und der stärkste Termin-Hebel ('der kennt meine Branche') greift sonst genau bei unsauberen Lead-Daten nicht._

### Phasen-Awareness im Matcher + 3-teiliger Profi-Opener

**Anweisung:** (1) matchMove um optionalen phase-Parameter (einstieg/grund/qualifizierung/nutzen/abschluss) erweitern und closing-Moves nur freischalten, wenn vorher eine Qualifizierungsfrage lief; SouffleurRoom hält phase-State der mit Micro-Commitments mitwandert. (2) opener-line in playbook.ts auf Muster Pattern-Interrupt + Grund + Erlaubnis bringen ('Habe ich Sie ungelegen erwischt?' → konkreter Grund mit {hook} → explizite 60-Sek-Erlaubnis); MICRO_COMMITMENTS Stufe 1 als ersten Chip; gewerksspezifischen hookSatz als Grund-Override.

**Dateien:** `src/lib/souffleur/matcher.ts (phase-Parameter + Gate-Logik), src/components/Souffleur/SouffleurRoom.tsx (phase-State), src/lib/souffleur/playbook.ts (opener line/alts + strategies.ts MICRO_COMMITMENTS)`

_Ohne Phasenführung passiert zu früher Termin-Push oder Stecken in der Einwand-Schleife. Die ersten 7 Sekunden entscheiden über Abbruch — ein expliziter Erlaubnis-/Grund-Opener hebt jede nachgelagerte Quote._

### Audit-Befund und Branchen-Hook im Souffleur zu EINEM Opener mergen + SEO-Fails in Fallback-Hook gießen

**Anweisung:** (1) Merge-Funktion: tradeCard.hookSatz als Frame, konkreten lead.auditHook als Beweis-Halbsatz einsetzen statt beide getrennt anzuzeigen; kombinierten Satz im großen Opener-Feld rendern, 'Branchen-Einstieg'-Box nur als Alternative. (2) Wenn buildHook sonst auf generischen Fallback fällt, stattdessen schwerwiegendsten SEO-Fail aus dem seo-Report verbalisieren (fehlendes LocalBusiness-JSON-LD → 'Google erkennt nicht, dass Sie ein lokaler Betrieb sind'); seo an buildHook durchreichen.

**Dateien:** `src/components/Souffleur/SouffleurRoom.tsx:125-128/117-123/795-800/836-845 (Merge), src/lib/audit/website.ts (buildHook-Signatur + Fallback-Zweig :393-399, seo durchreichen)`

_Zwei konkurrierende Einstiegssätze nebeneinander laden dem Berater Entscheidungslast in der Sekunde auf, in der Schlagfertigkeit zählt. Der nichtssagende Callcenter-Standardsatz greift bei jeder technisch okayen Seite und verschenkt die SEO-Fails als Munition._

## P2 — Politur

### Gesprächs-Audio + Deepgram-Transkript persistieren und Post-Call-Summary verdrahten

**Anweisung:** (1) Im SIP-'confirmed'-Event MediaRecorder auf Remote+Local-Tracks setzen (oder mind. das Live-Transkript sammeln) und beim ended/Dispo an /api/calls als echtes transcript senden statt note.trim(). (2) In disposition() VOR window.close() fire-and-forget /api/souffleur/summary (existiert, ist toter Endpoint) mit Transkript aufrufen oder besser per postMessage im Opener triggern; nextStep als Aufgabe/Rückruf am Lead speichern.

**Dateien:** `src/lib/sip/client.ts:183-210, src/components/Souffleur/SouffleurRoom.tsx:411-421 + disposition :662-672, src/components/CallMode.tsx:117-125, summary/route.ts (existiert)`

_Ohne persistiertes Transkript/Summary gibt es keine Lernschleife (Einwände nachhören, Pitches vergleichen) und der nächste Schritt landet nicht im CRM — Folgetermine werden vergessen, Pipeline leckt nach dem Call._

### Funnel-Conversion-Tracking: status_change loggen + Übergangsraten berechnen

**Anweisung:** In /api/leads/[id]/route.ts bei jeder status-Änderung zusätzlich activity type='status_change' mit payload {from,to} schreiben (Enum existiert in schema.ts:48, wird nirgends geschrieben). funnelStats() in store.ts ergänzen: Übergangsraten (reached→audit_sent→proposal→won), Ø-Versuche-bis-erreicht, Termin-Show-Rate (appointments done vs scheduled); auf dem Dashboard anzeigen.

**Dateien:** `src/app/api/leads/[id]/route.ts (nach update :56), src/lib/store.ts (funnelStats), src/app/page.tsx (Anzeige)`

_Ohne Funnel-Conversion sieht der Berater nicht, an welcher Stufe Leads leaken (viele Termine, wenige Abschlüsse) — Skript/Angebot bleiben Bauchgefühl statt datenbasiert optimierbar._

### Dispo-Schreibvorgang transaktional/idempotent + Import-Dedup normalisieren

**Anweisung:** (1) Einen Endpoint POST /api/calls/dispo bauen, der Lead-Update + Activity + Call-Insert serverseitig in einer Drizzle-Transaktion ausführt; CallMode macht nur noch einen fetch; externalCallId als Idempotenzschlüssel. (2) Import-Bestands-Dedup von exaktem company-Vergleich auf den normalisierten dedupKey (lowercased + letzte 9 Telefonziffern) umstellen — dedupKey aus finder/index.ts:21-31 exportieren und wiederverwenden.

**Dateien:** `neu: src/app/api/calls/dispo/route.ts, src/components/CallMode.tsx:86-125, src/app/api/finder/import/route.ts:55-72, src/lib/finder/index.ts:21-31 (export)`

_Nicht-atomare fetches verfälschen Statistik und Lead-Gedächtnis bei Netzfehlern; exakt-string-Dedup importiert Dubletten ('Müller'/'Mueller') → peinlicher Doppelanruf und UWG-Risiko._

### Handelsregister-Neugründungen als Live-Trigger freischalten + E.164-Normalisierung fixen

**Anweisung:** (1) Sofern lizenzrechtlich geklärt, in finder/page.tsx SOURCES handelsregister auf enabled:true; Neugründungs-Leads beim Import mit Timing-Bonus (niedrigerer Quick-Pain) und passendem auditHook ('Glückwunsch zur Eintragung…') versehen (Adapter ist fertig). (2) Toten E.164-Verzweigungscode in client.ts:136-143 durch echte Normalisierung ersetzen (+49→0049, führende 0 für Inland behalten, toten else-Zweig entfernen) und mit Unit-Tests absichern.

**Dateien:** `src/app/leads/finder/page.tsx:61, src/app/api/finder/import/route.ts (Timing-Bonus), src/lib/sip/client.ts:136-143 (+ Tests)`

_Neugründung ist laut eigenem Kommentar das conversion-stärkste Trigger-Signal (akuter Website-Bedarf), heute im Standard-Flow gesperrt. Fehlerhafte Nummern-Normalisierung produziert Fehlwahlen, die fälschlich als no_answer dispositioniert werden._

### Latenz-Tuning, statischen Haiku-Fallback entfernen, Redeanteil situativ machen

**Anweisung:** (1) rec.start(250)→100 reduzieren, nova-3 + no_delay=true testen (A/B mit Testskripten, Zeit step.text→Tipp loggen). (2) suggest/route.ts:69-74 statischen Fallback streichen → bei leerem Haiku-Output line:null; Client nur dann setAiLine wenn res.line nicht leer (lokaler Tipp bleibt sichtbar). (3) Redeanteil von String-Länge auf 60s-Ringpuffer mit Wortzahl oder Audio-aktiv-Zeit über den AnalyserNode umstellen.

**Dateien:** `src/components/Souffleur/SouffleurRoom.tsx (rec.start, WS-URLs, Redeanteil :1027-1068), src/app/api/souffleur/suggest/route.ts:69-76`

_~150-250ms weniger Grundlatenz pro Tipp; der irreführende generische 'KI-Tipp' untergräbt sonst das Vertrauen; das 'du redest zu viel'-Signal ist heute strukturell verzerrt (Daueralarm oder nie) und damit nutzlos._

### DTMF/Mute/Call-Timer im Call + Mockup-Teaser im Opener

**Anweisung:** (1) In EasybellSipClient sendDTMF(tone) und setMute(bool) exportieren; in SipDialer während in-call ein DTMF-Keypad (für Telefonmenüs größerer Betriebe), Mute-Toggle und mitlaufenden Sekunden-Timer rendern; RecordingBars an echten in-call-State binden. (2) Wenn für den Lead ein Mockup existiert/generierbar ist, dem Hook optional einen Neugier-Halbsatz anhängen ('…ich habe Ihnen in 2 Minuten skizziert, wie das aussehen könnte').

**Dateien:** `src/lib/sip/client.ts (sendDTMF/setMute), src/components/Souffleur/SipDialer.tsx (in-call-UI), src/lib/audit/website.ts (buildHook) oder SouffleurRoom :795-823, leads/[id]/page.tsx:233-240`

_Ohne DTMF endet der Call im Telefonmenü größerer Betriebe in der Sackgasse; Mute/Timer heben das Tool von Prototyp auf Profi-Dialer. Der Mockup-Teaser verwandelt den Problem-Opener in einen Neugier-Opener und erleichtert den Termin-Close._

### Cron absichern und SIP-Credentials hinter Auth-Gate (vor Online-Gang)

**Anweisung:** (1) CRON_SECRET zur Pflicht machen (503 bei fehlendem Secret statt offen); Termin-Reminder zusätzlich an den Berater senden, zweiten Reminder-Slot (1h vorher) vorsehen, mittelfristig SMS-Kanal analog email.ts. (2) Vor Multi-Device/Online einen Auth-Check (Supabase-Session) vor /api/sip/config schalten und kurzlebige Credentials/ephemeres Token statt Klartext-Trunk-Passwort ausliefern.

**Dateien:** `src/app/api/cron/tick/route.ts:22-25 + 94-98, vercel.json, src/app/api/sip/config/route.ts:5-7/12/21-43`

_Offener Cron-Endpoint ist Spam-/Betriebsrisiko; E-Mail-only-Reminder an Handwerker (lesen spät) senkt die Show-Rate. Das Klartext-SIP-Passwort ist ein Trunk-Hijack-Vektor, der das sichere Online-Gehen blockiert (Kapern der easybell-Nummer = Totalausfall der Akquise)._

## Die stärksten Conversion-Hebel

- **Strategie-Engine (strategies.ts) in Call und Haiku-Prompt verdrahten — Nein-Gradienten, Micro-Commitment-Leiter, Power-Questions** — Höchster Hebel pro Aufwand: die Methodik, die aus einem Hallo einen Termin macht, ist bereits gebaut und nur abgeklemmt. Verwandelt reaktives Einwand-Pingpong in geführte Terminierung; reflexive Neins (~30% drehbar) werden behandelt statt weggedrückt. Reine Verdrahtung, kein Neubau.
- **Pain-Score-Priorisierung end-to-end reparieren — Quick-Score beim Import, website-lose Leads als Max-Pain, Auto-Audit** — Der Kern-USP des Systems greift heute gar nicht: die Queue ist zufällig sortiert und die kaufwilligsten Leads (kein Online-Auftritt) versinken dauerhaft. Repariert telefoniert der Berater die heißesten Leads zuerst → mehr Termine pro Stunde aus denselben Anrufen.
- **Branchen-/ortsscharfer Audit-Hook plus echter Sichtbarkeits-Beleg statt generischem Tech-Satz** — Der Opener entscheidet über den ersten Einwand — der einzige Hebel, der den Gatekeeper-Reflex durchbricht. Stadt+Gewerk+faktenbelegter Ranking-Verlust klingt nach echtem Anliegen statt Callcenter und übersteht den ersten 'Haben schon Website'-Einwand.
- **Termin-Persistenz + Multi-Touch-Follow-up + Wiedervorlagen-Eskalation schließen den Pipeline-Leak nach dem Call** — Cold-Call-Conversion entsteht zu großen Teilen im Follow-up (Touch 3-6) und im vereinbarten Termin. Heute werden Termine nie gespeichert/erinnert (No-Shows) und Callbacks versanden still — genau die halb zugesagten, heißesten Leads. Schließt den größten stillen Funnel-Verlust.
- **Gatekeeper- und Mailbox-Skripte plus alltagstaugliche Browser-Telefonie heben die effektive Connect-Rate zum Entscheider** — Gespräche brechen heute oft ab, bevor der Pitch startet (Sekretariat) oder enden tonlos auf der Mailbox; der Browser-Dialer ist durch Timeout-Race und stumme Calls unbenutzbar. Mehr erreichte Entscheider und mehr Rückrufe = mehr Pitches überhaupt = breitere Terminbasis.
