# syntax=docker/dockerfile:1
# ── AW Digital OS — Self-Host-Image (Next.js standalone) ──────────────

# 1) Abhängigkeiten
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* werden ins Browser-Bundle gebacken → MUSS schon beim Build da
# sein. Alle Server-/DB-Seiten sind force-dynamic, daher braucht der Build KEIN
# DATABASE_URL und keine Secrets.
ARG NEXT_PUBLIC_DB_CONNECTED=true
ENV NEXT_PUBLIC_DB_CONNECTED=$NEXT_PUBLIC_DB_CONNECTED
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runtime (nur das Nötigste)
FROM node:22-alpine AS runner
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
