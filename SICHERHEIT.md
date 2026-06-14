# Sicherheit — Audit & Remediation (security-wesam)

Stand: 14.06.2026 · Stack: Next.js 16.2.7, Drizzle auf Supabase-Postgres, HTTP-Basic-Auth, Self-Host Docker.
Audit: `security-wesam` Phase 1 (41 Befunde, adversarial verifiziert). Diese Datei dokumentiert die umgesetzten Code-Fixes (Phase 2) und die verbleibenden manuellen To-dos.

## ✅ Umgesetzt (Code, Phase 2)

| Bereich | Was | Dateien |
|---|---|---|
| **Auth fail-closed** | In Production ohne `APP_PASSWORD` → 503 (Middleware) + Boot-Abbruch | `src/middleware.ts`, `src/instrumentation.ts` |
| **Defense-in-Depth** | `requireAuth()` am Anfang JEDES Route-Handlers (Middleware ist nicht mehr die einzige Grenze) | `src/lib/api.ts`, alle `src/app/api/**/route.ts` |
| **Timing-safe** | Passwort-/Secret-Vergleich konstantzeitig (kein `===`) | `src/lib/auth.ts` |
| **Rate-Limit** | In-Memory-Brute-Force-Schutz pro IP (10 Fehlversuche / 5 min → 429) | `src/middleware.ts` |
| **Deepgram-Key** | Roh-Key-Fallback entfernt — Account-Key verlässt nie den Server | `src/app/api/souffleur/deepgram-token/route.ts` |
| **Cron-Härtung** | `CRON_SECRET` in Production verpflichtend, timing-safe, nur noch POST | `src/app/api/cron/tick/route.ts` |
| **IDOR-Schutz** | `ownerId`-Scope in allen `[id]`-Lese/Schreibpfaden | `src/lib/store.ts`, `leads/[id]`, `invoices/[id]/convert` |
| **Security-Header** | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (Mikrofon=self) | `next.config.ts` |
| **Eingabevalidierung** | Zod-`safeParse` für alle mutierenden Routen | `src/lib/validation.ts` |
| **CSRF** | Same-Origin-Check für mutierende Methoden | `src/lib/api.ts` |
| **Fehler-Sanitizing** | Keine rohen Fehlerobjekte mehr an den Client; Details nur ins Log | `src/lib/api.ts` (`serverError`), error.tsx, global-error.tsx |
| **PII-Logs** | Telefonnummer (SIP) und Empfänger-E-Mail maskiert | `src/lib/sip/client.ts:144`, `src/lib/email.ts` |
| **DSGVO Art. 17** | DELETE-Endpoint für Leads (kaskadiert) | `src/app/api/leads/[id]/route.ts` |
| **DSGVO Art. 15/20** | Export-Endpoint (alle Daten eines Leads als JSON) | `src/app/api/leads/[id]/export/route.ts` |
| **Supply Chain** | esbuild-High-Vulns via `overrides` geschlossen; Dependabot + CI | `package.json`, `.github/` |

## ⚠️ Wichtige Hinweise / Caveats

- **`APP_PASSWORD` ist jetzt Pflicht in Production.** Ohne setzt die App jeden Request auf 503 und der Boot bricht ab. Ebenso `CRON_SECRET` für den Cron-Endpoint.
- **DELETE eines Leads kaskadiert** laut Schema auf `activities`, `calls`, `appointments`, `projects` und **`invoices`**. Bei steuerrelevanten Belegen die **Aufbewahrungspflicht (§147 AO, 10 Jahre)** beachten — ggf. vor dem Löschen Rechnungen separat exportieren/archivieren.
- **CSP** erlaubt `'unsafe-inline'`/`'unsafe-eval'` für Scripts (Next-Hydration) und `wss:` (Deepgram/SIP). Späterer Härtungsschritt: nonce-basierte strikte `script-src`.
- **postcss (moderate)** bleibt offen — der Fix würde Next.js auf 9.3.3 herunterstufen. Niedrige Praxisrelevanz (kein Verarbeiten fremder CSS), von Dependabot getrackt.
- **`src/lib/sip/client.ts`** ist Aschrafs Domäne — dort wurde NUR die eine PII-Log-Zeile (Rufnummer maskiert) angefasst, keine Telefonie-Logik.

## ☐ Manuelle To-dos (außerhalb Code — Dashboard / Recht / Vertrag)

**DSGVO / Recht**
- [ ] **AVV/DPA** mit allen Auftragsverarbeitern abschließen: Supabase, Anthropic, Deepgram, Resend, VPS-Betreiber (Asterisk). (Art. 28)
- [ ] **Drittlandtransfer USA** per SCC/DPF absichern und im VVT dokumentieren (Supabase/Anthropic/Deepgram sind US-Firmen). (Art. 44 ff.)
- [ ] **TOM-Dokument**, **Datenschutzerklärung** (in der App verlinkt) und **Löschkonzept** mit Fristen erstellen.
- [ ] **Datenpannen-Notfallplan**: zuständig ist der LfDI Rheinland-Pfalz, Meldung binnen 72 h (Art. 33).
- [ ] **VVT** (Verzeichnis von Verarbeitungstätigkeiten) führen.

**Supabase-Dashboard / Infrastruktur**
- [ ] **Backups + PITR** aktivieren, einen Restore in Staging testen und Datum protokollieren.
- [ ] **Network Restrictions / IP-Allowlist** für den DB-Zugriff setzen (Project Settings → Database).
- [ ] **Data-API / PostgREST** prüfen: ist sie exponiert? Sensible Tabellen in eigenes Schema oder Data-API deaktivieren. Achtung: bei aktiver Data-API + `anon`-Key ohne RLS wäre Direktzugriff möglich.
- [ ] **Eingeschränkte App-DB-Rolle** statt des Pooler-Superusers (`postgres.<ref>`) erwägen (NOBYPASSRLS) — Voraussetzung für echtes RLS bei späterer Mandantenfähigkeit.

**Monitoring**
- [ ] **Alarmierung** einrichten (z.B. Sentry): Fehlerraten, gehäufte 401, neue Fehler.

## ⊘ Nicht zutreffend (architekturbedingt)
Klassisches Supabase-RLS mit `auth.uid()`, Google/Gmail-OAuth-Härtung, `getSession`-vs-`getUser`, `SECURITY DEFINER`-`search_path` — entfallen, weil kein supabase-js/JWT und kein OAuth im Einsatz ist (reines Drizzle + Basic-Auth, Single-Org).

## Wartung
Vor jedem Release `/security-wesam` erneut laufen lassen. Dependabot hält die Abhängigkeiten aktuell (`.github/dependabot.yml`). CI prüft Build + Tests + `npm audit --audit-level=high` (`.github/workflows/ci.yml`).
