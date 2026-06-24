import type { NextConfig } from "next";
import path from "path";

// Security-Header für ALLE Routen. CSP bewusst pragmatisch (App nutzt
// Deepgram-WSS, SIP-WSS und WebRTC-Mikrofon); object/base/form/frame sind
// dennoch hart eingeschränkt. Eine nonce-basierte strikte script-src ist ein
// späterer Härtungsschritt (siehe SICHERHEIT.md). CSP NICHT über die
// Middleware setzen (CVE-Bezug) — hier in der Config ist korrekt.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Mikrofon für self ERLAUBT (Souffleur/Call-Mic), Kamera/Geo verboten.
    value: "camera=(), geolocation=(), browsing-topics=(), microphone=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Barrel-Imports (lucide-react) tree-shaken → kleineres Client-JS,
  // schnellere Hydration auf jedem Screen.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Schlankes Self-Host-Image: Next kopiert nur die nötigen Dateien
  // (.next/standalone) — kleines Docker-Image, kein npm install zur Laufzeit.
  output: "standalone",
  // Tracing-Root fest aufs Projekt → server.js liegt IMMER an der
  // Standalone-Wurzel (.next/standalone/server.js), egal wie tief der Pfad
  // ist. Ohne das verschachtelt Next bei tiefen Pfaden (z.B. ...\Desktop\...).
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
