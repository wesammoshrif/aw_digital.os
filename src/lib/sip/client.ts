/**
 * easybell-SIP Browser-Softphone (JsSIP-Wrapper)
 *
 * Architektur + VPS-Setup: HANDOFF.md → Abschnitt 8 (Session-Log 14.06.2026)
 * Asterisk-Config live unter /opt/aw-voip-bridge/ auf 5.231.248.34
 */

type JsSIPUA = {
  on: (ev: string, cb: (e: unknown) => void) => void;
  start: () => void;
  stop: () => void;
  call: (target: string, opts: unknown) => unknown;
};
type RTCSessionExt = {
  on: (ev: string, cb: (e: unknown) => void) => void;
  terminate: () => void;
  connection: RTCPeerConnection;
};
type JsSIPWS = unknown;

export interface SipConfig {
  username: string;
  password: string;
  registrar: string;
  wss: string;
  displayName?: string;
  clip?: string | null;
}

export type SipStatus =
  | "idle"
  | "connecting"
  | "registered"
  | "ringing"
  | "in-call"
  | "ended"
  | "error";

export interface SipEvents {
  status: (s: SipStatus, detail?: string) => void;
  remoteStream: (stream: MediaStream) => void;
}

export class EasybellSipClient {
  private ua: JsSIPUA | null = null;
  private session: RTCSessionExt | null = null;
  private listeners: Partial<SipEvents> = {};
  private remoteAudioEl: HTMLAudioElement | null = null;
  private cfg: SipConfig | null = null;
  private remoteAttached = false;

  on<K extends keyof SipEvents>(ev: K, cb: SipEvents[K]) {
    this.listeners[ev] = cb;
  }

  private emit<K extends keyof SipEvents>(ev: K, ...args: Parameters<SipEvents[K]>) {
    (this.listeners[ev] as ((...a: Parameters<SipEvents[K]>) => void) | undefined)?.(...args);
  }

