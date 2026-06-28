# SYSTEM-AUDIT — AW Digital OS (Cold-Call-Cockpit)

Stand: 28.06.2026 · Read-only-Audit · Belege als Datei:Zeile · Synthese aus 5 Domänen-Readern, gegengeprüft am Quellcode.

---

## 1. Überblick — wofür das System da ist

AW Digital OS ist das interne Cockpit, mit dem ein einzelner Cold-Caller (17 J.) Handwerksbetriebe abtelefoniert, um ihnen eine ~2.000-€-Website zu verkaufen. Der Umsatz-Pfad ist eine gerade Linie:

**Lead finden → anrufen (mit KI-Souffleur) → Disposition → Termin → Verkauf → Projekt → Rechnung/Wartung (MRR).**

Stack: Next.js 16 (App Router, force-dynamic), React 19, Drizzle + Supabase-Postgres mit RLS, Tailwind v4. Telefonie über JsSIP gegen eine eigene Asterisk-Brücke (Hostinger-VPS), die den easybell-Trunk registriert. Live-Transkription via Deepgram (nova-3 DE), Live-Tipps + Post-Call-Summary via Claude Haiku 4.5. E-Mail über Resend. Multi-User mit Rollen (admin/agent/pending), Auth über Supabase. Self-Host per Docker (App + Caddy + Cron-Sidecar), **kein Vercel**.

Architektur-Grundprinzip (wichtig fürs Verständnis aller Befunde): **RLS schützt nur Lesezugriffe.** Alle Inserts/Updates/Deletes laufen über eine Superuser-DB-Connection, die RLS umgeht — der Owner-Schutz (IDOR) wird manuell in jeder API-Route nachgebaut (`eq(leads.ownerId, user.id)`, z. B. `src/app/api/calls/route.ts:55-58`). Das ist konsequent durchgezogen, aber jede vergessene Owner-Prüfung wäre sofort ein Datenleck.

Zweites Grundprinzip: **Mock-Modus.** Ohne `DATABASE_URL` antworten fast alle Routen mit `{ok:true, mock:true}` statt zu schreiben (`src/lib/mode.ts`, `src/app/api/calls/route.ts:37-39`). Im Dev erlaubt das Demo ohne Secrets; in Produktion bricht der Boot fail-closed ab, wenn Supabase/DB fehlen (`src/instrumentation.ts:9-37`).

---

## 2. Systemkarte (Modul · Status · Datenfluss)

Legende: ✅ funktioniert · 🟡 halb/abhängig von Key · ⚫ tot/stumm

### 2.1 Oberfläche (Seiten)

| Modul | Status | Beleg | Datenfluss |
|---|---|---|---|
| Dashboard `/` | ✅ | `src/app/page.tsx:1-450` | liest `dashboardSummary()`, `listCallsWithContext()` |
| Sidebar (11 Links + Settings) | ✅ | `src/components/Sidebar.tsx:1-202` | Streak live aus calls |
| Leads-Liste `/leads` | ✅ | `src/app/leads/page.tsx` | `listLeads({limit:500})` |
| Lead-Detail `/leads/[id]` | ✅ | `src/app/leads/[id]/page.tsx:1-289` | getLead, Activities, Project, Audit-Payload |
| Lead neu `/leads/new` | ✅ | `src/app/leads/new/page.tsx` | → `POST /api/leads` |
| Leads-Finder `/leads/finder` | 🟡 | `src/app/leads/finder/page.tsx:1-753` | OSM frei + Google Places (Key) |
| Anrufe `/anrufe` | ✅ | `src/app/anrufe/page.tsx` | `listCallsWithContext()` |
| Pipeline `/pipeline` | ✅ | `src/app/pipeline/page.tsx:1-162` | Kanban aus listLeads |
| Projekte `/projects` + Detail | 🟡 | `src/app/projects/[id]/page.tsx:1-292` | Task-UI ist Skeleton (siehe 2.4) |
| Termine `/termine` | ✅ | `src/app/termine/page.tsx:1-183` | listAppointmentsWithLead |
| Finanzen `/finances` | ✅ | `src/app/finances/page.tsx:1-229` | listQuotes / listRechnungen |
| Audits `/audits` + `/audits/run` | 🟡 | `src/app/audits/run/page.tsx:1-347` | → `POST /api/audit` (PageSpeed-Key optional) |
| Mockups `/mockups` | ✅ | `src/app/mockups/page.tsx:1-129` | lokale TEMPLATES |
| Mockups-Preview `/mockups/preview/[id]` | ✅ | **verifiziert**: ist nur ein `redirect()` auf `/mockups/[id]` — `src/app/mockups/preview/[id]/page.tsx:1-10` | kein eigener Inhalt |
| Trigger-Feed `/triggers` | 🟡 | `src/app/triggers/page.tsx:1-228` | nur Handelsregister real (siehe 2.3) |
| Einstellungen `/settings` | 🟡 **lügt** | `src/app/settings/page.tsx:1-140` | siehe Abschnitt 4 |
| Team `/team` | ✅ | `src/app/team/page.tsx` | Admin-only |
| Scrape `/scrape` | 🟡 | `src/app/scrape/page.tsx:1-151` | → OSM, DB optional |
| Auth: `/login` ✅, `/pending` ✅ | ✅ | `src/app/login/page.tsx:1-88` | Supabase signIn |
| Auth: `/signup`, `/forgot-password` | 🟡 zu verifizieren | nur im Glob gesehen, Inhalt nicht gelesen | — |

