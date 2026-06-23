# An Aschraf — Audio der Asterisk-Brücke verbessern (Souffleur)

Hi Aschraf, kurz zur Audioqualität beim Browser-Direktanruf. Eine Tiefen-Analyse
hat ergeben: die App-Seite hab ich schon gefixt (Deepgram nova-3, Mikro NS/AGC aus,
Headset-Hinweis, Auto-Reconnect). Was bleibt, sitzt an **deiner Brücke** bzw. in
`src/lib/sip/client.ts` — das fasse ich bewusst nicht an, ist deine Domain. Hier die
konkreten Punkte, nach Wirkung sortiert:

## 1. Sende-Mikro-Constraints in `client.ts` (call())
Aktuell holst du das Sende-Mikro mit `mediaConstraints: { audio: true }`. Das ist
genau das Audio, das beim **Kunden** ankommt — mit Browser-Default-DSP frisst das
aggressive `noiseSuppression`+`autoGainControl` Wortanfänge und lässt den Pegel pumpen.
Bitte explizit setzen:
```js
mediaConstraints: {
  audio: {
    echoCancellation: true,   // an: gegen Lautsprecher-Echo
    noiseSuppression: false,  // aus: verständlichere Stimme
    autoGainControl: false,   // aus: kein Pegel-Pumpen
    channelCount: 1,
  },
  video: false,
}
```

## 2. EIN gemeinsamer Mikro-Stream (gegen Device-Contention)
Das physische Mikro wird aktuell ZWEIMAL geöffnet: einmal von dir (jssip-Anruf),
einmal von mir (Deepgram-Transkription). Zwei Captures auf einem Gerät → unter
Windows/Chromium kratzt/pumpt der Ton auf beiden Wegen. Lösung: `call()` einen
optionalen Parameter `localStream?: MediaStream` geben und per jssip-Session-Option
`{ mediaStream }` den bereits geöffneten Stream durchreichen, statt selbst
`getUserMedia` zu rufen. Ich reiche dir dann meinen `micStreamRef` rein.

## 3. TURN-Server (gegen Einbahn-/abgehacktes Audio)
`pcConfig.iceServers` listet nur Google-STUN, keinen TURN. Bei symmetrischem
NAT/CGNAT/Firmen-Firewall schlägt der direkte RTP-Pfad fehl → einseitiges oder
abgehacktes Audio (genau das „mein Ton geht nicht durch"). Bitte coturn auf der
Brücke (5.231.248.34) aufsetzen: `turn:…:3478` + `turns:…:5349` mit Credentials.
Ich ergänze dann den `turn:`-Eintrag in den iceServers.

## 4. Asterisk-Seite
- Adaptiver Jitterbuffer: `jbenable=yes`, `jbimpl=adaptive` (gegen Stottern/Lücken).
- Saubere Transcodierung: `allow=opus,ulaw`, `ptime=20`, `dtx=no`.
- RTP-Portrange am VPS in der Firewall offen.

## 5. (optional) `remoteAudioEl` per `setSinkId` aufs Headset
Damit die Kundenstimme garantiert ins Headset geht und nicht in die Lautsprecher
(wäre sonst wieder Echo).

Punkt 1+2 bringen am meisten und sind schnell. Sag Bescheid, dann verdrahte ich
den `localStream`-Parameter und den `turn:`-Eintrag auf meiner Seite. Danke dir! 🙏
