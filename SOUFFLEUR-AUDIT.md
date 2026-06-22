# Souffleur-Audit — Audioqualität + Cold-Call-Agent

Ergebnis einer Tiefen-Recherche (8-Agenten-Schwarm + graphify, 22.06.2026). Ziel:
„Ton kacke an beiden Seiten" root-causen **und** den Souffleur so vereinfachen,
dass ein **17-Jähriger ohne Erfahrung** geführt wird und Umsatz macht.

---

## 1. Audio — warum es kacke ist (mehrere Ursachen, verstärken sich)

| # | Ursache | Seite | Status |
|---|---------|-------|--------|
| 1 | **Kein Headset** → Kundenstimme aus Lautsprecher zurück ins Mikro. Browser-AEC kann SIP-/Systemaudio **nicht** entfernen → Echo beidseitig, Kunde landet als „Berater". | beide | ⚠️ Hinweis-Banner gesetzt (echtes Gate = Disziplin) |
| 2 | **Mikro doppelt geöffnet** (jssip-Anruf + Deepgram) → Device-Contention, Pegel pumpt. | mikro | 🔧 offen (App-Workaround / Aschraf) |
| 3 | **tel:-Weg (Handy am Lautsprecher)** hat keinen sauberen Kundenkanal. | kunde | 🔧 offen (Direktanruf = Standard) |
| 4 | Deepgram **nova-2 statt nova-3** (DE-Telefon). | deepgram | ✅ behoben → nova-3 |
| 5 | Aggressives **NS/AGC** am Mikro frisst Wortanfänge. | mikro | ✅ behoben → NS/AGC=false, AEC=true |
| 6 | Kein **Reconnect mit Recorder-Neustart** bei WS-Abriss (WebM-Header weg → Transkript stirbt still). | deepgram | 🔧 offen |
| 7 | **PC-Ton + SIP gleichzeitig** → Doppel-Transkription. | beide | 🔧 offen (gegenseitig sperren) |
| 8 | endpointing zu kurz → Fragment-Bruch. | deepgram | ✅ 300→500 ms |

**Wichtig:** `encoding`/`sample_rate` bleiben **bewusst ungesetzt** (webm/opus ist
containerisiert, Deepgram liest den Header — Setzen zerschießt den Stream).

### In diesem Commit behoben (App-Code)
- `SouffleurRoom.tsx` DG_URL: `model=nova-2` → `nova-3`, `endpointing=300` → `500`.
- `SouffleurRoom.tsx` startMic: `noiseSuppression:false, autoGainControl:false` (AEC bleibt an).
- Headset-Pflicht-Banner über der Anruf-Steuerung.

### Noch offen, App-Code (Block 2)
- Mikro nur EINE Session im Live-Anruf (kein doppeltes getUserMedia).
- Browser-Direktanruf als Standard; tel:-Weg als Souffleur-Quelle aufgeben; PC-Ton während SIP sperren.
- WS-Reconnect: bei Abriss IMMER Recorder **und** WS zusammen neu (frischer WebM-Header), kleiner Backoff.
- `getDisplayMedia`: `stream.getAudioTracks().length===0` → Warnung „Audio-Haken vergessen"; `suppressLocalAudioPlayback:true`.

---

## 2. Aschraf / Asterisk-Brücke (client.ts NICHT editiert — nur Vorschläge)

> `src/lib/sip/client.ts` ist Aschrafs Domain. Folgende Punkte bitte dort / an der
> Asterisk-Brücke (5.231.248.34) umsetzen:

1. **Sende-Mikro-Constraints** (`client.ts` call(), aktuell `audio:true`):
   `{ echoCancellation:true, noiseSuppression:false, autoGainControl:false, channelCount:1 }`
   → AGC/NS aus = verständlichere Berater-Stimme beim Kunden; AEC an gegen Echo.
2. **EIN gemeinsamer Mikro-Stream:** `call()` einen optionalen `localStream?: MediaStream`
   geben und per jssip-Session-Option `{ mediaStream }` den bereits geöffneten
   `micStreamRef` durchreichen — statt zweitem `getUserMedia` (behebt Device-Contention).
3. **TURN-Server** ergänzen (aktuell nur Google-STUN): coturn auf der Brücke
   (`turn:…:3478` + `turns:…:5349` mit Credentials) → behebt Einbahn-/Teil-Audio in
   restriktiven Netzen (CGNAT/Firmen-Firewall). App ergänzt den `turn:`-Eintrag, sobald verfügbar.
4. **`remoteAudioEl` per `setSinkId`** fest aufs Headset-Ausgabegerät routen.
5. **Asterisk:** adaptiver Jitterbuffer (`jbenable=yes, jbimpl=adaptive`), saubere
   Opus↔G.711-Transcodierung (`allow=opus,ulaw, ptime=20, dtx=no`), RTP-Ports offen.

---

## 3. Cold-Call-Agent — „17-Jähriger macht Umsatz" (Block 2, UX)

Doktrin der Live-Sales-Copilots (Gong/Balto/Cresta): **immer nur EINE Sache zeigen.**

1. **Eine große „JETZT SAGEN"-Karte** (Teleprompter), nie eine Liste. (Basis steht.)
2. **Kurze, umgangssprachliche Ein-Zeiler**, You-Phrasing („Sie/Ihr Betrieb"), „wir" statt „ich".
3. **Hartkodierter Permission-Opener** („Geben Sie mir 30 Sekunden, warum ich anrufe? Wenn's nichts ist, legen wir auf.").
4. **Einwand-Trigger → je EINE Konter-Karte** (Anerkennen → Drehen → Frage, max. 2, dann höflich raus). Trigger für: „zu teuer", „hab schon Website", „kein Bedarf", „keine Zeit", „schick mir was per Mail".
5. **Abschluss erzwingen:** Alternativfrage auf den Termin („Do 10 oder Fr 14 Uhr?", nie ja/nein, nie am Telefon verkaufen).
6. **5-Phasen-Zustandsmaschine** mit sichtbarem Fortschritt: Opener → Aufhänger → 2-3 Bedarfsfragen → Einwand-Loop → Termin.
7. **Status-Streifen** (Phase, Wärme, Redeanteil) — getrennt von der Karte.
8. **Redeanteil-Nudge** bei >60 % Eigenanteil; **Tonalitäts-Cue** „Langsamer. Lächeln. Atmen.".
9. **„Ich hab schon was für Sie gebaut"** als Termin-Türöffner (Mockup der Bestandsseite vorab).
10. **Pflicht-Lücken-Checkliste** je Phase (Entscheider/Bedarf/nächster Schritt).

Betroffene Dateien: `suggest/route.ts` (KI-Prompt), `playbook.ts`, `strategies.ts`,
`phases.ts`, `tradePlaybook.ts`, `SouffleurRoom.tsx` (UI).

---

## 4. Testen (beide Deutungen getrennt, sonst maskieren sie sich)
- **Anruf-Audio:** mit Headset einen echten Browser-Direktanruf führen → hört der Kunde dich klar, hörst du ihn klar?
- **Transkription:** zappelt der Pegel + ticken Wörter durch (Berater + Kunde getrennt)?
- Bei WS-Abriss (Tab-Wechsel/Netz): kommt die Erkennung von selbst zurück? (→ Block 2 Reconnect)
