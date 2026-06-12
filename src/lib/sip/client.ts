/**
 * easybell-SIP Browser-Softphone (JsSIP-Wrapper)
 * ─────────────────────────────────────────────────────────────
 * Verbindet sich per WSS gegen den easybell-WebRTC-Endpunkt,
 * registriert mit den SIP-Credentials und liefert einfache
 * call()/hangup()-Methoden + Events.
 *
 * Liefert auch den eingehenden Remote-Stream — den verbindet das
 * Souffleur-UI direkt mit Deepgram (kein Screen-Sharing nötig).
 */

/* JsSIP-Typen sind nicht exportiert — wir typisieren minimal lokal. */
type JsSIPUA = {
  on: (ev: string, cb: (e: unknown) => void) => void;
  start: () => void;
  stop: () => void;
  call: (target: string, opts: unknown) => unknown;
};
type RTCSession = {
  on: (ev: string, cb: (e: unknown) => void) => void;
  terminate: () => void;
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
  private session: RTCSession | null = null;
  private listeners: Partial<SipEvents> = {};
  private remoteAudioEl: HTMLAudioElement | null = null;
  private cfg: SipConfig | null = null;

  on<K extends keyof SipEvents>(ev: K, cb: SipEvents[K]) {
    this.listeners[ev] = cb;
  }

  private emit<K extends keyof SipEvents>(
    ev: K,
    ...args: Parameters<SipEvents[K]>
  ) {
    const cb = this.listeners[ev] as
      | ((...a: Parameters<SipEvents[K]>) => void)
      | undefined;
    cb?.(...args);
  }

  async connect(cfg: SipConfig): Promise<void> {
    this.cfg = cfg;
    // JsSIP nur clientseitig importieren (window-abhängig)
    const mod = await import("jssip");
    const JsSIP = (mod as { default?: unknown }).default ?? mod;
    // Debug-Logs an, damit easybell-Antworten in der Konsole sichtbar sind
    (JsSIP as unknown as { debug: { enable: (k: string) => void } }).debug?.enable?.("JsSIP:*");

    this.emit("status", "connecting");
    const socket: JsSIPWS = new (
      JsSIP as unknown as { WebSocketInterface: new (url: string) => JsSIPWS }
    ).WebSocketInterface(cfg.wss);

    const ua: JsSIPUA = new (
      JsSIP as unknown as { UA: new (opts: unknown) => JsSIPUA }
    ).UA({
      sockets: [socket],
      uri: `sip:${cfg.username}@${cfg.registrar}`,
      authorization_user: cfg.username,
      password: cfg.password,
      realm: cfg.registrar,
      display_name: cfg.displayName ?? "AW Digital",
      register: true,
      register_expires: 600,
      session_timers: false,
      user_agent: "AW Digital OS / JsSIP",
    });
    this.ua = ua;

    ua.on("registered", () => this.emit("status", "registered"));
    ua.on("registrationFailed", (e: unknown) => {
      const cause = (e as { cause?: string })?.cause ?? "unbekannt";
      this.emit("status", "error", `Registrierung fehlgeschlagen: ${cause}`);
    });
    ua.on("disconnected", () =>
      this.emit("status", "error", "WebSocket-Verbindung verloren"),
    );

    ua.start();
  }

  async call(targetNumber: string): Promise<void> {
    if (!this.ua) throw new Error("SIP nicht verbunden");

    // easybell-Format: +491633653499 -> 00491633653499 (alternativ 491633653499)
    const digits = targetNumber.replace(/\D/g, "");
    const e164 = targetNumber.trim().startsWith("+")
      ? "00" + digits // +49... -> 0049...
      : digits.startsWith("0") && !digits.startsWith("00")
        ? digits // 0163... bleibt national
        : digits;
    // Gegen die konfigurierte Domain wählen: bei der Asterisk-Brücke ist das
    // die VPS-Domain (Asterisk routet dann raus über den easybell-Trunk).
    const domain = this.cfg?.registrar || "voip.easybell.de";
    const target = `sip:${e164}@${domain}`;
    // eslint-disable-next-line no-console
    console.log("[SIP] dialing", target);

    if (!this.remoteAudioEl) {
      this.remoteAudioEl = document.createElement("audio");
      this.remoteAudioEl.autoplay = true;
      document.body.appendChild(this.remoteAudioEl);
    }

    const session = this.ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
      pcConfig: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun.easybell.de:3478" },
        ],
        rtcpMuxPolicy: "require",
        bundlePolicy: "max-bundle",
      },
    } as unknown) as RTCSession;
    this.session = session;
    this.emit("status", "ringing");

    session.on("peerconnection", (e: unknown) => {
      const pc = (e as { peerconnection: RTCPeerConnection }).peerconnection;
      pc.addEventListener("track", (ev: RTCTrackEvent) => {
        const stream = ev.streams[0];
        if (stream) {
          if (this.remoteAudioEl) this.remoteAudioEl.srcObject = stream;
          this.emit("remoteStream", stream);
        }
      });
    });
    session.on("confirmed", () => this.emit("status", "in-call"));
    session.on("ended", (e: unknown) => {
      // eslint-disable-next-line no-console
      console.log("[SIP] ended", e);
      this.emit("status", "ended");
    });
    session.on("failed", (e: unknown) => {
      // eslint-disable-next-line no-console
      console.error("[SIP] call failed", e);
      const ev = e as {
        cause?: string;
        originator?: string;
        message?: { status_code?: number; reason_phrase?: string };
      };
      const sc = ev?.message?.status_code;
      const reason = ev?.message?.reason_phrase;
      const orig = ev?.originator;
      const detail = [
        ev?.cause,
        sc ? `${sc} ${reason ?? ""}`.trim() : null,
        orig ? `(von ${orig})` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      this.emit(
        "status",
        "error",
        `Anruf fehlgeschlagen: ${detail || "unbekannt"}`,
      );
    });
  }

  hangup() {
    try {
      this.session?.terminate();
    } catch {
      /* ignore */
    }
    this.session = null;
  }

  disconnect() {
    this.hangup();
    try {
      this.ua?.stop();
    } catch {}
    this.ua = null;
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl.remove();
      this.remoteAudioEl = null;
    }
    this.emit("status", "idle");
  }
}
