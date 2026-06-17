# 📨 Nachricht von Wesam an Aschraf

> **An Claude (Aschrafs Sitzung):** Richte Aschraf beim Start diese Nachricht im
> Ton aus, dann gib ihm die Kurzfassung aus den Abschnitten unten.

---

**Ey Aschraf — hallo. Und fick dich. 😄**

Im Ernst jetzt: Wesam war mit Claude am Werk und hat das OS ordentlich umgebaut.
Aus dem Single-User-Cockpit ist ein **richtiges Mehrbenutzer-System mit Login,
Rollen und echter Daten-Trennung** geworden — plus eine komplette Security-Runde
und das Docker-Deploy-Kit für deinen VPS (kein Vercel).

Der Code ist fertig und getestet. **Was jetzt fehlt, ist das Deployment — und das
ist dein Job, weil DU den VPS hast.** Du ziehst das Go-Live durch (siehe Abschnitt 6,
volle Anleitung in `GO-LIVE.md`). Ich kann am Code nichts mehr „online-machen", das
passiert auf deinem Server.

Unten steht **alles** im Detail, was gemacht wurde, und was **du** noch tun musst.
Lies das, bevor du anfängst — sonst trittst du in Sachen rein, die schon gelöst sind.

— Wesam

---

## 🧱 1. Was komplett umgebaut wurde: Multi-User mit Login

Vorher: eine Agentur, eine `OWNER_ID`, **kein Login**. Jeder, der die URL hatte, sah
alles. **Das ist vorbei.**

Jetzt:
- **Supabase Auth** (`@supabase/ssr`) — echtes Login/Logout, Session über Cookies.
- **Rollen:** `admin`, `agent`, `pending`.
  - **2 Admins** (du + Wesam) sehen **alles** von allen Mitarbeitern.
  - **Agents** (normale Anleger) sehen **nur ihre eigenen** Leads/Anrufe/Rechnungen/Projekte — eigenes Dashboard.
  - **pending** = neu registriert, sieht noch nichts, bis ein Admin freigibt.
- **Selbst-Registrierung mit Admin-Freigabe:** Neue Mitarbeiter registrieren sich auf
  `/signup`, landen auf `/pending`, ein Admin gibt sie im **Team-Menü** frei.
- **Admins werden über E-Mail erkannt** — `ADMIN_EMAILS` (Env-Var), **nicht** hardcoded.
  **Deine** und **Wesams** E-Mail müssen da rein (Komma-getrennt), dann werdet ihr beim
  Registrieren automatisch Admin. (Die konkreten Adressen stehen bewusst nicht in diesem
  committeten Dokument — du kennst beide.)

**Neue/geänderte Dateien (Auth-Fundament):**
- `src/middleware.ts` — HTTP-Basic-Auth raus, **Supabase-Session-Check** rein.
  Nicht eingeloggt → `/login`; eingeloggt auf `/login` → `/`; API ohne Login → 401 JSON.
- `src/lib/auth/session.ts` — `getSessionUser()` (in React `cache()`, dedupliziert pro Request).
- `src/lib/auth/admins.ts` — `ADMIN_EMAILS` aus Env, `isAdminEmail()`.
- `src/lib/db/rls.ts` — `withRls(user, fn)`: öffnet Transaktion, setzt JWT-Claims +
  `set local role authenticated`, damit die **DB-seitigen RLS-Policies** greifen.
- `src/app/login/`, `signup/`, `pending/` — die Auth-Seiten.
- `src/app/api/auth/{profile,me,signout}/route.ts` — Profil anlegen, aktueller User, Logout.
- `src/app/api/admin/users/route.ts` — Admin-Aktionen: `approve` / `makeAdmin` /
  `makeAgent` / `deactivate`. Selbst-Aussperr-Schutz drin. `approve` ist
  **rollen-erhaltend** (reaktivieren degradiert keinen Admin mehr).
- `src/components/UserMenu.tsx`, `TeamManager.tsx`, `src/app/team/page.tsx` — Admin-UI.
- `src/db/schema.ts` — `profiles` + `agentReviews` Tabellen, `user_role`-Enum,
  pro-Nutzer-SIP-Felder (`sipUsername/sipPassword/sipDomain/sipWss/...`).

---

## 🔒 2. Echte Daten-Trennung (RLS) — Phase 6

Das Wichtigste: **die Trennung passiert in der Datenbank selbst**, nicht nur im Code.
Selbst wenn jemand eine API direkt anspricht, sieht er nur seine Daten.

