# AW Digital OS — Programm-Dokumentation

_Browser-Durchgang + Architektur, Stand 14.06.2026. Fokus: der Kaltakquise-Flow von der Lead-Liste bis zum Dispo._

## 1. Überblick

Cold-Call-Akquise-Cockpit (Next.js 16 / React 19 / TS / Tailwind v4 / Drizzle + Supabase).
Ein Solo-Berater verkauft Premium-Websites (~2.000 €) + Wartung an deutsche Handwerker.
Begleitet den ganzen Weg: **Leads finden → anrufen (mit Live-Souffleur) → Abschluss → Projekt → Wartung.**

- **DB-Modus** aktiv (Supabase verbunden, `NEXT_PUBLIC_DB_CONNECTED=true`). Anlegen/Speichern persistiert.
- **Telefonie** über Asterisk-Brücke (`wss://5-231-248-34.sslip.io:8089/ws`, SIP-User `cockpit`) — registriert (REGISTER 200 OK verifiziert).
- Läuft lokal auf **http://localhost:3055**.

## 2. Module (Sidebar)

| Seite | Route | Zweck |
|---|---|---|
| **Heute** | `/` | Dashboard: Tagesziel, KPIs, **Anruf-Queue nach Pain-Score sortiert** |
| **Leads finden** | `/leads/finder` | Multi-Quellen-Finder (OSM/Google live, 25 Gewerke, Filter, Quellen-Katalog) |
| **Leads** | `/leads` | Lead-Liste (nach Pain-Score sortiert) |
| **Pipeline** | `/pipeline` | Kanban nach Status |
| **Projekte / Termine / Finanzen** | `/projects` `/termine` `/finances` | Delivery + Abschluss |
| **Trigger / Audits / Mockups** | `/triggers` `/audits` `/mockups` | Akquise-Werkzeuge |

## 3. Der Kaltakquise-Flow (Browser-verifiziert)

1. **Dashboard → Anruf-Queue** — Leads erscheinen nach `painScore` sortiert (heißeste zuerst). „Nächsten anrufen" springt zum obersten fälligen Lead.
2. **Lead-Detail** (`/leads/[id]`) — Telefonnummer groß, „Direkt (Browser)" / „App / Tel", Notiz, 8er-Dispo-Grid, Stammdaten (Gewerk/Ort/Kontakt/Mail/Website), Wow-Sequenz (Audit/Mockup/PDF), Timeline.
3. **Souffleur** (`/souffleur/[id]`) — das Live-Cockpit im Popup:
   - Oben: Lead + Call-Timer + Status (Mikro / PC-Ton / KI) + „Kunden-Ton verbinden".
   - **Links groß: „JETZT WÖRTLICH SAGEN"** — der wörtliche Satz (35px), darunter dezente „oder:"-Varianten.
   - **Rechts klein: Strategie** — Move-Art, Nein-Behandlung, „KI verfeinern", Power-Fragen.
   - Darunter: Ja-Leiter zum Termin (antippen → groß), Branchen-Playbook, Schnell-Einwände, Abschluss-Chips, Redeanteil-Puls.
   - Unten: Audio-Steuerung + Dispo-Buttons.
4. **Dispo** → `applyCadence` setzt Status + nächsten Schritt, schreibt Anruf (`durationSec`), bei „Termin" eine `appointments`-Row, springt zum nächsten Lead.

## 4. Live-Feedback — wie es funktioniert (und der Stolperstein)

Der große Satz wechselt automatisch, sobald die **Kundenstimme transkribiert** wird (Deepgram → `matchMove` → Satz). Dafür muss der Souffleur den Kunden HÖREN:
- Mikro überträgt nur die eigene Stimme.
- Für die Kundenstimme: **„Kunden-Ton verbinden" / Bildschirm-Audio teilen** (ShareGuide), „Tab-/System-Audio" anhaken.
- Ohne Audio-Sharing bleibt der Satz auf der Eröffnung — die **Chips funktionieren aber immer** (Einwand/Abschluss/Power-Frage antippen → Satz groß).

## 5. Browser-Durchgang: gefundene Punkte (Read-off)

Beim Live-Durchklicken eines echten Dachdecker-Leads (keine Website) aufgefallen:

- **[Name]-Platzhalter** im Opener wird nicht ersetzt → der Berater liest „hier ist [Name]". Braucht einen Berater-Namen (Einstellung) oder sauberen Default.
- **Opener unterstellt eine Website** („Ich habe mir kurz Ihre Website angesehen"), obwohl der Lead KEINE hat. Muss sich an „keine Website" anpassen.
- **Kein Vorab-Briefing** auf Lead-Detail/Souffleur: die wahrscheinlichen Pain Points + erwarteten Einwände werden nicht prominent gebrieft — genau das Ziel „nur ablesen".

→ Diese Punkte + die Code-Bug-Jagd fließen in den Read-off-Ausbau (siehe `KALTAKQUISE-ROADMAP.md` und die folgenden Commits).