### 2.2 KI / Echtzeit (Souffleur + Telefonie)

| Modul | Status | Beleg |
|---|---|---|
| SIP-Softphone (JsSIP → Asterisk) | ✅ | `src/lib/sip/client.ts:46-310`, `src/app/api/sip/config/route.ts:15-32` |
| Asterisk-Brücke (VPS) | ✅ live seit 24.06. | `voip-bridge/`, `src/app/api/sip/config/route.ts` |
| Deepgram STT (Berater + Kunde) | 🟡 | `src/components/Souffleur/SouffleurRoom.tsx:383-544, 832-951`; `deepgram-token/route.ts:19-73` |
| Claude Haiku Live-Tipps (streaming) | ✅ | `src/app/api/souffleur/suggest/route.ts:1-260` |
| Post-Call-Summary (Haiku JSON) | ✅ | `src/app/api/souffleur/summary/route.ts:1-87` |
| Call-Speicherung (Upsert via externalCallId) | ✅ | `src/app/api/calls/route.ts:74-109` |
| Lokaler Playbook-Matcher (Fallback ohne KI) | ✅ | `src/lib/souffleur/matcher.ts` |

### 2.3 API-Schicht (Auswahl, alle hinter requireAuth + approved)

`POST /api/leads` ✅, `PATCH/DELETE /api/leads/[id]` ✅ (Auto-Projekt bei `won`, `route.ts:74-92`), `POST /api/calls` ✅, `POST /api/audit` ✅ + `/api/audit/pending` ✅, `POST /api/finder` ✅ + `/import` ✅, `POST /api/scrape/osm` ✅, `POST /api/appointments` ✅, `POST /api/invoices` ✅ + `/convert` ✅, `POST /api/cron/tick` ✅, `POST /api/emails/send` 🟡 (No-Op ohne Key), `GET /api/ai/strategy` ✅ (**verifiziert**: Haiku, liest dashboardSummary, `src/app/api/ai/strategy/route.ts:1-54`), Admin-Routen `agent-review`/`users` ✅, GDPR `export` ✅.

### 2.4 Datenschicht (Tabellen)

