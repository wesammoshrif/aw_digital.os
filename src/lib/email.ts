/**
 * Minimaler E-Mail-Versand über Resend (nur via fetch, KEINE neue Dependency).
 *
 * Ohne RESEND_API_KEY läuft alles im „No-Op"-Modus: es wird nichts versendet,
 * nur geloggt. So crasht die Automatik-Engine nie an einer fehlenden Konfig.
 */

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(
      `[email] kein RESEND_API_KEY — würde senden an "${to}": ${subject}`,
    );
    return { sent: false, reason: "no-key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "AW Digital <onboarding@resend.dev>",
        to,
        subject,
        html: html ?? undefined,
        text: text ?? undefined,
      }),
    });

    if (res.ok) return { sent: true };
    return { sent: false, reason: String(res.status) };
  } catch (err) {
    return { sent: false, reason: String(err) };
  }
}
