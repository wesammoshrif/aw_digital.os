/**
 * Mock-Modus-Flag — bewusst OHNE DB-Import, damit dieses Modul auch von
 * Client-Components importiert werden kann, ohne dass `postgres`/Node-Module
 * (tls, net, fs) in den Browser-Bundle gezogen werden.
 *
 * Ohne DATABASE_URL läuft die App komplett auf Mock-Daten.
 */
export const isMockMode = !process.env.DATABASE_URL;