| Tabelle | Status | Beleg / Befund |
|---|---|---|
| `leads` | ✅ Primär | `src/db/schema.ts:110-163` |
| `calls` | ✅ | `schema.ts:188-209`; Upsert-Pattern |
| `audits` | ✅ | `schema.ts:233-265`; schreibt painScore zurück in Lead |
| `invoices` | ✅ | `schema.ts:358-400`; Angebot→Rechnung-Conversion live |
| `appointments` | ✅ | `schema.ts:211-231`; reminderSentAt = Idempotenz |
| `agent_reviews` | ✅ | `schema.ts:476-497`; Admin-only |
| `activities` | 🟡 Event-Spine teilweise | siehe Abschnitt 3.1 — **Reader-Korrektur** |
| `trigger_events` | 🟡 | nur Handelsregister real; foerderung/hwk_press/ssl_expired/news_alert sind toter Enum (`schema.ts:267-293`); `processedAt` nie gesetzt |
| `projects` + `tasks` | 🟡 | `schema.ts:296-356`; **`tasks` wird NIE geschrieben** — keine API legt Tasks an, Task-UI ist Anzeige-Skelett |
| `scrape_runs` | 🟡 | `schema.ts:403-419`; nur Logging, nie gelesen/angezeigt |
| `settings` | ⚫ tote Tabelle | `schema.ts:421-445`; **nie geschrieben**; Anruf-Rampe (25/+10/14d/100) ist hartcodierter Default in `getStreak`, `rampStartedAt` nie gesetzt |
| `profiles` | ✅ | `schema.ts:452-473`; 1:1 mit auth.users, SIP-Config pro User |

---

## 3. DISCONNECT-INVENTAR — Module, die Daten teilen sollten, aber nicht reden

### 3.1 Activities-Event-Spine: nur halb verdrahtet — (Schweregrad: MITTEL)
**Reader-Korrektur:** Der Datenschicht-Reader behauptete „Calls werden NICHT als activity protokolliert". **Das stimmt nicht.** `CallMode.tsx:129-142` postet bei jeder Dispo eine `type:"call"`-Activity, und der Endpoint akzeptiert sie (`src/app/api/leads/[id]/activities/route.ts:6-16, 70-79`). Calls und E-Mails landen also sehr wohl in der Timeline.
**Der echte Disconnect:** **Audits, Trigger und Status-Changes** werden NICHT als Activity geloggt, obwohl der Enum die Typen `audit`, `proposal`, `contract`, `status_change` kennt (`activities/route.ts:6-16`). Ein Audit schreibt in `audits` + `leads`, taucht aber nie in der Lead-Timeline auf. Wer ein Lead-Detail öffnet, sieht „Audit Pain-Score 18", aber in der Chronologie keinen Eintrag „wann wurde auditiert". Impact: die Timeline ist als Verkaufs-Gedächtnis lückenhaft — beim Rückruf fehlt dem Caller der vollständige Verlauf.

### 3.2 E-Mail-Versand ↔ Settings-Status: zwei verschiedene Anbieter — (Schweregrad: HOCH für Vertrauen, NIEDRIG für Umsatz)
Der reale Versand läuft über **Resend** (`RESEND_API_KEY`, `src/lib/email.ts:19-46`; `.env.example:61`). Die Settings-Seite prüft aber **`BREVO_API_KEY`** und zeigt „Brevo · Verbunden" (`src/app/settings/page.tsx:20,35`). `BREVO_API_KEY` existiert **nirgends sonst im Code** und steht nicht in `.env.example` (verifiziert per Grep — nur 1 Treffer, die Settings-Datei). Die UI redet von Brevo, das System nutzt Resend. Niemand kann über Settings den E-Mail-Status korrekt ablesen.

### 3.3 calls.summary/sentiment ↔ KI-Feedback-Loop: Sackgasse — (Schweregrad: NIEDRIG, aber strategisch)
Transkripte, Summaries und Sentiment werden in `calls` gespeichert (`calls/route.ts:87-103`), aber **nie zur KI zurückgespeist**. Keine Erfolgsquoten-Analyse, keine automatische Playbook-Anpassung, kein Clustern gescheiterter Einwände. Das Playbook (`src/lib/souffleur/playbook.ts`) ist statisch; neue Moves müssen von Hand ergänzt werden. Der einzige Konsument der Transkripte ist das manuelle Admin-Coaching (`agentReview.ts`). Das System lernt nicht aus seinen eigenen Anrufen.