  private attachRemoteAudio(stream: MediaStream) {
    if (this.remoteAttached) return;
    const tracks = stream.getAudioTracks();
    console.log("[SIP] attachRemoteAudio — audio tracks:", tracks.length, tracks.map(t => t.label));
    if (tracks.length === 0) return;

    this.remoteAttached = true;
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = stream;
      this.remoteAudioEl.muted = false;
      this.remoteAudioEl.volume = 1.0;
      this.remoteAudioEl.play().catch(err =>
        console.warn("[SIP] autoplay blocked:", err)
      );
    }
    this.emit("remoteStream", stream);
  }

  async connect(cfg: SipConfig): Promise<void> {
    this.cfg = cfg;
    this.remoteAttached = false;

    // Audio-Element sofort anlegen — vor jedem async-Code
    if (!this.remoteAudioEl) {
      this.remoteAudioEl = document.createElement("audio");
      this.remoteAudioEl.autoplay = true;
      this.remoteAudioEl.muted = false;
      this.remoteAudioEl.volume = 1.0;
      document.body.appendChild(this.remoteAudioEl);
      console.log("[SIP] audio element created");
    }

    const mod = await import("jssip");
    const JsSIP = (mod as { default?: unknown }).default ?? mod;
    (JsSIP as unknown as { debug: { enable: (k: string) => void } }).debug?.enable?.("JsSIP:*");

    this.emit("status", "connecting");

    const socket: JsSIPWS = new (JsSIP as unknown as {
      WebSocketInterface: new (url: string) => JsSIPWS;
    }).WebSocketInterface(cfg.wss);

    const ua: JsSIPUA = new (JsSIP as unknown as { UA: new (opts: unknown) => JsSIPUA }).UA({
      sockets: [socket],
      uri: `sip:${cfg.username}@${cfg.registrar}`,
      authorization_user: cfg.username,
      password: cfg.password,
      display_name: cfg.displayName ?? "AW Digital",
      register: true,
      register_expires: 600,
      session_timers: false,
      user_agent: "AW Digital OS / JsSIP",
    });
    this.ua = ua;

    ua.on("registered", () => {
      console.log("[SIP] registered ✓");
      this.emit("status", "registered");
    });
    ua.on("registrationFailed", (e: unknown) => {
      const cause = (e as { cause?: string })?.cause ?? "unbekannt";
      console.error("[SIP] registrationFailed:", cause);
      this.emit("status", "error", `Registrierung fehlgeschlagen: ${cause}`);
    });
    ua.on("disconnected", () => {
      console.warn("[SIP] disconnected");
      this.emit("status", "error", "WebSocket-Verbindung verloren");
    });

    ua.start();
  }

  async call(targetNumber: string, localStream?: MediaStream | null): Promise<void> {
    if (!this.ua) throw new Error("SIP nicht verbunden");
    this.remoteAttached = false;

    const digits = targetNumber.replace(/\D/g, "");
    const e164 = targetNumber.trim().startsWith("+")
      ? "00" + digits
      : digits.startsWith("0") && !digits.startsWith("00")
        ? digits
        : digits;
    const domain = this.cfg?.registrar ?? "voip.easybell.de";
    const target = `sip:${e164}@${domain}`;
    // PII-Redaction: volle Rufnummer NICHT loggen, nur die letzten 3 Ziffern.
    console.log("[SIP] dialing → sip:***" + e164.slice(-3) + "@" + domain);

    // Mikro: WENN ein bereits offener Stream übergeben wurde (Deepgram hält ihn
    // schon), den NUTZEN — sonst öffnet jssip ein zweites getUserMedia und
    // createLocalDescription() hängt (Mikro doppelt belegt → kein INVITE).
    // Fallback (kein Stream): jssip holt selbst, NS/AGC aus, Echo an, mono.
    const useStream = !!(localStream && localStream.getAudioTracks().length > 0);
    console.log(
      useStream
        ? "[SIP] nutze vorhandenen Mikro-Stream (kein zweites getUserMedia)"
        : "[SIP] kein geteilter Stream → eigenes getUserMedia",
    );
    const mediaOpt = useStream
      ? { mediaStream: localStream }
      : {
          mediaConstraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: false,
              autoGainControl: false,
              channelCount: 1,
            },
            video: false,
          },
        };
    const session = this.ua.call(target, {
      ...mediaOpt,
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      pcConfig: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        rtcpMuxPolicy: "require",
        bundlePolicy: "max-bundle",
      },
    } as unknown) as RTCSessionExt;
    this.session = session;
    this.emit("status", "ringing");

    // ── Strategie 1: peerconnection-Event + track-Event ──────────────────
    session.on("peerconnection", (e: unknown) => {
      const pc = (e as { peerconnection: RTCPeerConnection }).peerconnection;
      console.log("[SIP] peerconnection state:", pc.signalingState, "ice:", pc.iceConnectionState);

      pc.addEventListener("track", (ev: RTCTrackEvent) => {
        console.log("[SIP] track →", ev.track.kind, ev.track.id, "streams:", ev.streams.length);
        // ev.streams[0] kann undefined sein → Track in neuen Stream wrappen
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        if (ev.track.kind === "audio") this.attachRemoteAudio(stream);
      });

      // ICE-State für Debugging
      pc.addEventListener("iceconnectionstatechange", () =>
        console.log("[SIP] ICE state:", pc.iceConnectionState)
      );
      pc.addEventListener("connectionstatechange", () =>
        console.log("[SIP] connection state:", pc.connectionState)
      );
    });

    // ── Strategie 2: confirmed-Event — getReceivers() als sicherer Fallback ─
    session.on("confirmed", () => {
      console.log("[SIP] confirmed ✓");
      this.emit("status", "in-call");

      // session.connection ist der RTCPeerConnection in jssip
      const pc = session.connection;
      if (!pc) { console.warn("[SIP] session.connection fehlt"); return; }

      console.log("[SIP] receivers:", pc.getReceivers().length);

      if (!this.remoteAttached) {
        const remote = new MediaStream();
        pc.getReceivers().forEach(r => {
          console.log("[SIP] receiver track:", r.track?.kind, r.track?.readyState);
          if (r.track?.kind === "audio") remote.addTrack(r.track);
        });
        if (remote.getAudioTracks().length > 0) {
          this.attachRemoteAudio(remote);
        } else {
          console.warn("[SIP] confirmed: keine Audio-Tracks in getReceivers()");
        }
      }
    });

    session.on("ended", (e: unknown) => {
      console.log("[SIP] ended", e);
      this.emit("status", "ended");
    });

    session.on("failed", (e: unknown) => {
      console.error("[SIP] call failed", e);
      const ev = e as {
        cause?: string;
        originator?: string;
        message?: { status_code?: number; reason_phrase?: string };
      };
      const detail = [
        ev?.cause,
        ev?.message?.status_code ? `${ev.message.status_code} ${ev.message.reason_phrase ?? ""}`.trim() : null,
        ev?.originator ? `(von ${ev.originator})` : null,
      ].filter(Boolean).join(" · ");
      this.emit("status", "error", `Anruf fehlgeschlagen: ${detail || "unbekannt"}`);
    });
  }

  hangup() {
    try { this.session?.terminate(); } catch { /* ignore */ }
    this.session = null;
    this.remoteAttached = false;
  }

  disconnect() {
    this.hangup();
    try { this.ua?.stop(); } catch { /* ignore */ }
    this.ua = null;
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl.remove();
      this.remoteAudioEl = null;
    }
    this.emit("status", "idle");
  }
}
