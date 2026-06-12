# AW Digital OS — Handoff-Bericht

_Übergabe-Dokument für die Weiterentwicklung. Stand: 13.06.2026._

Alles, was du brauchst, um das Projekt zu übernehmen: Schnellstart, Architektur,
was läuft, was offen ist, und die Supabase-MCP-Einrichtung.

---

## 1. Was ist das?

**AW Digital OS** — ein Cold-Call-Akquise-Cockpit für eine Webdesign-Agentur
(verkauft Premium-Websites ~2.000 € + Wartung an deutsche Handwerker). Es begleitet
den ganzen Weg: **Leads finden → anrufen (mit Live-Souffleur) → Abschluss → Projekt
→ Wartung**.

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Drizzle ORM,
  Supabase (Postgres EU), Anthropic Claude (Haiku 4.5), Deepgram (STT), jssip.
- **Repo:** `github.com/wesammoshrif/aw_digital.os` (privat)
- **Single-Tenant** (eine Agentur, `OWNER_ID`), noch ohne Auth.

---

## 2. Schnellstart

```bash
git clone https://github.com/wesammoshrif/aw_digital.os.git
cd aw_digital.os
npm install
cp .env.example .env.local      # Werte eintragen (siehe Abschnitt 5)
npm run dev                     # http://localhost:3000
```

**Ohne `DATABASE_URL`** läuft die App komplett auf Mock-Daten (Demo-Modus). **Mit**
`DATABASE_URL` (Supabase) auf echten Daten — automatische Umschaltung über
`src/lib/mode.ts` (`isMockMode = !process.env.DATABASE_URL`).

> ⚠️ **Wichtig:** `isMockMode` IMMER aus `@/lib/mode` importieren, NIE aus
> `@/lib/store` — sonst zieht `postgres` in den Client-Bundle und der Build bricht.

---

## 3. Datenbank (Supabase)

Aktuell **verbunden** (Session-Pooler, IPv4-tauglich) und **production-clean (leer)**.

```bash
# Schema in die DB (frische DB):
npm run db:migrate        # wendet drizzle/-Migrationen an  (oder: npm run db:push)
npm run db:generate       # neue Migration aus Schema-Änderung erzeugen
npm run db:seed           # Demo-Daten reinschreiben (zum Testen)
npm run db:clear          # ALLE Daten löschen (Schema bleibt) — production-clean
npm run db:studio         # Drizzle Studio (DB-GUI)
```

- Schema: `src/db/schema.ts` (11 Tabellen, alle mit `owner_id` + Timestamps).
- Connection-String: Supabase → Project Settings → Database → Connection string →
  **Transaction/Session Pooler** (`...pooler.supabase.com`, **nicht** die Direct-
  Connection `db.*.supabase.co` — die ist IPv6-only und scheitert auf IPv4-Netzen).
- `drizzle.config.ts` lädt `.env.local` selbst (Node `loadEnvFile`).

---

## 4. Supabase MCP (für Claude Code)

Damit Claude Code direkt mit Supabase reden kann (SQL, Migrationen, Debugging),
ist die **gehostete Supabase-MCP** (HTTP-Transport, OAuth — kein Token in der Datei)
eingerichtet.

### Einrichten (einmalig, im Projekt-Root):
```bash
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=<DEIN_PROJECT_REF>&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cbranching%2Cfunctions%2Cstorage"
```
- `<DEIN_PROJECT_REF>` = aus der Supabase-Dashboard-URL
  (`supabase.com/dashboard/project/`**`<ref>`**).
- Das schreibt eine `.mcp.json` mit:
  ```json
  {
    "mcpServers": {
      "supabase": {
        "type": "http",
        "url": "https://mcp.supabase.com/mcp?project_ref=<ref>&features=..."
      }
    }
  }
  ```

### Aktivieren:
1. **Claude Code neu starten** (MCP-Server laden erst beim Start).
2. Beim ersten Aufruf **OAuth durchklicken** (Browser-Login bei Supabase).
3. Danach stehen die `mcp__supabase__*`-Tools zur Verfügung.

> Hinweis: Die MCP ist optional/Komfort. Schema-Push + Seed laufen unabhängig über
> `DATABASE_URL` + drizzle-kit (Abschnitt 3). Die laufende App braucht die MCP nicht.

---

## 5. Secrets (`.env.local`, gitignored — NIE committen)

`.env.example` ist die Vorlage. Benötigte Werte:

| Variable | Wofür | Pflicht |
|---|---|---|
| `DATABASE_URL` | Supabase Session-Pooler | für DB-Modus |
| `ANTHROPIC_API_KEY` | Souffleur-Tipps + Summaries (Claude Haiku) | empfohlen |
| `DEEPGRAM_API_KEY` | Live-Transkription Kundenstimme | empfohlen |
| `EASYBELL_SIP_*` | Telefonie (Trunk-Daten) | für Anrufe |
| `GOOGLE_PLACES_API_KEY` | Leads-Finder Google Maps | optional |
| `RESEND_API_KEY`, `MAIL_FROM` | Reminder-/Follow-up-Mails | optional |
| `ASTERISK_WSS/SIP_*` | In-Browser-Telefonie via eigene Brücke | wenn VPS läuft |
| `OWNER_ID` | Single-Tenant-ID | gesetzt |

