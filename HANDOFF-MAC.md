# AW Digital OS — Weiterarbeit am Mac

**Erstellt: 11.07.2026** · für die 3-wöchige Weiterarbeit am Mac.
Feature-/Architektur-/Deploy-Details stehen in [`HANDOFF.md`](./HANDOFF.md) und
[`DEPLOY.md`](./DEPLOY.md) — dieses Dokument ist nur der Umzug + aktueller Stand.

---

## Aktueller Stand (Git)

- **Branch:** `master` — vollständig auf `origin/master` gepusht (0 offen, working tree sauber).
- **Repo:** https://github.com/wesammoshrif/aw_digital.os.git (privat)
- **Letzter Commit:** `c834016` — *fix(notes): Lead-Notizen dort sichtbar machen, wo man anruft (CallMode + Souffleur-Briefing)* (10.07.2026)
- 🟢 **Produktiv live:** https://os.awcode.de (Docker auf Hostinger-VPS `187.124.190.135`)

Zuletzt gearbeitet an: Souffleur-Audio (Kundenstimme auf ChromeOS, keine halben Sätze,
Modell-Tuning Opus 4.8 / Sonnet 5 für schnelleren ersten Token), Cold-Call-Fokusmodus
+ Diary-Feed, scharfer Mailversand, Gewerk-Erkennung + Hebel-Score, Lead-Notizen im CallMode.

---

## Mac-Setup (einmalig)

```bash
# 1. Voraussetzungen: Node 20 LTS (nvm), git. Next 16 + React 19 → Node >= 18.18.
nvm install 20 && nvm use 20

# 2. Klonen
git clone https://github.com/wesammoshrif/aw_digital.os.git
cd aw_digital.os
npm install

# 3. Secrets: .env.local separat mitnehmen (siehe unten) — NICHT im Repo.
#    Ohne DATABASE_URL läuft die App im Mock-/Demo-Modus (zum reinen UI-Arbeiten ok).

# 4. Starten
npm run dev            # http://localhost:3000
```

## ⚠️ Zwei Dinge mitnehmen (nicht in Git)

**1. `.env.local`** — alle Secrets, gitignored. Sicher mitnehmen (verschlüsselt),
nicht per Git/Chat. Vorlage: `.env.example`. Wichtigste Variablen:

| Variable | Wofür |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Supabase (Pflicht für DB-Modus) |
| `NEXT_PUBLIC_DB_CONNECTED=true` | schaltet Mock-Modus im Browser aus, wenn DB da ist |
| `ANTHROPIC_API_KEY` | Souffleur-Tipps + Summaries |
| `DEEPGRAM_API_KEY` | Live-Transkription Kundenstimme (muss Owner/Admin-Key sein) |
| `EASYBELL_SIP_*` / `ASTERISK_*` | Telefonie (Trunk / eigene Brücke) |
| `RESEND_API_KEY`, `MAIL_FROM`, `CRON_SECRET` | Reminder-/Follow-up-Mails |
| `ADMIN_EMAILS`, `OWNER_ID` | Auth-Rollen / Default-Owner |
| `PAGESPEED_API_KEY`, `GOOGLE_PLACES_API_KEY` | Audit + Leads-Finder (optional) |

> `DATABASE_URL` = Supabase **Session-Pooler** (`...pooler.supabase.com`), **nicht**
> die Direct-Connection `db.*.supabase.co` (IPv6-only, scheitert auf IPv4).

**2. SSH-Key für den Prod-Deploy** — der VPS-Deploy braucht den privaten Key, der auf
dem Windows-Rechner unter `~/.ssh/hostinger_vps` liegt. Auf den Mac nach `~/.ssh/`
kopieren (`chmod 600`), sonst kein Redeploy möglich. Reines Coden/Testen geht ohne.

---

## Wichtige Befehle

```bash
npm run dev            # Dev-Server
npm run build          # Production-Build (muss grün sein)
npm run lint           # ESLint
npx tsc --noEmit       # Typecheck
npm test               # Vitest
npm run db:migrate     # Schema → DB
npm run db:seed        # Demo-Daten
npm run db:studio      # Drizzle Studio (DB-GUI)
```

## Deploy (KEIN Vercel — Docker auf VPS)

Voller Ablauf in `DEPLOY.md` / `HANDOFF.md` Abschnitt 0. Kurz:
Quellbaum tarren (ohne `node_modules/.next/.git/.env*`) → `scp` nach `/opt/aw-os` auf
`187.124.190.135` → `docker compose -f docker-compose.vps.yml up -d --build`.
Prod-`.env` liegt auf dem VPS unter `/opt/aw-os/.env` (chmod 600, nie committen).
SSH-Key: `~/.ssh/hostinger_vps`. Die Telefonie-Brücke läuft getrennt unter `/opt/aw-voip/`.

## Offene Punkte (aus HANDOFF.md / ROADMAP.md)

- Echter Ende-zu-Ende-Testanruf über die Asterisk-Brücke steht weiter aus.
- Eine Mikro-Session pro Anruf (statt doppeltem `getUserMedia`), sichtbare Coaching-UI.
- §14-konforme Rechnungs-PDF + Mahnwesen, wiederkehrende Wartungsrechnungen.
- Supabase Site-URL / Redirect-URL für Signup-Confirm & Passwort-Reset setzen.
- Details + Priorisierung: `ROADMAP.md`, `BERICHT.md`, `SOUFFLEUR-AUDIT.md`.