### 3.4 Wartungs-Umsatz (MRR) ↔ Cron: nicht verbunden — (Schweregrad: HOCH, direkter Umsatz) — *vom Prüfer präzisiert*
**Korrektur zur Erstfassung:** Die Dashboard-MRR-Zahl wird NICHT aus `invoices` berechnet, sondern aus `leads.maintenance` für `won`-Leads (`store.ts:600-602`). Die KPI zeigt also korrekt MRR, sobald bei einem gewonnenen Lead ein monatlicher Wartungsbetrag eingetragen ist — sie hängt nicht an erzeugten Rechnungen.
**Der echte Disconnect:** Es werden **keine wiederkehrenden Wartungs-RECHNUNGEN automatisch erzeugt**. Der Cron, der das monatlich tun müsste, ist ein **expliziter TODO** und erzeugt bewusst NICHTS (`src/app/api/cron/tick/route.ts:143-150`), weil das Feld `leads.maintenanceIntervalMonths` fehlt. Heißt: die MRR-Zahl steht da, aber die tatsächliche Rechnungsstellung (und damit das Geld) passiert nur, wenn jemand jede Rechnung von Hand anlegt. Der Abrechnungs-Automat hinter dem MRR ist unverdrahtet.

### 3.5 Termin-Reminder per SMS ↔ kein SMS-Backend — (Schweregrad: MITTEL)
Settings bewirbt „Termin-Reminder (SMS) 24 h vorher via seven.io" (`settings/page.tsx:73-76`). Der Cron versendet aber ausschließlich **E-Mail** (`cron/tick/route.ts:126-130`). `SEVEN_API_KEY` wird nirgends gelesen (Grep: nur Settings). Der SMS-Reminder ist eine Behauptung ohne Implementierung; der Toggle steht passend dazu auf „aus".

### 3.6 settings-Tabelle ↔ Settings-UI: kein Schreibpfad — (Schweregrad: NIEDRIG)
Die Settings-Seite zeigt Rampe und Automatik-Toggles, aber kein Toggle schreibt irgendwohin (`settings/page.tsx` — reine Anzeige, IOSSwitch ohne onChange-Handler), und die `settings`-Tabelle wird nie beschrieben (Abschnitt 2.4). Was hier umgelegt wird, hat keinen Effekt.

---

## 4. ERGIBT KEINEN SINN — Inkohärenzen, Widersprüche, lügende Features

**4.1 Die Integrations-Liste ist zur Hälfte eine Fassade.** Settings listet 10 Services. Fünf davon — **Brevo, seven.io, Stripe, SignWell, easybill** — sind im gesamten Codebase NUR in `settings/page.tsx:20-24,35-39` referenziert (per Grep verifiziert). Keine Route, keine lib, kein `.env.example`-Eintrag benutzt sie. „Stripe · Anzahlung + Wartung", „SignWell · E-Signatur", „easybill · ZUGFeRD" sind UI-Versprechen ohne eine Zeile Backend. Für einen 17-jährigen Operator, der sich auf diese Statusanzeige verlässt, ist das irreführend: „Verbunden" kann hier nie erscheinen, „Einrichten" führt ins Leere.

**4.2 „Brevo verbunden" wäre eine Lüge in beide Richtungen.** Selbst wenn jemand `BREVO_API_KEY` setzt, würde Settings „Brevo verbunden" zeigen, während E-Mails weiter über Resend (oder gar nicht) gehen. Status-Anzeige und realer Pfad sind entkoppelt.

**4.3 Deepgram: kein Klartext-Grund, aber NICHT „still tot" — *vom Prüfer korrigiert*.** Die Erstfassung war zu hart. Fakt: `/auth/grant` für Kurzzeit-Tokens braucht einen **Owner/Admin-Key**; ein Member-Key gibt 403 (`deepgram-token/route.ts:34-50`). ABER: (a) das UI zeigt sehr wohl einen Status „Key fehlt" (`SouffleurRoom.tsx:471-473, 2440-2441`), es ist also nicht unsichtbar; (b) in Produktion steht `DEEPGRAM_ALLOW_RAW_KEY=true`, daher fällt der Endpoint auf den Roh-Key zurück und die Kunden-Transkription **läuft** (`route.ts:56-61`). Das echte Manko ist kleiner: der konkrete Grund (Owner-Key nötig) wird dem Operator nie erklärt — nur ein generisches „Key fehlt", ohne Handlungsanweisung. (Sicherheits-Kehrseite des Raw-Key-Fallbacks siehe Abschnitt 5 / Backlog #1.)

