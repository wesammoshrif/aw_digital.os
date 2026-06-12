# AW Digital OS — Status-Bericht

_Stand: 13.06.2026 · Go-Live geplant So 14.06., erster Call-Tag Mo 15.06._

## Production-Go-Live-Checkliste

**✅ Erledigt:**
- Supabase verbunden (Session-Pooler), Schema migriert (`drizzle/`)
- **DB production-clean** — alle Demo/Mock-Daten gelöscht (`npm run db:clear`). App rendert leer + sauber.
- Build grün, App läuft im DB-Modus.

**📋 Vor dem Online-Gehen noch offen (brauchen Entscheidung/Account):**
- [ ] **Echte Leads laden** — über `/leads/finder` (OSM live; Google-Maps-Key für mehr Telefonnummern) oder Import. _(Deine Aktion, Montag)_
- [ ] **Auth/Login** — `middleware.ts` + Supabase-SSR, `OWNER_ID` aus Session statt Header. _Nur nötig fürs Online-Gehen; lokal/Single-User nicht zwingend._
- [ ] **RLS-Policies** in Supabase (Mandantentrennung).
- [ ] **Deployment** — Vercel (env vars + Cron). Braucht deinen Vercel-Account.
- [ ] **Telefonie-Brücke** — Asterisk-VPS (`voip-bridge/`), wartet auf Server-IP.
- [ ] Google-Maps-Key (`GOOGLE_PLACES_API_KEY`), Resend-Key für Reminder-Mails.

**Für Montag (lokal) ist die App nutzbar:** Leads finden → anrufen (Zoiper-Trunk-Stopgap) → Souffleur → Pipeline. Auth/Deploy sind erst fürs Online-Gehen Pflicht.

---


Dieser Bericht hält fest, was **echt** funktioniert, was **Mock** ist und was vor
dem Supabase-Anschluss noch offen ist. Mock-Modus ist aktiv, solange keine
`DATABASE_URL` gesetzt ist (`src/lib/mode.ts`).

---

## 1. Telefonie / easybell — getestet 12.06.

**Ergebnis: Die von Gemini gebaute REST-API ist halluziniert und wurde entfernt.**

| Endpoint | Test | Ergebnis |
|---|---|---|
| `api.easybell.de` (REST Click-to-Call) | DNS + HTTP | ❌ **Domain existiert nicht** (`Non-existent domain`, ECONNREFUSED) |
| `webrtc.easybell.de` (WebRTC-Softphone) | DNS | ✅ existiert (138.201.252.230) |
| `voip.easybell.de` (SIP-Trunk) | DNS | ✅ existiert (195.185.187.16) |

**Gemacht:**
- Tote Dateien gelöscht: `src/app/api/sip/call/route.ts`, `src/lib/integrations/easybell.ts`
- „Anrufen"-Button feuert jetzt **direkt** `tel:` (kein DNS-Timeout mehr) + öffnet Souffleur-Popup
- `.env.local` bereinigt (REST-Variablen raus)

**Zwei reale Anruf-Wege (beide behalten):**
1. **`tel:`-Link** (Lead-Seite) → easybell-Desktop-App / Systemtelefon übernimmt. Zuverlässig.
2. **WebRTC-Softphone** (im Souffleur-Popup, `SipDialer` + jssip) → In-Browser-Anruf, Remote-Audio geht direkt an Deepgram.

**WebRTC-WSS verifiziert 12.06.2026 — kein nutzbarer Endpoint:**
- `wss://webrtc.easybell.de:7443` → Port **zu**.
- `wss://webrtc.easybell.de:443/` → HTTP **200** (nur nginx-Begrüßungsseite, kein WS-Upgrade).
- `wss://webrtc.easybell.de:443/ws` → **404**.
- `wss://voip.easybell.de` → spricht kein WSS (reines SIP).
- easybell-Doku nennt **keinen** Browser-WebRTC/WSS-Endpoint für SIP-Trunks (nur App + Zoiper + Cloud Telefonanlage).

