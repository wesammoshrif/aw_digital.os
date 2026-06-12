# AW Digital OS — Roadmap zur optimalen OS

_Lücken-Analyse vom 12.06.2026 (6 parallele Code-Audits). Vision: EINE OS, die von der Akquise über den Abschluss bis zur Projekt-Fertigstellung und laufenden Wartung begleitet._

## Leitbefund

Das **Datenmodell ist reif und vorausschauend** (11 Tabellen, alle Enums/Felder für die ganze Reise schon angelegt: `calls`, `reminderAt`, `convertedInvoiceId`, `recurring_maintenance`, `review`-Status, `tasks` …). Was fehlt, ist fast überall dasselbe: **die Aktion/Ausführung, die das Modell lebendig macht.** Drei Rückgrate fehlen quer durch alle Phasen:

1. **Persistenz & Aktionen** — Anrufe werden nie gespeichert, Projekte/Rechnungen/Angebote lassen sich nicht anlegen (tote Buttons → teils 404).
2. **Ausführungs-Engine (Scheduler)** — Erinnerungen, Follow-up-Kadenz, wiederkehrende Rechnungen, Trigger-Polling laufen NUR bei manuellem Aufruf.
3. **Produktions-Fundament** — kein Auth, Supabase-Pakete installiert aber ungenutzt, keine Migrationen, keine RLS, GeminiChat ist eine Attrappe.

---

## Phase 1 — Akquise & Leads

**Vorhanden:** OSM-Scraper (9 Gewerke, Failover), Handelsregister-Trigger, Website-Audit (PageSpeed + Pain-Score + Hook), Dedup, Pain-Queue, Legacy-Import.

**Größte Lücken:**
- **[P0] Auto-Audit im Lead-Flow** — `runAudit` wird beim Scrape nie aufgerufen → Leads landen mit `painScore=null`, die Pain-Sortierung läuft leer. _Das tötet die zentrale Queue-Intelligenz._
- **[P0] Kontakt-Anreicherung** — Entscheider-Name + Mobilnummer (Impressum-/Website-Parse) + Google Places als 2. Quelle. OSM liefert für die Mehrheit kein anrufbares „Herr Müller + Handy".
- **[P1] Trigger→Lead-Verknüpfung** — Handelsregister-Events haben `leadId=null` + kein Telefon → der heiße Neugründungs-Lead ist nicht anrufbar. SSL-Ablauf & Förder-Feeds (höchste Hooks) sind nicht implementiert.

## Phase 2 — Cold Calling & Souffleur

**Vorhanden (stark!):** Live-Transkription beidseitig (Deepgram), zweistufiger Souffleur (Regex-Matcher + Haiku), Branchen-Playbooks, Dispo-Flow + Kadenz, Test-Modus. _Der Live-Begleiter ist produktionsnah._

**Größte Lücken:**
- **[P0] `calls`-Tabelle wird nie geschrieben** — keine `/api/calls`-Route; Anrufe landen nur als generische Activity ohne Dauer/Transkript. _Ohne das kein Reporting möglich._
- **[P0] Keine Post-Call-Summary** — Transkript wird beim Schließen verworfen; `summary`/`sentiment` bleiben leer. Kein Haiku-Zusammenfassungs-Schritt.
- **[P0] Keine Anruf-Statistik** — Connect-Rate, Ø-Dauer, Termine/Std fehlen (Kern eines Call-Cockpits).
- **[P1] Notiz geht im Souffleur-Popup verloren** (kein Notizfeld dort), **Recording ist nur Animation**, Anruf-Timer misst Fenster- statt Gesprächsdauer.

## Phase 3 — Follow-up, Angebot & Abschluss

**Vorhanden:** getestete Kadenz-Engine, durchdachte 8-Touch-`FOLLOW_UP_CADENCE` (deklarativ), Closing-Material (Micro-Commitments, Nein-Gradienten), Angebots-/Rechnungs-Datenmodell, Finanz-KPIs, Onepager-PDF.