**4.4 Trigger-Feed verspricht 5 Quellen, liefert 1.** Die `/triggers`-Seite zeigt „Aktive Feeds": Neugründungen, Förderprogramme, HWK-Presse, SSL-Ablauf, Pressespiegel + eine Conversion-Multiplikator-Tabelle (Förderung 8×). Implementiert ist nur Handelsregister-Neugründungen (`src/app/api/triggers/handelsregister/route.ts`). Die anderen vier sind toter Enum (Abschnitt 2.4). Die „8×-Förderung" ist Marketing-Text ohne Datenquelle.

**4.5 DELETE-Lead zerstört Steuerdaten.** `DELETE /api/leads/[id]` kaskadiert per Schema auf activities, calls, appointments, projects, **invoices** (`src/app/api/leads/[id]/route.ts:100-138`). Als „DSGVO Art. 17" gedacht, löscht es aber auch Rechnungen, die §147 AO 10 Jahre aufbewahrt werden müssen. DSGVO-Recht-auf-Löschung und steuerliche Aufbewahrung kollidieren ungelöst.

**4.6 Anruf-Rampe ist Deko.** Settings zeigt „Start 25, +10 alle 14 Tage, max 100" als gepflegte Konfiguration. Es sind hartcodierte Konstanten; `rampStartedAt` wird nie gesetzt, die `settings`-Tabelle nie geschrieben (Abschnitt 2.4, 3.6). Das Tagesziel „rechnet sich selbst" — aber nicht aus dieser scheinbaren Konfiguration.

---

## 5. FEHLT — Lücken

- **Recurring-Maintenance-Rechnungen** (MRR-Motor) — Feld + Cron-Logik fehlt (3.4).
- **Task-Anlage** — `tasks`-Tabelle existiert, kein Schreibpfad, kein UI-Button (2.4).
- **SMS-Versand** — beworben, kein Backend (3.5).
- **KI-Lernschleife** — Transkripte werden gespeichert, nie ausgewertet (3.3).
- **Audit/Trigger/Status-Change in der Activity-Timeline** (3.1).
- **Stripe/Zahlungen, E-Signatur, ZUGFeRD-Rechnung** — beworben, nicht gebaut (4.1).
- **Calendar-/ICS-Integration** — `appointments.icsUid` ist Platzhalter, nie gesetzt.
- **TLS-Pinning / Verschleierung der SIP-Credentials** — Username+Passwort gehen im Klartext-JSON an den Browser (`src/app/api/sip/config/route.ts:21-43`), sichtbar im DevTools-Network-Tab. Nur durch `requireAuth` geschützt, nicht verschlüsselt.
- **`/signup` und `/forgot-password` Inhalt** — zu verifizieren (Dateien existieren, nicht gelesen).

---

## 6. PRIORISIERTER FIX-BACKLOG (umsatzgewichtet)

Hebel misst Wirkung auf die Kette Cold-Call → Termin → 2.000-€-Website / MRR. „Off-hours" = Caller nutzt das Tool live tagsüber; Eingriff sollte abends/am Wochenende mit Rollback-Option erfolgen.

