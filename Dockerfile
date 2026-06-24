# syntax=docker/dockerfile:1
# ── AW Digital OS — Self-Host-Image (Next.js standalone) ──────────────

# 1) Abhängigkeiten
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build
FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* werden ins Browser-Bundle gebacken → MÜSSEN schon beim Build da
# sein. Alle Server-/DB-Seiten sind force-dynamic, daher braucht der Build KEIN
# DATABASE_URL und keine echten Secrets — ABER der Browser-Supabase-Client
# (src/lib/supabase/client.ts) liest die zwei NEXT_PUBLIC_SUPABASE_*-Werte zur
# Build-Zeit. Fehlen sie hier, ist der Login im Browser tot (undefined).
# Der Anon-/Publishable-Key ist fürs Frontend gedacht → darf ins Image.
ARG NEXT_PUBLIC_DB_CONNECTED=true
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_DB_CONNECTED=$NEXT_PUBLIC_DB_CONNECTED
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# Heap deckeln: VPS hat 7,8 GB RAM + 2 GB Swap und bedient parallel die
# Live-Kontaktformulare — verhindert, dass ein Build-Peak den OOM-Killer triggert.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# 3) Runtime (nur das Nötigste)
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
# Standalone-Output: server.js + minimale node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
