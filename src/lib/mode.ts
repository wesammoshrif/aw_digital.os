/**
 * Mock-Modus-Flag — funktioniert auf Server UND Client.
 *
 * SERVER: prüft DATABASE_URL (Node-only env var).
 * CLIENT: prüft NEXT_PUBLIC_DB_CONNECTED (in .env.local setzen wenn DB aktiv).
 * Beide müssen konsistent sein, damit Hydration stimmt.
 */
export const isMockMode =
  process.env.NEXT_PUBLIC_DB_CONNECTED === "true"
    ? false
    : !process.env.DATABASE_URL;