| # | Fix | Hebel | Aufwand | Risiko | Off-hours / Rollback? | Beleg |
|---|---|---|---|---|---|---|
| 1 | **Deepgram-Key-Stufe prüfen + sichtbare Warnung**, wenn Kunden-Transkription still ausfällt. Ohne Kunden-STT ist der halbe Souffleur tot — direkter Hebel auf Gesprächsqualität → Termin. | HOCH | niedrig | niedrig | Nein (Config + UI-Hinweis) | `deepgram-token/route.ts:19-73` |
| 2 | **Settings-Integrations-Panel ehrlich machen**: Brevo→Resend umbenennen + Key fixen; die 5 Fantasie-Services (seven/Stripe/SignWell/easybill, Brevo) als „geplant/inaktiv" markieren oder entfernen. Verhindert, dass der Operator sich auf „Verbunden" verlässt. | MITTEL | niedrig | niedrig | Ja, trivial Rollback | `settings/page.tsx:20-43` |
| 3 | **Recurring-Maintenance-Cron** scharf schalten: Feld `leads.maintenanceIntervalMonths` + Generierungslogik. Schaltet automatischen MRR frei — der eigentliche wiederkehrende Umsatz. | HOCH | mittel | mittel (erzeugt echte Rechnungen) | **Ja, Off-hours + DB-Migration + Dry-Run zwingend** | `cron/tick/route.ts:143-150` |
| 4 | **DELETE-Lead vs. §147 AO**: Soft-Delete/Anonymisierung statt Hard-Cascade auf invoices; Rechnungen aufbewahren. Rechtsrisiko. | MITTEL | mittel | hoch (Schema/Cascade) | **Ja, Off-hours, Backup vorher, Rollback-Plan** | `leads/[id]/route.ts:100-138` |
| 5 | **Audit/Status-Change als Activity loggen**: schließt die Timeline-Lücke, gibt dem Caller beim Rückruf den vollen Verlauf → bessere Conversion. | MITTEL | niedrig | niedrig | Nein (additive Inserts) | `activities/route.ts:6-16`; `audit/route.ts` |
| 6 | **SIP-Credentials härten**: kurzlebige/ephemere SIP-Tokens statt Klartext-Username+Passwort an den Browser; mindestens dokumentieren + rotieren. | MITTEL | mittel | mittel (Asterisk-Konfig) | **Ja, Off-hours, da Telefonie betroffen** | `sip/config/route.ts:21-43` |
| 7 | **SMS-Reminder**: entweder seven.io real anbinden oder das Versprechen aus Settings entfernen. | NIEDRIG | mittel | niedrig | Ja | `settings/page.tsx:73-76`; `cron/tick/route.ts:126-130` |
| 8 | **Trigger-Feed entschlacken**: nur reale Quelle (Handelsregister) anzeigen, tote Enum-Typen + „8×"-Tabelle als „geplant" kennzeichnen. | NIEDRIG | niedrig | niedrig | Ja | `triggers/page.tsx`; `schema.ts:267-293` |
| 9 | **Tasks aktivieren** (Schreibpfad + UI) oder Task-Sektion ausblenden, statt leeres Skelett zu zeigen. | NIEDRIG | mittel | niedrig | Ja | `schema.ts:296-356` |
| 10 | **settings-Tabelle/Toggles**: entweder verdrahten (Persistenz) oder Toggles als „fix" markieren, damit sie nicht Funktion vortäuschen. | NIEDRIG | mittel | niedrig | Ja | `settings/page.tsx`; `schema.ts:421-445` |

