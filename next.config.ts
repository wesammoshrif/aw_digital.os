import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Schlankes Self-Host-Image: Next kopiert nur die nötigen Dateien
  // (.next/standalone) — kleines Docker-Image, kein npm install zur Laufzeit.
  output: "standalone",
  // Tracing-Root fest aufs Projekt → server.js liegt IMMER an der
  // Standalone-Wurzel (.next/standalone/server.js), egal wie tief der Pfad
  // ist. Ohne das verschachtelt Next bei tiefen Pfaden (z.B. ...\Desktop\...).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
