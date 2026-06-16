/**
 * Die festen Admins. Wer sich mit einer dieser E-Mails registriert, wird
 * automatisch admin + freigegeben; alle anderen pending.
 *
 * Quelle: ENV `ADMIN_EMAILS` (kommagetrennt) — bewusst NICHT im Code, damit
 * keine persönlichen Adressen im Repo landen. In .env.local / Deploy-Env setzen.
 * Leer = niemand wird automatisch Admin (fail-safe).
 */
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