**Off-hours-Regel für den Live-Betrieb (17-J.-Caller tagsüber):** Alles, was Telefonie (#1, #6), Cron/Rechnungen (#3, #4) oder DB-Schema berührt, NUR abends/Wochenende mit Snapshot + getestetem Rollback. UI-Ehrlichkeit (#2, #5, #7, #8) ist additiv/risikoarm und kann jederzeit.

---

## 7. AUSBAU-CHANCEN

1. **KI-Lernschleife schließen (3.3):** Erfolgsquote je Einwand/Move aus `calls.dispo` + `calls.sentiment` aggregieren und in die Suggest-Prompts zurückspeisen. Größter strategischer Hebel — das Tool würde mit jedem Anruf besser.
2. **Audit → automatischer Hook → personalisierte E-Mail nach Termin:** Der Audit erzeugt bereits einen trade-spezifischen Hook (`leads.auditHook`). Diesen automatisch in die (transaktionale, §7-konforme) Terminbestätigungs-Mail ziehen.
3. **MRR-Cockpit:** Sobald Recurring-Rechnungen (#3) laufen, Churn-/Forecast-Sicht auf Wartungsverträge.
4. **Finder → Audit-Pipeline ist schon halb da:** `finder/import` triggert `audit/pending` fire-and-forget — diesen Pfad robuster machen (Retry, Sichtbarkeit), damit jeder neue Lead vor-auditiert in die Queue fällt.
5. **Echte Integrationen statt Fassade:** Wenn Stripe/E-Signatur/ZUGFeRD strategisch gewollt sind, zuerst eine bauen (vermutlich Stripe-Anzahlung beim Verkauf) statt fünf gleichzeitig zu bewerben.
6. **Trigger-Feed-Quellen real machen:** Förderprogramm- und SSL-Ablauf-Trigger haben den höchsten beworbenen Conversion-Multiplikator — wenn die Datenquellen beschaffbar sind, lohnt der Ausbau.

---

---

## 8. Verifikation der Top-Befunde (adversarisch gegengeprüft)

6 der riskantesten Behauptungen wurden von separaten Prüfern gegen den echten Code gehämmert (Standard: im Zweifel widerlegen):

| Befund | Verdikt |
|---|---|
| Settings zeigt 5 Fantasie-Integrationen (Brevo/seven/Stripe/SignWell/easybill) ohne jede Backend-Zeile | ✅ bestätigt |
| E-Mail läuft über Resend, Settings prüft aber `BREVO_API_KEY` → Status-Anzeige entkoppelt | 🟡 teils (Mechanik bestätigt; Frontend `EmailCompose` nennt korrekt Resend — nur die Settings-Kachel ist falsch) |
| Audit/Status-Change/Trigger landen NICHT in der Activity-Timeline (Calls/E-Mails schon) | ✅ bestätigt |
| MRR-Abrechnungs-Cron unverdrahtet (`maintenanceIntervalMonths` fehlt) | 🟡 teils korrigiert — Dashboard-MRR rechnet aus `leads.maintenance`, nur die Rechnungs-Automatik fehlt (s. 3.4) |
| Deepgram-Kunden-STT fällt „still" aus bei Member-Key | 🟡 teils korrigiert — UI zeigt „Key fehlt", Raw-Key-Fallback hält STT in Prod am Laufen (s. 4.3) |
| DELETE-Lead kaskadiert auf `invoices` → §147-AO-Konflikt | ✅ bestätigt (auch in `SICHERHEIT.md:29` dokumentiert) |

*Hinweis zu Unsicherheiten:* `/signup` und `/forgot-password` wurden nicht im Detail gelesen — Status „zu verifizieren". Alle übrigen Status-Angaben sind am Quellcode gegengeprüft; wo ein Reader sich widersprach (Activities-Event-Spine), wurde am Code entschieden (Abschnitt 3.1).

*Methodik:* read-only Audit, 5 parallele Domänen-Reader → 1 Synthese (Opus) → 6 adversarische Prüfer. Keine Code-Änderung. 28.06.2026.

---

## 9. Nachtrag — Zweitlauf (11 Agenten, read-only): zusätzliche Befunde

Ein zweiter, unabhängiger Audit-Lauf (6 Subsystem-Maps + 4 Flow-Traces + Synthese) hat die obigen Befunde im Kern **bestätigt** (Settings-Fassade, Activity-Lücken bei Audit/Trigger, MRR-/Cron-Disconnect, SIP-Credentials im Klartext, tote Routen) und dazu folgende **net-neue, überwiegend umsatzrelevante** Befunde geliefert, die im Erstlauf fehlten. (Der Map-Agent „Telemetrie" lief in einen Platzhalter und wird separat nachgezogen.)

| # | Schwere | Hebel | Net-neuer Befund | Beleg (file:line) | Fix |
|---|---|---|---|---|---|
| N1 | broken | HOCH | **`paidAt` wird von keiner Route je gesetzt** → `revenueThisMonth` zählt bezahlte Rechnungen strukturell nie (KPI bleibt 0, auch wenn „Bezahlt" angeklickt) | store.ts:634-642; invoices/route.ts:68-93 | PATCH /api/invoices/[id] stempelt bei status=paid `paidAt=now()` + „Als bezahlt"-Button |
| N2 | disconnect | HOCH | **Cadence endet bei `audit_sent`, vergibt nie `proposal`/`won`** → won/proposalCount/MRR können über den Anruf-Flow nie befüllt werden | cadence.ts:49-129 (max :98) vs. store.ts:598-602 | Closing-Dispos „Angebot raus"→proposal, „Auftrag"→won; oder Status-Bump an Angebot/Convert koppeln |
| N3 | broken | HOCH | **Angebot→Rechnung-Convert-Route existiert, aber kein UI-Button ruft sie auf** | invoices/[id]/convert/route.ts; Grep „convert" in src/**/*.tsx = 0 | „In Rechnung umwandeln"-Button in finances/page.tsx (status=accepted) |
| N4 | broken | HOCH | **Dispo bricht still, wenn `window.opener===null`** (Popup-Blocker/Bookmark, rel=noopener) → Anruf bewertet, im CRM kommt nichts an | CallMode.tsx:366-377,409-417; SouffleurRoom.tsx:1372-1391 | fetch-Fallback statt nur postMessage; rel=noopener im Fallback raus — **Telefonie-nah, off-hours verifizieren** |
| N5 | broken | mittel | **Convert lässt Rechnung als `draft`** → in keiner Umsatz-KPI, kein won-Status | invoices/[id]/convert/route.ts:56-69 | Convert mit Lead.status=won + Bezahlt-Flow (N1) koppeln |
| N6 | broken | mittel | **projects/new liest `?leadId=` nie aus** → User muss UUID abtippen, sonst 400 | leads/[id]/page.tsx:210; projects/new (kein useSearchParams) | leadId via useSearchParams (Suspense) als Default |
| N7 | broken | mittel | **Mockup-Default-Template lädt 404-Hero (`roof-aerial.jpg` fehlt)** für jeden Lead ohne erkanntes Gewerk | mockup/templates.ts:47,138; public/templates/ fehlt | Asset ablegen oder auf CSS-Gradient umstellen wie die anderen 4 |
| N8 | disconnect | mittel | **tel:-Schnellanruf in der Tabelle zählt `attempts` absolut hoch (Lost-Update), ohne Dispo/Kadenz** | LeadsTable.tsx:53-60 vs. CallMode.tsx:119 | Tabellen-Button auf `attemptsIncrement` + Pflicht-Dispo |
| N9 | disconnect | mittel | **Fire-and-forget: Termin/Anruf/Activity-Speicherung schlägt unbemerkt fehl** (nur Lead-PATCH geprüft) | CallMode.tsx:129-142,181-195,198-208 | Termin-Anlage awaiten, bei Fehler saveError setzen |
| N10 | broken | mittel | **SIP: 2500-ms-Fixtimeout statt auf `registered`-Event zu warten** → Race, Anruf scheitert obwohl Bridge ok | SipDialer.tsx:88-97; client.ts:118-121 | Auf 'registered' warten — **Telefonie, off-hours + echter Anruf-Test** |
| N11 | smell | mittel | **Stille-Erkennung (45 s Pegel<0.05) reißt Browser-Anruf ab, obwohl SIP lebt** | SouffleurRoom.tsx:1152-1167 vs. 1120-1127 | Pegel-Auto-Ende bei aktivem SIP aus, nur tel:-Weg — **Telefonie, off-hours** |

**Zusammengeführte Welle 1 (beide Läufe, nach Hebel × Sicherheit):**

*Sofort möglich (additiv, UI-/Logik-sicher, kein Telefonie-/RLS-/Schema-Eingriff, kein Off-hours-Zwang):*
1. **N1 — `paidAt`-Writer + „Als bezahlt"-Button.** Ohne das ist jeder Umsatz unsichtbar. Aufwand S.
2. **N3/N5 — Convert-Button verdrahten + Rechnung auf `issued`/won.** Aufwand S.
3. **N2 — Cadence bis `proposal`/`won` schließen.** Größter Trichter-Hebel. Aufwand M (Cadence ist client-load-bearing → neue Zweige isoliert testen).
4. **Erstlauf #2 — Settings-Integrationen ehrlich** (Brevo→Resend, 5 Fantasie-Services als „geplant"). Aufwand S.
5. **Erstlauf #5 + N9-Erweiterung — Audit/Status-Change als Activity loggen.** Schließt Timeline-Lücke. Aufwand S, additiv.

*Nur Off-hours + Verifikation (Telefonie-/Rückkanal-nah):*
6. **N4 — Dispo-fetch-Fallback bei `window.opener===null`** (Popup-/Bookmark-Pfad durchspielen).
7. **N8 — tel:-Schnellanruf auf `attemptsIncrement` + Pflicht-Dispo.**

*Methodik Zweitlauf:* 6 Subsystem-Maps + 4 Flow-Traces (read-only, Opus) → 1 Synthese. Keine Code-Änderung.