**Größte Lücken:**
- **[P0] Follow-up-Trigger** — `FOLLOW_UP_CADENCE` & `reminderAt` sind totes Wissen; kein Job führt sie aus.
- **[P0] E-Mail-Versand** — kein SMTP/Resend; Audit/Onepager/Break-Up-Mail nur manuell. _Kernkanal fehlt._
- **[P0] Angebot erstellen + Angebot→Auftrag wandeln** — keine UI/Route; „Neues Angebot" ist ein Dead-Button. `convertedInvoiceId` existiert, aber keine Logik. _Bruch genau am Abschlusspunkt._
- **[P1] Echte Termin-Buchung** (Dispo „appointment" legt keinen `appointments`-Eintrag an), Vertrag/E-Signatur (DocuSign verfügbar).

## Phase 4 — Projekt-Onboarding & Delivery _(dünnster Bereich)_

**Vorhanden:** Schema (`projects`/`tasks`), 2 Read-only-Listen, Mockup-Studio (gehört aber in den Vor-Verkauf).

**Größte Lücken:**
- **[P0] Tote Links → 404:** `/projects/[id]` und `/projects/new` werden vom Dashboard & Lead-Detail verlinkt, **existieren aber nicht**. Die Delivery beginnt buchstäblich mit einem kaputten Link.
- **[P0] Auto-Anlage Projekt bei „won"** — Verkauf→Delivery-Übergabe ist komplett manuell/lückenhaft.
- **[P0] `tasks` komplett ungenutzt** — keine `listTasks`, keine Mock-Daten, keine UI. Kein Aufgaben-/Fortschritts-Tracking.
- **[P1] Kunden-Onboarding** (Logo/Texte/Bilder/Zugänge sammeln) — der reale Engpass bei Handwerkern, fehlt vollständig. Go-Live-Checkliste, Review-Freigabe (`review`-Status ist toter Enum-Wert), Wartungs-Übergang nach Live.

## Phase 5 — Finanzen & Bestandskunden

**Vorhanden:** retention-fähiges Rechnungs-/Angebots-Modell, Anzahlung→Schluss (`convertedInvoiceId`), MRR-KPI, Finanz-Übersicht.

**Größte Lücken:**
- **[P0] Rechnungs-CRUD** — alles read-only; „Neue Rechnung" ist Dead-Button. _Die OS fakturiert keinen Cent._
- **[P0] §14-UStG-konforme PDF-Rechnung** — fehlt + Pflichtfelder im Schema (USt-Satz/Netto/Brutto/Leistungsdatum/Kleinunternehmer §19).
- **[P0] Zahlungsverfolgung & Mahnwesen** — kein Statuswechsel-Mechanismus, keine Überfälligkeits-Erkennung, keine Mahnstufen.
- **[P1] Wiederkehrende Wartungsrechnungen** automatisiert (Kern des „behalten"), Wartungs-Vertragsobjekt, Churn-Warnung.

## Phase 0/quer — Plattform & Fundament

- **[P0] Auth/Login fehlt komplett** — keine `middleware.ts`, jede DB-Route offen, `OWNER_ID` aus ungeprüftem Header (Tenant-Spoofing). _Darf so nicht online gehen._
- **[P0] Supabase-Pakete installiert, aber nirgends genutzt** — „Anbindung" ist nur DATABASE_URL→Drizzle; kein Auth-Client, kein RLS.
- **[P0] Keine Migrationen** — kein `drizzle/`-Ordner, keine `db:push`-Scripts → Schema nicht reproduzierbar deploybar.
- **[P0] Reminder-Engine ist Anzeige-Attrappe** — `reminderAt`/`reminderSentAt` nur als Badge berechnet; kein Job verschickt etwas.
- **[P1] Kein Scheduler/Cron** (trägt Reminder, Auto-Kadenz, wiederkehrende Rechnungen, Trigger-Polling), **GeminiChat ist Fake**, **Modell-ID veraltet** (`claude-3-5-haiku-latest` → `claude-haiku-4-5`), keine zod-Validierung in Routen, kein Error-Tracking.
- **[P2] Nicht responsive/mobil**, Reporting/Analytics über Zeit, Backup/Deployment.

---

## Empfohlene Baureihenfolge

### Sprint A — „Die Reise reißt nicht ab" ✅ ERLEDIGT (12.06.2026)
Macht die durchgehende Strecke begehbar, schließt tote Links & Persistenz:
1. ✅ `calls`-Persistenz (`/api/calls`) + Post-Call-Summary-Route (`/api/souffleur/summary`, Haiku 4.5) + Anruf-Statistik auf dem Dashboard (Connect-Rate, Ø-Dauer, Termine/Interesse) + `mockCalls`
2. ✅ Projekt-Seiten: `/projects/[id]` (Status-Stepper + Tasks + Meta), `/projects/new` (Formular), `/api/projects` — die 404er sind weg
3. ✅ `tasks` aktiviert: `mockTasks`, `listTasks()`, Task-Liste mit Fortschrittsbalken auf der Projekt-Detailseite
4. ✅ Angebots-/Rechnungs-CRUD: `/finances/new` (Angebot/Rechnung-Formular) + `/api/invoices`, „Neu"-Buttons verdrahtet

_Offen aus Sprint A (kommt in Sprint B, braucht Ausführung): Auto-Anlage Projekt bei „won", echte Angebot→Rechnung-Wandlung-Aktion, Post-Call-Summary automatisch aus dem Souffleur-Transkript auslösen._

### Sprint B — „Die OS arbeitet von selbst" ✅ STRUKTUR GEBAUT (12.06.2026, zündet voll ab Supabase)
5. ✅ Scheduler/Cron-„Tick"-Route `/api/cron/tick` (GET+POST, CRON_SECRET-Schutz) + `vercel.json` (stündlich). Mock liefert Vorschau.
6. ✅ Reminder-Versand: `src/lib/email.ts` (Resend via fetch, No-Op ohne Key) + Cron sendet fällige Termin-Erinnerungen und setzt `reminderSentAt` (DB-Modus).
7. ⏳ Follow-up-Kadenz/wiederkehrende Rechnungen: Reminder erledigt; wiederkehrende Wartungsrechnungen als klarer TODO-Block im Cron (braucht Intervall-Feld am Vertrag).
8. ✅ Auto-Audit: `/api/audit/pending` (auditiert N Leads ohne painScore) + `src/lib/enrich/impressum.ts` (Entscheider/E-Mail/Telefon aus Impressum) + leichte Anreicherung im Scrape.

Zusätzlich gebaut: `/api/invoices/[id]/convert` (Angebot→Rechnung), Auto-Anlage Projekt bei „won" (PATCH leads), `createProject()`.

### Quick Wins ✅ ERLEDIGT (12.06.2026)
- ✅ Modell-IDs `claude-3-5-haiku-latest` → `claude-haiku-4-5` (beide KI-Routen)
- ✅ **GeminiChat + GeminiStrategy entfernt** (Fakes raus) → echtes „Heute im Blick"-Widget
- ✅ Souffleur-Dispos `busy`/`wrong_number` ergänzt
- ✅ Deepgram-Modell vereinheitlicht (überall nova-2)
- ⏳ offen: `Shell` lädt noch Mock-`STREAK` hart (P2, kosmetisch); Souffleur-Notizfeld im Popup

### Sprint C — „Produktionsreif & online" (teilweise)
9. ⏳ Supabase-SSR + Auth (`middleware.ts`) + `OWNER_ID` aus Session — OFFEN
10. ✅ **Supabase verbunden & Migrationen** (12.06.2026): `DATABASE_URL` (Session-Pooler) gesetzt → App läuft im DB-Modus. `drizzle/0000_lean_sphinx.sql` migriert (11 Tabellen), `scripts/seed.ts` hat 13 Leads/2 Projekte/6 Tasks/9 Belege/6 Anrufe/4 Termine geseedet. RLS-Policies + Vercel-Deploy noch offen.
11. ⏳ §14-konforme Rechnungs-PDF, Mahnwesen, Zahlungsanbindung — OFFEN
12. ⏳ Kunden-Onboarding-Modul + Go-Live-Checkliste + Review-Freigabe — OFFEN

**Supabase-MCP:** in `.mcp.json` (SAP-Projekt-Root) konfiguriert (HTTP/OAuth, project_ref aus dem Supabase-Dashboard) — aktiv nach Claude-Code-Neustart.

### Quick Wins (jederzeit, S)
- Modell-ID `claude-3-5-haiku-latest` → `claude-haiku-4-5` (2 Routen)
- GeminiChat an `/api/ai/strategy` hängen statt setTimeout-Fake
- Souffleur-Notizfeld + Dispo-Lücke (`busy`/`wrong_number`) schließen
- Deepgram-Modell vereinheitlichen (nova-2 vs nova-3)
- `Shell` lädt Mock-`STREAK` hart — aus `settings` ziehen

### Für Montag (lokaler Solo-Betrieb) NICHT nötig
Auth/RLS/Deployment sind P0 **fürs Online-Gehen**, nicht für den lokalen Call-Tag. Montag läuft im Mock-Modus auf localhost.