**Konsequenz:** Browser-WebRTC funktioniert mit dem SIP-Trunk nicht. **`tel:`-Link ist der Arbeitsweg** (öffnet die easybell-Desktop-App, die gegen den Trunk registriert ist). Der Browser-Dialer im Souffleur ist auf „experimentell" zurückgestuft (kein Auto-Fehler mehr). In-Browser-Telefonie nur möglich, wenn easybell-Support ein WSS-Gateway der Cloud Telefonanlage (`pbx.easybell.de`) liefert.

---

## 2. Rechnungen & Angebote — MOCK ✅ (neu 12.06.)

Angebote sind **Teil der Rechnungen** (eine Tabelle `invoices`, unterschieden über `kind`).

**Schema (`src/db/schema.ts`):**
- `invoices.kind`: `"quote"` (Angebot) | `"invoice"` (Rechnung)
- `invoiceStatusEnum` erweitert um `accepted`, `declined` (Angebot-Lebenszyklus)
- `invoices.convertedInvoiceId`: verweist von angenommenem Angebot auf die erzeugte Rechnung

**Mock-Daten (`src/lib/mock/data.ts`):**
- 5 Angebote: 1 angenommen (→ Rechnung), 2 versendet, 1 Entwurf, 1 abgelehnt
- 4 Rechnungen: 2 bezahlt, 1 versendet, 1 überfällig (Mahn-Demo)

**UI (`/finances`):** KPIs (offene Angebote, offene Rechnungen, überfällig, bezahlt lfd. Monat) + getrennte Tabellen Angebote / Rechnungen. Belegnummern: `AN-…` / `RE-…`.

**Noch nicht:** Erstellen/Bearbeiten (Buttons sind Platzhalter), PDF-Erzeugung, Angebot→Rechnung-Umwandlung per Klick.

---

## 3. Termine & Termin-Erinnerung — MOCK ✅ (neu 12.06.)

**Schema (`appointments`):** Felder `title`, `reminderAt` (Erinnerungszeitpunkt), `reminderSentAt` (schon raus?) ergänzt.

**Mock-Daten:** 4 Termine — heute (Erinnerung fällig), morgen, übermorgen, 1 erledigt (Erinnerung war raus).

**UI (`/termine`, neu):** Banner „Erinnerung fällig", Anstehend/Vergangen getrennt, Erinnerungs-Status pro Termin (gesendet / fällig / geplant / keine). Sidebar-Eintrag „Termine" ergänzt.

**Noch nicht:** Termin anlegen/bearbeiten, echter Erinnerungs-Versand (Mail/Push), .ics-Export.

---

## 4. Build & Aufräumen

- 64 `// ADDED BY ASSISTANT`-Markerkommentare entfernt.
- Build-Fehler gefixt: fehlende Imports (`Link` in CallMode, `Badge` in SipDialer).
- **Vorbestehender Build-Blocker gefixt:** `isMockMode` in db-freies Modul `src/lib/mode.ts` ausgelagert — vorher zog der Client-Component `leads/new` über `store.ts` das `postgres`-Paket (tls/net/fs) in den Browser-Bundle → Build brach ab. `npm run build` läuft jetzt sauber (19 Routen).

---

## 5. Offen vor Supabase-Anschluss

- [ ] **Supabase anbinden** (zum Schluss): `DATABASE_URL` setzen → `npx drizzle-kit push` → Mock-Daten migrieren. Danach schaltet `isMockMode` automatisch ab.
- [ ] GeminiChat-Widget ist eine **Attrappe** (setTimeout-Antwort), ruft die echte Route `/api/ai/strategy` nicht auf. Naming „Gemini" überall, nutzt aber Claude.
- [ ] `api/ai/strategy` nutzt veraltetes Modell `claude-3-5-haiku-latest` (aktuell wäre `claude-haiku-4-5`).
- [ ] Projekte/Finanzen/Termine: nur Lese-Ansichten, kein CRUD.
- [ ] Auto-Cadence im Backend verdrahten (README-TODO).