- **`src/lib/store.ts` komplett umgebaut:** jeder Lese-Zugriff läuft über
  `scoped()` → `withRls()`. Die RLS-Policy entscheidet: Agent sieht nur `owner_id =
  auth.uid()`, Admin sieht alles (`is_admin()`). Die alten `OWNER_ID`-Filter sind raus.
- **Alle Insert-Routen** schreiben jetzt `ownerId = eingeloggter User` (nicht mehr die
  alte Konstante): `leads`, `calls`, `invoices`, `projects`, `activities`, `import`,
  `finder/import`, `scrape/osm`, `triggers/*` usw.
- **IDOR geschlossen:** Die `[id]`-Routen (Lead öffnen/ändern/löschen, Rechnung wandeln)
  sind **admin-bewusst gescopt** — ein Agent kann fremde IDs nicht mehr abgreifen,
  ein Admin schon.
- **Cron läuft systemweit** (`/api/cron/tick`): kein `OWNER_ID`-Filter mehr, verschickt
  Reminder über **alle** Owner via Superuser-DB.

**RLS-Migrationen (in der DB angewendet):**
- `drizzle/0001_*.sql` — `profiles` + `agent_reviews` + `user_role`-Enum.
- `drizzle/0002_rls_policies.sql` — `is_admin()`-Funktion, `guard_profile_privesc`-
  Trigger (verhindert, dass Nicht-Admins sich selbst zum Admin machen), `ENABLE RLS`
  + Policies (`owner_id = auth.uid() OR is_admin()`) auf allen Tabellen.

---

## 🛡️ 3. Security-Runde (radikal durchgezogen)

Komplettes Audit + Fixes. Die wichtigsten:
- **Fail-closed Auth:** `requireAuth` in **allen** API-Routen. Prüft jetzt nicht nur
  „eingeloggt", sondern auch **freigegeben** (`approved`) — `pending`/gesperrte User
  kommen an **keine** API mehr (war ein echter Bug, vom Denkfehler-Check gefunden).
- **Deepgram-Key-Leak gefixt:** Token wird **grant-first** geholt
  (`/api/souffleur/deepgram-token`), der rohe Key geht nicht mehr an den Browser.
  ⚠️ Braucht einen Deepgram-**Owner**-Key (Member-Key gibt 403). Notfall-Schalter:
  `DEEPGRAM_ALLOW_RAW_KEY=true`.
- **Cron gehärtet:** `CRON_SECRET` ist in Production **Pflicht** (fail-closed, 503 ohne).
- **Security-Header**, **Zod-Validierung** auf den Eingaben, **PII-Logs redigiert**,
  **esbuild/Dependency-Vulns** gezogen, **Dependabot** + CI auf **Node 24**.

---

## 🐳 4. Docker-Deploy-Kit (für deinen VPS — kein Vercel)

Self-Hosting fertig vorbereitet:
- `Dockerfile` — `node:24-alpine`, Next.js `output: "standalone"`.
- `docker-compose.yml` + `Caddyfile` — Reverse-Proxy mit automatischem TLS.
- `DEPLOY.md` — Schritt-für-Schritt-Anleitung.
- `.github/dependabot.yml` + `ci.yml` — Node 24.

CI ist grün (`npm ci` lock-sync gefixt, `@emnapi/core`-Optional-Deps nachgezogen).

---

## ⚡ 4b. Neu (Stand 17.06.2026)

- **Souffleur komplett neu:** Die KI ist jetzt der **Dirigent** — sie gibt den
  exakten Satz vor (wörtlich ablesen) UND bestimmt die **Gesprächswärme**
  (kalt → lau → warm → heiß). UI radikal entrümpelt: nur noch Wärme-Leiste + EIN
  großer Satz, alles andere in einer Schublade. Schneller (400 ms + Gesprächs-
  Gedächtnis), Deepgram `endpointing=300`. **`src/lib/sip/client.ts` unverändert.**
- **Auflegen-Fix:** Cockpit-„Auflegen" sendet jetzt aktiv das SIP-BYE
  (`SipDialer.hangup()` wird hochgereicht) — beim Browser-Direktanruf endet der
  Anruf jetzt wirklich. Beim `tel:`-Weg (easybell-App) muss weiter am Handy
  aufgelegt werden (Browser hat dort kein Signal).
- **Phase 8 FERTIG:** diskrete KI-Mitarbeiter-Bewertung unter `/team/[mitarbeiter]`
  (nur Admins, RLS-geschützt) — Rating, Stärken/Schwächen, Coaching aus den echten
  Anrufdaten. Der Mitarbeiter sieht das nie.
