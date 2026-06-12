# AW Digital OS

Akquise-Cockpit für deutsche Handwerksbetriebe — Solo-Variante.

## Architektur

- **Next.js 15 (App Router)** + TypeScript + Tailwind v4
- **Supabase EU (Frankfurt)** als Postgres + Auth
- **Drizzle ORM** für typsicheres SQL
- **Anthropic Claude** (Sonnet 4.6 / Haiku 4.5) für Klassifikation, Souffleur, Summary
- **easybell** für Telefonie (Click-to-Call MVP, später WebRTC)

## Lead-Quellen (alle gratis)

| Quelle | Vol/Tag | Status |
|---|---|---|
| OpenStreetMap Overpass | 100-200 | ✅ implementiert |
| Innungs-Websites (dachdecker.de, …) | 30-50 | ⏳ geplant |
| Kommunale Gewerbeverzeichnisse | 20-40 | ⏳ geplant |
| Google Places (200 $ Free-Tier) | 300 | ⏳ geplant |
| HWK selektiv | 20-30 | ⏳ geplant |

## Trigger-Feeds

- ✅ Handelsregister-Neugründungen (RSS pro Bundesland)
- ⏳ HWK-Pressemitteilungen (53 Feeds via Inoreader)
- ⏳ Google News Alerts
- ⏳ crt.sh SSL-Ablauf
- ⏳ Förderprogramm-Monitor

## Setup

```bash
cp .env.example .env.local
# DATABASE_URL aus Supabase eintragen
npx drizzle-kit push
npm run dev
```

## API-Routen

| Route | Zweck |
|---|---|
| `POST /api/import` | JSON-Export der alten HTML-CRM einlesen |
| `POST /api/scrape/osm` | Overpass-Scrape für `{city, trades[]}` |
| `POST /api/audit` | Website-Audit + Pain-Score + Hook |
| `GET /api/triggers/handelsregister` | Neugründungs-Feed ziehen |

## Domain-Modell

Siehe `src/db/schema.ts`.

```
leads ─── activities ─── (call|email|sms|note|meeting)
  │
  ├── calls (transcript, dispo, sentiment)
  ├── appointments (ics_uid, reminder)
  ├── audits (page_speed, pain_score, hook)
  └── trigger_events (handelsregister_new, foerderung, …)
```

## Bauplan (Woche 1)

- [x] Repo + Schema + DB-Client
- [x] Drizzle config + .env.example
- [x] OSM Overpass Scraper
- [x] Handelsregister Trigger-Feed
- [x] Website-Audit Worker (PageSpeed + HTML-Checks)
- [x] HTML-CRM JSON-Importer
- [x] API-Routen für alle vier Worker
- [x] Heute / Leads / Triggers UI
- [x] Lead-Detail mit Call-Mode
- [ ] Auto-Cadence im Backend verdrahten
- [ ] Supabase deploy + Daten migrieren
- [x] easybell Click-to-Call Hook
