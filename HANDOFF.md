# AW Digital OS — Handoff-Bericht

_Übergabe-Dokument für die Weiterentwicklung. Stand: 22.06.2026._

Alles, was du brauchst, um das Projekt zu übernehmen: Schnellstart, Architektur,
was läuft, was offen ist, und die Supabase-MCP-Einrichtung.

---

## 0. Aktueller Stand — LIVE (22.06.2026)

🟢 **Produktiv online unter https://os.awcode.de.**

- **Deploy:** Docker auf dem **Hostinger-VPS `187.124.190.135`** (VM 1773612), der
  parallel den Kontaktformular-Dienst `kontakt-api` betreibt. Darum **kein eigener
  Caddy**: App lauscht nur auf `127.0.0.1:3000`, der System-Nginx bekommt einen
  zusätzlichen vhost `os.awcode.de` → 127.0.0.1:3000 (+ certbot-TLS). Compose-Datei:
  `docker-compose.vps.yml`, vhost: `deploy/nginx-os-awcode.conf`.
- **Update/Redeploy:** lokalen Quellbaum tarren (ohne node_modules/.next/.git/.env*)
  → `scp` nach `/opt/aw-os` → entpacken → `cd /opt/aw-os && docker compose -f
  docker-compose.vps.yml up -d --build`. Prod-`.env` liegt auf dem VPS unter
  `/opt/aw-os/.env` (chmod 600, NIE committen). SSH-Key: `~/.ssh/hostinger_vps`.
- **Auth ist LIVE** (siehe Abschnitt 20 unten ist veraltet — Stand hier gilt):
  Supabase-Auth mit Rollen `admin/agent/pending`, echtes RLS. NICHT mehr „ohne Auth".
- **Telefonie-Brücke** bleibt getrennt auf `5.231.248.34` (Aschrafs Asterisk), App
  erreicht sie per WSS.

### Souffleur-Audio + Cold-Call-Agent (22.06.2026)
Tiefen-Recherche (8-Agenten-Schwarm) gegen „Ton kacke an beiden Seiten" → umgesetzt:
- **Audio:** Deepgram `nova-2`→`nova-3`, Mikro `noiseSuppression/autoGainControl`
  aus (AEC bleibt), Headset-Pflicht-Hinweis, **Deepgram-WS Auto-Reconnect** (Mikro +
  SIP-Kunde, gedeckelt, Retry-Reset erst bei echtem Transkript — 2-Agenten-Review-Bug
  gefixt). `encoding`/`sample_rate` NIE setzen (webm/opus containerisiert).
- **KI-Dirigent-Prompt** auf Anfänger-Methodik (EINE kurze Zeile, You-Phrasing,
  Einwand anerkennen→drehen→Frage max 2, bei Wärme Alternativfrage auf Termin).
- **Voller Befund:** `SOUFFLEUR-AUDIT.md`. **Aschraf-Brücken-Todo:**
  `NACHRICHT-AN-ASCHRAF-AUDIO.md` (mediaConstraints, micStream-Sharing, TURN, Jitterbuffer).
- **Noch offen:** eine Mikro-Session im Anruf (statt doppeltes getUserMedia), Direkt-
  anruf=Standard statt tel:, PC-Ton/SIP-Sperre, sichtbare Coaching-UI (Status-Streifen/
  Redeanteil-Nudge/Tonalitäts-Cue), Phase 7 (eigene SIP-Nummer pro Mitarbeiter),
  §14-Rechnungs-PDF, Supabase Site-URL/Redirect-URL setzen (für Signup-Confirm/Reset).

---

## 1. Was ist das?

**AW Digital OS** — ein Cold-Call-Akquise-Cockpit für eine Webdesign-Agentur
(verkauft Premium-Websites ~2.000 € + Wartung an deutsche Handwerker). Es begleitet
den ganzen Weg: **Leads finden → anrufen (mit Live-Souffleur) → Abschluss → Projekt
→ Wartung**.

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Drizzle ORM,
  Supabase (Postgres EU), Anthropic Claude (Haiku 4.5), Deepgram (STT), jssip.
