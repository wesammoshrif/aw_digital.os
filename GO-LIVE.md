# 🚀 GO-LIVE Runbook — AW Digital OS

Schritt-für-Schritt zum Online-Gehen. Reihenfolge einhalten. Für die Docker-
Details siehe **`DEPLOY.md`**, für die Architektur **`HANDOFF.md`**.

Legende: 🔴 Blocker · 🟡 wichtig · ⚖️ Recht · 🟢 danach

---

## 1. 🔴 Vorbereitung (Supabase)
1. **DB-Schema + RLS anwenden** (sonst kein Login, keine Daten-Trennung):
   ```bash
   npm run db:migrate      # wendet 0001 (Profile/Rollen) + 0002 (RLS) an
   ```
   ⚠️ **`db:migrate`, nicht `db:push`** — `push` überspringt die RLS-Migration.
2. **Supabase → Authentication → URL Configuration:**
   - **Site URL** = deine Deploy-Domain (z.B. `https://os.deine-domain.de`)
   - **Redirect URLs** = `https://…/auth/callback` hinzufügen
3. **E-Mail-Bestätigung** entscheiden (Authentication → Providers → Email):
   - **Aus** = schnellster Start (Konto sofort aktiv).
   - **An** = sicherer; der Bestätigungslink läuft jetzt sauber über
     `/auth/callback` (ist gebaut).

## 2. 🔴 Env auf dem Server (`.env`)
Pflicht (sonst bricht der Boot fail-closed ab):
```
DATABASE_URL=…(Session-Pooler)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
NEXT_PUBLIC_DB_CONNECTED=true
ADMIN_EMAILS=wesam@…,aschraf@…     # beide Admin-Mails
CRON_SECRET=<langer Zufallsstring>
ANTHROPIC_API_KEY=sk-ant-…
DEEPGRAM_API_KEY=<OWNER-Key!>      # Member-Key → 403, keine Transkription
```
Telefonie + optional: `ASTERISK_*`, `RESEND_API_KEY`/`MAIL_FROM`,
`PAGESPEED_API_KEY`, `GOOGLE_PLACES_API_KEY`. Volle Liste: `.env.example`.

## 3. 🔴 Deploy (Docker auf dem VPS)
Siehe `DEPLOY.md`. Kurz:
```bash
ssh root@5.231.248.34
cd /opt/aw-os && git pull            # oder erstmalig: git clone …
cp .env.example .env && nano .env    # Werte aus Schritt 2
docker compose run --rm app npm run db:migrate   # einmalig
docker compose up -d --build
docker compose logs -f app
```

## 4. 🔴 Domain + TLS
- `Caddyfile`: Domain eintragen (oder `sslip.io` zum Testen). Caddy holt das
  TLS-Zertifikat automatisch. Bei eigener Domain: A-Record auf `5.231.248.34`.
- ⚠️ Port-80-Koexistenz mit der Asterisk-Brücke beachten (`DEPLOY.md` §5).

## 5. 🔴 Erster Login
1. `https://…/signup` mit einer **ADMIN_EMAILS**-Adresse → wird automatisch Admin.
2. Funktioniert das Dashboard? Dann zweiten Admin (Aschraf) genauso registrieren.
3. Mitarbeiter registrieren sich selbst → erscheinen unter **/team** → Admin gibt frei.

## 6. 🟡 Funktions-Smoke-Test (eingeloggt)
- [ ] Lead anlegen / Finder → Lead landet in der Pipeline
- [ ] Souffleur öffnen → Wärme-Leiste + Diktat-Satz erscheinen
- [ ] PC-Ton verbinden → Kunden-Transkript läuft (braucht Deepgram-OWNER-Key)
- [ ] Test-Anruf → Auflegen beendet den Anruf (Browser-Direktanruf)
- [ ] Rechnung/Angebot erstellen, Termin anlegen
- [ ] **/team/[mitarbeiter]** → „Bewertung generieren" (nur als Admin sichtbar)
- [ ] Als normaler Agent prüfen: sieht **nur eigene** Daten, **kein** /team

## 7. 🟡 Telefonie scharf stellen
- **tel:-Weg** (easybell-App am Handy): läuft sofort, Souffleur hört per PC-Ton mit.
  Auflegen muss am Handy passieren (Browser hat dort kein Signal).
- **Browser-Direktanruf** (Asterisk-Brücke): Audio Telefon→Browser final testen
  (Handoff §7). Auflegen übers Cockpit sendet jetzt das BYE.
- **Phase 7** (eigene Nummer pro Mitarbeiter): noch offen — Aschraf legt pro
  Mitarbeiter SIP-Accounts auf dem Asterisk an, dann werden die `profiles.sip*`
  verdrahtet.

## 8. ⚖️ Recht (vor echtem Kundenkontakt)
- [ ] **AV-Verträge**: Anthropic + Deepgram + Supabase (Transkripte/Daten gehen
  dorthin) + Hinweis in der Datenschutzerklärung.
- [ ] **§201 StGB**: Gesprächsaufnahme nur mit Zustimmung (Consent-Toggle im
  Souffleur, Standard „nichts speichern").
- [ ] **UWG §7 / Kaltakquise**: B2B-Telefon nur bei mutmaßlicher Einwilligung;
  Verzeichnis-Leads sind angreifbar (Erstkontakt-Strategie beachten).
- [ ] **§14 UStG**: Rechnungs-PDF rechtssicher (Pflichtangaben) — noch offen.

## 9. 🟢 Direkt nach Go-Live (nicht blockend)
- [ ] §14-Rechnungs-PDF + Mahnwesen + wiederkehrende Wartungsrechnungen (Cron-TODO)
- [ ] Kunden-Onboarding-Modul in der Delivery
- [ ] Monitoring/Backups der Supabase-DB
- [ ] Phase 7 (eigene easybell-Nummer pro Mitarbeiter) abschließen

---

## Schnell-Rollback
```bash
cd /opt/aw-os && git checkout <letzter-guter-commit> && docker compose up -d --build
```
DB-Migrationen sind additiv/idempotent — ein Rollback des Codes braucht i.d.R.
keinen DB-Rollback.
