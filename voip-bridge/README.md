# AW Digital OS — VoIP-Brücke (Vapi-Nachbau mit Asterisk)

Das hier ist die **WebRTC↔SIP-Brücke**, die genau das macht, wofür Vapi Geld nimmt:
Sie registriert deinen **easybell-SIP-Trunk** (`voip.easybell.de`) und gibt dem
Browser-Dialer im Cockpit einen sicheren **WSS-Endpunkt**. Damit telefonierst du
**echt in-app** im Browser — ohne Minutenpreise, nur die easybell-Gesprächskosten.

```
Browser-Cockpit  ──WebRTC/WSS──►  Asterisk (dein VPS)  ──SIP/RTP──►  easybell-Trunk  ──►  öffentliches Netz
```

## Was du brauchst (einmalig)

1. **Einen kleinen Linux-VPS** mit öffentlicher IP — z.B. Hetzner CX22 (~4 €/Monat), Ubuntu 22.04. Docker drauf.
2. **Eine (Sub-)Domain**, die per DNS-A-Record auf die VPS-IP zeigt — z.B. `voip.deinedomain.de`. (Für das WSS-TLS-Zertifikat — Browser akzeptieren WSS nur mit gültigem Zertifikat.)
3. **Deine easybell-Trunk-Daten** (stehen in `aw-digital-os/.env.local`):
   `EASYBELL_SIP_USERNAME`, `EASYBELL_SIP_PASSWORD`, deine Nummer für die Caller-ID.

## Setup in 5 Schritten

### 1. VPS vorbereiten
```bash
# auf dem VPS:
sudo apt update && sudo apt install -y docker.io docker-compose-plugin certbot
```
Dieses `voip-bridge/`-Verzeichnis auf den VPS kopieren (z.B. per `scp -r` oder git).

### 2. Konfig anpassen — die `CHANGE_ME`-Werte ersetzen
In **`asterisk/pjsip.conf`**:
- `CHANGE_ME_PUBLIC_IP` → öffentliche IP deines VPS (2×)
- `CHANGE_ME_EASYBELL_USER` → `EASYBELL_SIP_USERNAME` (z.B. `004967121546601`) (3×)
- `CHANGE_ME_EASYBELL_PASSWORD` → `EASYBELL_SIP_PASSWORD`
- `CHANGE_ME_WEBRTC_PASSWORD` → ein selbst gewähltes starkes Passwort (merken — kommt auch ins Cockpit)

In **`asterisk/extensions.conf`**:
- `CHANGE_ME_EASYBELL_CLIP` → deine easybell-Rufnummer für die Anzeige, z.B. `4967121546601`

In **`docker-compose.yml`**:
- `CHANGE_ME_DOMAIN` → deine Domain, z.B. `voip.deinedomain.de` (2×)

### 3. TLS-Zertifikat holen (Let's Encrypt)
```bash
# Port 80 muss kurz frei sein:
sudo certbot certonly --standalone -d voip.deinedomain.de
# Zertifikate liegen dann unter /etc/letsencrypt/live/voip.deinedomain.de/
```

### 4. Firewall öffnen (VPS-Provider-Panel ODER ufw)
| Port | Protokoll | Wofür |
|---|---|---|
| 8089 | TCP | WSS (Browser ↔ Asterisk) |
| 5060 | UDP | SIP (Asterisk ↔ easybell) |
| 10000–10200 | UDP | RTP (Sprache) |
| 80 | TCP | nur für certbot (danach optional zu) |

### 5. Starten
```bash
docker compose up -d
docker compose logs -f         # auf "Registered" für easybell warten
```
In der Asterisk-Konsole prüfen, dass der Trunk registriert ist:
```bash
docker compose exec asterisk asterisk -rvvv
> pjsip show registrations      # easybell sollte "Registered" sein
```

## Cockpit verbinden
In `aw-digital-os/.env.local` eintragen (dann Dev-Server neu starten):
```
ASTERISK_WSS=wss://voip.deinedomain.de:8089/ws
ASTERISK_SIP_DOMAIN=voip.deinedomain.de
ASTERISK_SIP_USER=cockpit
ASTERISK_SIP_PASSWORD=<dasselbe wie CHANGE_ME_WEBRTC_PASSWORD>
```
Sind diese gesetzt, telefoniert der Souffleur-Dialer im Browser über deine
Brücke statt direkt gegen easybell (das ging ja nicht).

## Testen
1. Cockpit → Lead öffnen → „Anrufen + Souffleur".
2. Im Popup auf „Anrufen" → der Browser registriert sich gegen Asterisk und wählt raus.
3. Erster Test: deine eigene Handynummer.

## Fehlersuche
- **„Registered" fehlt** → easybell-User/Passwort in `pjsip.conf` falsch, oder Port 5060 UDP zu.
- **Verbindung steht, aber keine Sprache** → RTP-Ports (10000–10200 UDP) zu, oder `external_media_address` ≠ echte VPS-IP.
- **Browser verbindet WSS nicht** → Zertifikat ungültig/Domain stimmt nicht, oder Port 8089 zu.
- **Asterisk-Konsole:** `pjsip set logger on` zeigt den SIP-Verkehr live.
