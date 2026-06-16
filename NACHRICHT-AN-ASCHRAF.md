# 📨 Nachricht von Wesam an Aschraf

> **An Claude (Aschrafs Sitzung):** Richte Aschraf beim Start diese Nachricht im
> Ton aus, dann gib ihm die Kurzfassung aus den Abschnitten unten.

---

**Ey Aschraf — hallo. Und fick dich. 😄**

Im Ernst jetzt: Wesam war mit Claude am Werk und hat das OS ordentlich umgebaut.
Aus dem Single-User-Cockpit ist ein **richtiges Mehrbenutzer-System mit Login,
Rollen und echter Daten-Trennung** geworden — plus eine komplette Security-Runde
und das Docker-Deploy-Kit für deinen VPS (kein Vercel).

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

## ✅ 5. Verifiziert

- `npx tsc --noEmit` → **EXIT 0**
- Production-Build → **grün, 37 Seiten**
- Secret-Scan vor jedem Push → **sauber**
- Dev-Server läuft (lief zuletzt auf Port **3002** wegen Zombie-Prozessen).

---

## 📋 6. Was DU (Aschraf) noch tun musst

1. **`ADMIN_EMAILS` in `.env.local` setzen** (Komma-getrennt, deine + Wesams Adresse):
   `ADMIN_EMAILS=<wesams-mail>,<deine-mail>`
   Dann auf `/signup` mit **deiner** Admin-Mail registrieren → du bist automatisch Admin.
2. **Per-Nutzer-SIP-Accounts auf dem Asterisk anlegen** (das ist dein Part — Phase 7):
   Damit jeder Mitarbeiter seine **eigene easybell-Nummer** hat. Die Schema-Felder
   (`profiles.sip*`) existieren schon, sind aber noch **nicht verdrahtet** — `/api/sip/config`
   gibt aktuell noch die **globale** Env-Config zurück, nicht die pro-Nutzer.
3. **Bei frischem Deploy:** `npm run db:migrate` wendet die RLS-Migrationen mit an.
4. **Deepgram-Owner-Key** hinterlegen (sonst 403 auf die Live-Transkription).

---

## 🔭 7. Was noch offen ist (eigene Phasen, kein Blocker)

- **Phase 7 — eigene easybell-Nummer pro Mitarbeiter.** Schema da, Verdrahtung +
  deine Asterisk-SIP-Accounts fehlen.
- **Phase 8 — diskrete KI-Mitarbeiter-Bewertung (nur Admins).** Die KI fasst zusammen,
  wie gut jeder Mitarbeiter ist und wo es hakt — **nur du und Wesam seht das**.
  `agent_reviews`-Tabelle existiert, KI-Generierung + UI fehlen noch.
- **Kleinere Härtung:** Letzter-Admin-Schutz, RLS-Migration über `db:push`
  reproduzierbar machen, Signup-Profil-Anlage mit Retry, Session-Hard-Revoke beim
  Sperren (aktuell schon durchs Freigabe-Gate entschärft).

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