---

## 6. Was läuft (gebaut & verifiziert)

- **Souffleur** (`src/components/Souffleur/`) — Live-Coaching: Deepgram-Transkription
  (eigenes Mikro + Kundenstimme via System-Audio), zweistufige Tipps (lokaler Regex-
  Matcher + Claude Haiku), Branchen-Playbooks. Redesign: „Ein-Atemzug-Tipp",
  Redeanteil-Puls, sprecher-getrennte Transkripte.
- **Leads-Finder** (`/leads/finder`, `src/lib/finder/`) — Multi-Quellen-Suche:
  **OSM live**, **Google Places** (braucht Key), Kleinanzeigen/Branchenbuch als
  ehrliche Stubs (keine offizielle API). Ergebnisse entdoppelt → in Pipeline.
- **Akquise:** OSM-Scraper, Handelsregister-Trigger, Website-Audit (Pain-Score +
  Hook), `/api/audit/pending` (Auto-Audit), Impressum-Enrichment.
- **Call-Flow:** CallMode → Souffleur-Popup → Dispo → `applyCadence` → PATCH →
  nächster Lead. `calls`-Persistenz + Anruf-Statistik aufm Dashboard.
- **Abschluss:** Angebote/Rechnungen (`/finances`, eine Tabelle via `kind`),
  Angebot→Rechnung-Wandlung, Auto-Projekt bei „won".
- **Delivery:** Projekte (`/projects/[id]` mit Status-Stepper + Tasks), Termine
  (`/termine` mit Erinnerungen).
- **Automatik (DB-ready):** `/api/cron/tick` + `vercel.json` (stündlich) — Reminder-
  Versand (`src/lib/email.ts`, Resend), Follow-up. Zündet voll mit DB + Keys.
- **Dashboard:** KPIs mit hochzählenden Zahlen (`CountUp`), Pipeline-Funnel, Anruf-
  Statistik, „Heute im Blick"-Widget.

**Wissens-Graph der Architektur:** `graphify-out/graph.html` (im Browser öffnen).

---

## 7. Telefonie — der Knackpunkt

**easybell bietet KEIN In-App-Browser-Telefonieren** (kein erreichbares WebSocket-
Gateway — verifiziert: `api.easybell.de` existiert nicht; `webrtc.easybell.de`
liefert kein WS-Upgrade). Reale Wege:

1. **`tel:`-Link + Zoiper** auf dem **Trunk** (`voip.easybell.de` + Trunk-Daten) —
   gratis, funktioniert, Souffleur hört per System-Audio mit. **Montag-Stopgap.**
2. **Eigene Asterisk-Brücke** (`voip-bridge/`) — baut nach, was Vapi macht:
   registriert den easybell-Trunk und gibt dem Browser ein WSS-Gateway. **Echtes
   In-App-Telefonieren, ohne Minutenpreise.** Braucht einen kleinen Linux-VPS
   (~4 €/Monat oder Oracle Free). Komplette Anleitung in `voip-bridge/README.md`.
   _Status: gebaut, wartet auf VPS-Deploy (Oracle-Instanz braucht noch eine
   Public IP)._

Cockpit-seitig ist alles verdrahtet: `/api/sip/config` bevorzugt die Asterisk-Brücke
(`ASTERISK_*`-Env), sonst easybell-Fallback.

---

## 8. Offene Punkte (Richtung Production)

Details + Priorisierung in **`ROADMAP.md`** (volle Lücken-Analyse) und
**`BERICHT.md`** (Status + Go-Live-Checkliste). Kurzfassung:

- [ ] **Auth/Login** — `middleware.ts` + Supabase-SSR, `OWNER_ID` aus Session statt
  ungeprüftem Header. **P0 fürs Online-Gehen** (lokal/Single-User nicht zwingend).
- [ ] **RLS-Policies** in Supabase.
- [ ] **Vercel-Deploy** (env vars + Cron).
- [ ] **Telefonie-Brücke deployen** (VPS, siehe oben).
- [ ] §14-konforme Rechnungs-PDF + Mahnwesen; wiederkehrende Wartungsrechnungen.
- [ ] Kunden-Onboarding-Modul (Material sammeln) in der Delivery.

---

## 9. Wichtige Befehle

```bash
npm run dev            # Dev-Server
npm run build          # Production-Build (muss grün sein)
npm run lint           # ESLint
npx tsc --noEmit       # Typecheck
npm run db:migrate     # Schema → DB
npm run db:seed        # Demo-Daten rein
npm run db:clear       # alle Daten löschen (production-clean)
```

## 10. Dokumente im Repo
- `HANDOFF.md` — dieses Dokument
- `ROADMAP.md` — Lücken-Analyse + Sprint-Fortschritt
- `BERICHT.md` — Status + Go-Live-Checkliste
- `voip-bridge/README.md` — Asterisk-Brücke deployen
- `graphify-out/graph.html` — Architektur-Wissensgraph