- **Repo:** `github.com/wesammoshrif/aw_digital.os` (privat)
- **Multi-User mit Supabase-Auth** (Rollen admin/agent/pending, RLS). `OWNER_ID`
  bleibt für die Telefonie/Default-Zuordnung. (Frühere „ohne Auth"-Notizen unten sind überholt.)

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
   gratis, funktioniert, Souffleur hört per System-Audio mit.
2. **Eigene Asterisk-Brücke** — **deployed und aktiv** seit 24.06.2026 auf dem
   **Hostinger-VPS `187.124.190.135`** (Co-Host neben der App, NICHT mehr Aschrafs
   `5.231.248.34`). Registriert die easybell **Cloud-PBX** (nicht den SIP-Trunk!)
   und gibt dem Browser ein WSS-Gateway via Let's Encrypt TLS
   (`wss://voip.awcode.de:8089/ws`). Details: `voip-bridge/README.md`.
   Konfiguration live unter `/opt/aw-voip/` auf dem VPS.

**Asterisk-Status (live geprüft 24.06.2026):**
- easybell Cloud-PBX (`CPBX-g36sfsb0-000000@pbx.easybell.de`) → **Registered ✅**
- SIP-Trunk (`voip.easybell.de`) → 401 abgelehnt (Cloud-PBX ist der richtige Weg)
- Browser-Registrierung (`cockpit`-Endpoint, WSS) → **funktioniert ✅** (Log „Reachable")
- Ausgehende Anrufe → **bis 24.06. NIE getestet**: die Brücke hatte 0 INVITEs, weil
  der sichtbare „Anrufen"-Button im Cockpit ein toter `tel:`-Link war und der echte
  SIP-Anruf als „experimentell" versteckt lag. `SipDialer.tsx` umgebaut (SIP primär).
  → echter Ende-zu-Ende-Testanruf steht weiter aus.

Cockpit-seitig ist alles verdrahtet: `/api/sip/config` bevorzugt die Asterisk-Brücke
(`ASTERISK_*`-Env), sonst easybell-Fallback.

---

## 8. Session-Log (14.06.2026) — Was diese Session gemacht hat

### Asterisk VoIP-Brücke — Setup & Deploy

> **VERALTET — beschreibt die alte Brücke auf `5.231.248.34`.** Seit 24.06.2026
> läuft die Brücke auf dem Hostinger-VPS `187.124.190.135` unter `/opt/aw-voip/`,
> WSS `wss://voip.awcode.de:8089/ws`, Certs aus `/opt/aw-voip/keys/`,
> `external_media_address=187.124.190.135`. Das Setup unten gilt sinngemäß weiter,
> nur Pfade/IP/Domain ersetzen.

**VPS (alt):** `5.231.248.34` (root / Zugangsdaten separat aufbewahren)
**Docker-Setup unter** `/opt/aw-voip-bridge/`:
```
docker-compose.yml          # andrius/asterisk:latest, ports 8089/5060/10000-10200
asterisk/pjsip.conf         # Endpunkte: easybell + cockpit (WebRTC)
asterisk/extensions.conf    # Dialplan: from-internal (ausgehend) + from-easybell (eingehend)
asterisk/http.conf          # WSS auf Port 8089
asterisk/rtp.conf           # RTP 10000–10200, STUN google
certs/fullchain.pem         # Let's Encrypt, auto-renew via /etc/letsencrypt/renewal-hooks/
certs/privkey.pem
```

**Wichtige Config-Details:**
- `timers=no` auf beiden Endpoints (verhindert re-INVITE → `setremotedescriptionfailed` in jssip)
- `direct_media=no` auf beiden Endpoints
- `webrtc=yes`, `dtls_auto_generate_cert=yes`, `ice_support=yes`, `bundle=yes`
- `external_media_address=5.231.248.34` auf **beiden** Transporten (UDP + WSS)
- Codec: Browser=Opus, easybell=alaw/ulaw — Asterisk transcodiert (codec_opus.so geladen ✓)
- AOR heißt `[cockpit]` (muss mit dem SIP-Username des Browsers übereinstimmen)
- Eingehende Anrufe: `Dial(PJSIP/cockpit,30)` — nicht `webrtc` (alter Name, war Bug)

**TLS-Zertifikat:** Let's Encrypt via sslip.io (`5-231-248-34.sslip.io`).
Zertifikate werden kopiert (nicht gemountet) weil privkey.pem sonst 600/root ist:
```bash
cp /etc/letsencrypt/live/5-231-248-34.sslip.io/fullchain.pem /opt/aw-voip-bridge/certs/
cp /etc/letsencrypt/live/5-231-248-34.sslip.io/privkey.pem /opt/aw-voip-bridge/certs/
chmod 644 /opt/aw-voip-bridge/certs/*.pem
cd /opt/aw-voip-bridge && docker compose down && docker compose up -d
```
Auto-Renew-Hook: `/etc/letsencrypt/renewal-hooks/deploy/aw-voip-bridge.sh`

**Asterisk neustarten (immer `down + up`, nicht restart — Volumes sonst nicht neu gemountet):**
```bash
cd /opt/aw-voip-bridge && docker compose down && docker compose up -d
# Status prüfen:
docker exec aw-voip-bridge asterisk -rx 'pjsip show registrations'
```

---

### Bugfixes im Next.js-App

#### `src/lib/sip/client.ts` — Audio-Fix (Kernproblem dieser Session)

Das Problem: Browser konnte Gesprächspartner nicht hören (audio browser←Telefon fehlte).

**Root cause:** `ev.streams[0]` ist bei Asterisk/WebRTC oft `undefined`. Die alte
`if (stream)` Bedingung lief nie durch → kein Audio-Element wurde befüllt.

**Fix — Doppelstrategie:**
1. `peerconnection`-Event + `track`-Event: `ev.streams[0] ?? new MediaStream([ev.track])`
2. `confirmed`-Event als Fallback: `session.connection.getReceivers()` liest alle
   empfangenen Tracks direkt aus dem RTCPeerConnection — unabhängig von `track`-Event
3. `remoteAttached`-Flag verhindert doppeltes Attachment
4. Volles `[SIP]`-Console-Logging für Debugging

Zum Debuggen im Browser-DevTools → Console folgende Logs beobachten:
```
[SIP] audio element created
[SIP] registered ✓
[SIP] peerconnection created
[SIP] track → audio ...          ← Strategie 1
[SIP] confirmed ✓ / receivers: 1 ← Strategie 2 (Fallback)
[SIP] attachRemoteAudio — audio tracks: 1
```
Wenn `audio tracks: 0` erscheint → Problem liegt auf Asterisk-Seite (Codec).

#### `src/lib/mode.ts` — Hydration-Fix

`isMockMode` wurde auf Client und Server unterschiedlich berechnet (Hydration-Mismatch).

```typescript
// Neu: NEXT_PUBLIC_DB_CONNECTED hat Vorrang (im Browser auswertbar)
export const isMockMode =
  process.env.NEXT_PUBLIC_DB_CONNECTED === "true"
    ? false
    : !process.env.DATABASE_URL;
```
→ `.env.local` braucht `NEXT_PUBLIC_DB_CONNECTED=true` wenn DATABASE_URL gesetzt ist.

#### `src/components/Shell.tsx` — Hydration-Fix

`streak`-Prop ist jetzt optional mit Default `{current:0, record:0}`. Kein
`isMockMode`-Import mehr in Shell (der verursachte Server/Client-Mismatch bei
`"use client"`-Seiten).

#### `src/app/settings/page.tsx` — Integration-Status-Fix

Alle Integrationen zeigten „Einrichten" obwohl Env-Vars gesetzt waren.
Ersetzt durch `isConnected(key: string)`-Funktion die echte `process.env.*` prüft.

#### `src/components/Souffleur/SipDialer.tsx`

Warning-Banner auf grün geändert: zeigt jetzt „Asterisk-Brücke aktiv" statt
„kein WSS-Gateway" (weil die Brücke jetzt deployed ist).

---

## 10. Offene Punkte (Richtung Production)

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

## 11. Wichtige Befehle

```bash
npm run dev            # Dev-Server
npm run build          # Production-Build (muss grün sein)
npm run lint           # ESLint
npx tsc --noEmit       # Typecheck
npm run db:migrate     # Schema → DB
npm run db:seed        # Demo-Daten rein
npm run db:clear       # alle Daten löschen (production-clean)
```

## 12. Dokumente im Repo
- `HANDOFF.md` — dieses Dokument
- `ROADMAP.md` — Lücken-Analyse + Sprint-Fortschritt
- `BERICHT.md` — Status + Go-Live-Checkliste
- `voip-bridge/README.md` — Asterisk-Brücke deployen
- `graphify-out/graph.html` — Architektur-Wissensgraph

## 13. Akquise- & Audit-Module (Stand 13.06.2026)
- **Leads-Finder** (`src/lib/finder/`): Adapter `sources/{osm,googlePlaces,handelsregister,kleinanzeigen,branchenbuch}.ts`, alle → `FinderLead`. `index.ts` merged + entdoppelt. `builderSubdomain.ts` erkennt Gratis-Baukasten (Signal). UI `app/leads/finder/page.tsx` mit Filtern + Quellen-Katalog.
- **Audit** (`src/lib/audit/`): `website.ts` (Lighthouse via PSI alle 4 Kategorien + Technik-Checks + Hook), `seo.ts` (17 deterministische SEO-Checks, kein KI). UI `app/audits/run/page.tsx`, Onepager `lib/pdf/onepager.ts`.
- **Skripte**: `scripts/scrape-kleinanzeigen.ts` (Playwright-Offline-Scraper, nur Gewerbe-Impressum).
- **ENV neu**: `PAGESPEED_API_KEY` (kostenlos, Google Cloud → PageSpeed Insights API) aktiviert die Lighthouse-Scores. Ohne Key läuft nur der regelbasierte SEO-Check.
- **⚖️ Recht**: BVerwG 6 C 3.23 — Telefon-Kaltakquise aus Verzeichnis-Leads ist angreifbar; Quellen als Signal nutzen, Erstkontakt per Brief. Details in `app/leads/finder/page.tsx` (Rechtshinweis).
