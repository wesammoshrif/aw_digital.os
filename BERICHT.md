# AW Digital OS — Status-Bericht

_Stand: 12.06.2026 · Go-Live geplant So 14.06., erster Call-Tag Mo 15.06._

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

**⚠️ Montag live zu testen (geht nur auf deinem Rechner + Konto):**
- WebRTC-Registrierung gegen `wss://webrtc.easybell.de:7443` — der Port ist **nicht** offiziell dokumentiert und unbestätigt.
- WebRTC braucht ggf. das Produkt **Cloud Telefonanlage** (`pbx.easybell.de`); aktueller Registrar ist `voip.easybell.de` (SIP-Trunk). easybell-Produkt im Portal prüfen.
- Wenn WebRTC nicht registriert → `tel:`-Weg nutzen.

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
