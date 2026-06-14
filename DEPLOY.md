# Deploy — Self-Host auf dem VPS (Docker, ohne Vercel)

Läuft auf demselben VPS wie die Asterisk-Brücke (`5.231.248.34`). Docker ist dort
schon installiert. Das Kit: **Dockerfile** (Next.js standalone) + **docker-compose**
(App + Caddy-TLS + Cron-Sidecar) + **Caddyfile**.

## 1. Code auf den VPS holen
```bash
ssh root@5.231.248.34
git clone https://github.com/wesammoshrif/aw_digital.os.git /opt/aw-os
cd /opt/aw-os
```

## 2. Secrets als `.env` anlegen (NICHT committen)
```bash
cp .env.example .env
nano .env
```
Mindestens ausfüllen:
| Variable | Wert |
|---|---|
| `DATABASE_URL` | Supabase Session-Pooler (wie lokal) |
| `NEXT_PUBLIC_DB_CONNECTED` | `true` |
| `APP_PASSWORD` | **starkes Passwort** → sperrt die ganze App (Pflicht!) |
| `APP_USER` | z.B. `aw` |
| `CRON_SECRET` | beliebiger langer String (schützt den Tick) |
| `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` | Souffleur-KI/Transkription |
| `ASTERISK_WSS/SIP_DOMAIN/SIP_USER/SIP_PASSWORD` | Telefonie (wie in deiner lokalen `.env.local`) |
| `PAGESPEED_API_KEY`, `GOOGLE_PLACES_API_KEY` | Audit/Finder (optional) |
| `RESEND_API_KEY`, `MAIL_FROM` | Termin-Erinnerungen (optional) |
| `OWNER_ID` | wie gehabt |

> `NEXT_PUBLIC_DB_CONNECTED` wird beim **Build** ins Browser-Bundle gebacken —
> compose übergibt es als Build-Arg (Default `true`), also passt das automatisch.

## 3. Domain setzen
In `Caddyfile` die Zeile anpassen. Mit `sslip.io` brauchst du keinen DNS-Eintrag —
`os.5-231-248-34.sslip.io` zeigt automatisch auf die IP, Caddy holt das TLS-Zertifikat
selbst. Mit eigener Domain: einen A-Record auf `5.231.248.34` setzen und hier eintragen.

## 4. Starten
```bash
docker compose up -d --build
docker compose logs -f app     # Status prüfen
```
Danach erreichbar unter **https://os.5-231-248-34.sslip.io** (oder deine Domain) —
beim ersten Aufruf fragt der Browser nach `APP_USER`/`APP_PASSWORD`.

## 5. ⚠️ Port-80-Koexistenz mit der Asterisk-Brücke
Caddy belegt **80 + 443** (für das App-Zertifikat). Die Asterisk-Brücke nutzt
`8089/5060/10000-10200` — **kein Port-Konflikt dort**. ABER: falls das Asterisk-Cert
(`5-231-248-34.sslip.io`) per `certbot --standalone` erneuert wird, braucht das
**auch Port 80** → Konflikt bei der Verlängerung. Lösung (mit Aschraf abstimmen):
- **Empfohlen:** Caddy alle Zertifikate verwalten lassen — Asterisk liest dann das
  Cert aus dem `caddy_data`-Volume statt von certbot.
- Oder: certbot für Asterisk auf **DNS-01** umstellen (braucht kein Port 80).
- Oder: das App-Cert per **DNS-01** in Caddy holen, dann ist Port 80 frei für certbot.

## 6. Updates einspielen
```bash
cd /opt/aw-os && git pull
docker compose up -d --build
```

## 7. Cron
Der `cron`-Container ruft stündlich `http://app:3000/api/cron/tick` mit
`x-cron-secret` (Termin-Erinnerungen + Follow-ups). Läuft automatisch mit — kein
System-crontab nötig. (Die `vercel.json` ist Vercel-spezifisch und wird hier ignoriert.)

## 8. Telefonie-Hinweis
Die Browser-Telefonie braucht **HTTPS** (Mikrofon-/WebRTC-Zugriff) — über Caddy ist
das gegeben. Die `ASTERISK_*`-Variablen in der `.env` zeigen auf die laufende Brücke
(`wss://5-231-248-34.sslip.io:8089/ws`), genau wie lokal.