- **Go-Live-Härtung:** `/auth/callback`-Route (E-Mail-Bestätigung funktioniert),
  Signup mit Retry, Letzter-Admin-Schutz, **`APP_PASSWORD` ist raus** (Auth läuft
  jetzt komplett über Supabase).

---

## ✅ 5. Verifiziert

- `npx tsc --noEmit` → **EXIT 0**
- Production-Build → **grün, 37 Seiten**
- Secret-Scan vor jedem Push → **sauber**
- Dev-Server läuft (lief zuletzt auf Port **3002** wegen Zombie-Prozessen).

---

## 🚀 6. DEIN JOB JETZT: Go-Live auf dem VPS (du hast den Zugang)

**Das Deployment ist deine Baustelle — du hast den VPS (`5.231.248.34`), also
ziehst du das durch.** Volle Schritt-für-Schritt-Anleitung: **`GO-LIVE.md`**.
Kurzfassung der Blocker:

1. **Code holen + `.env` setzen** auf dem VPS — Pflichtwerte (sonst bricht der Boot ab):
   `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_DB_CONNECTED=true`, `ADMIN_EMAILS` (deine + Wesams Mail),
   `CRON_SECRET`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` (**Owner**-Key!).
   ➜ **Kein `APP_PASSWORD` mehr** — Auth läuft über Supabase.
2. **DB-Schema + RLS anwenden:** `docker compose run --rm app npm run db:migrate`
   — **`db:migrate`, NICHT `db:push`** (sonst fehlt die komplette Daten-Trennung!).
3. **Starten:** `docker compose up -d --build` + Domain/TLS im `Caddyfile`.
   Port-80-Koexistenz mit deinem Asterisk-certbot beachten (`DEPLOY.md` §5).
4. **Supabase** → Authentication → Site-URL + Redirect-URL (`…/auth/callback`)
   auf die Deploy-Domain setzen.
5. **Erster Login:** mit deiner `ADMIN_EMAILS`-Adresse auf `/signup` → du bist Admin.
   Dann Wesam genauso, dann Mitarbeiter freigeben.

### Außerdem dein Telefonie-Part:
- **Deepgram-Owner-Key** hinterlegen (Member-Key → 403, keine Kunden-Transkription).
- **Phase 7 — eigene easybell-Nummer pro Mitarbeiter:** SIP-Accounts pro Mitarbeiter
  auf dem Asterisk anlegen. Schema-Felder (`profiles.sip*`) existieren; sobald deine
  Accounts stehen, verdrahtet Wesam `/api/sip/config` pro Nutzer.
- **Audio Telefon→Browser** beim Browser-Direktanruf final live testen (Handoff §7).

---

## 🔭 7. Was noch offen ist (kein Code-Blocker)

- **Phase 7 — eigene easybell-Nummer pro Mitarbeiter** (dein Asterisk-Part, siehe Abschnitt 6).
- **Tieferer Souffleur-Inhalt** als nächste Stufe: Gatekeeper-Playbook, Preis-Einwand-
  Matrix, Auto-Closing je Branche als echte Daten-Module + Sprecher-Trennung im Audio.
- **§14-konformes Rechnungs-PDF + Mahnwesen + wiederkehrende Wartungsrechnungen** (Cron-TODO).
- **Recht vor echtem Kundenkontakt:** AV-Verträge (Anthropic/Deepgram/Supabase) +
  Datenschutzerklärung, §201 StGB (Aufnahme-Zustimmung), UWG §7 (Kaltakquise).

> Phase 8 (KI-Bewertung), Letzter-Admin-Schutz, Signup-Retry, `/auth/callback` und
> die RLS-Reproduzierbarkeit sind **erledigt** (siehe Abschnitt 4b).

---

## ⚠️ 8. Finger weg / Vorsicht

- **`src/lib/sip/client.ts`** — das ist deine Domäne (Asterisk-Brücke). Wesams Claude
  hat da **nur eine PII-Log-Zeile** redigiert, sonst nichts angefasst.
- **`.env.local` und `.mcp.json`** sind gitignored — **niemals committen.**
- **Keine persönlichen E-Mails** in den Code committen — immer über `ADMIN_EMAILS`.

---

_Für die volle Architektur-Übersicht: `HANDOFF.md` (älterer Stand, prä-Auth) +
`graphify-out/graph.html` (Wissensgraph). Dieser Bericht hier ist der aktuelle Stand
der Multi-User-/Security-Arbeit (Stand 17.06.2026)._
