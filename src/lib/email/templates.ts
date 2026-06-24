/**
 * Deutsche E-Mail-Vorlagen für den Cockpit-Versand. Reine Textbausteine mit
 * sauber gefüllten Platzhaltern — der Verkäufer bekommt sie vorbefüllt und
 * editiert sie vor dem Senden (Souffleur-Prinzip: Wortlaut vorgeben, Mensch
 * bestätigt). Werden client- UND serverseitig genutzt, daher dependency-frei.
 */

export type EmailKind =
  | "followup_call"
  | "voicemail"
  | "appointment_confirm"
  | "audit_result";

export type EmailTplInput = {
  leadName?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  auditPoint?: string | null;
  nextDay?: string | null;
  appointmentWhen?: string | null;
  domain?: string | null;
};

/** Werbecharakter → braucht Einwilligung (UWG §7). Termin-Bestätigung ist
 *  transaktional (der Kunde hat den Termin vereinbart) und davon ausgenommen. */
export const EMAIL_KIND_IS_AD: Record<EmailKind, boolean> = {
  followup_call: true,
  voicemail: true,
  audit_result: true,
  appointment_confirm: false,
};

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  followup_call: "Follow-up nach Anruf",
  voicemail: "Nachfassen (Mailbox)",
  appointment_confirm: "Termin-Bestätigung",
  audit_result: "Website-Analyse senden",
};

const greet = (name?: string | null) =>
  name?.trim() ? `Guten Tag ${name.trim()}` : "Guten Tag";

const sign = (agent?: string | null) =>
  `Beste Grüße\n${agent?.trim() || "[Ihr Name]"}\nAW Digital`;

export function buildEmail(
  kind: EmailKind,
  i: EmailTplInput,
): { subject: string; text: string } {
  const point = i.auditPoint?.trim() || "Ihre Online-Sichtbarkeit";
  const phone = i.agentPhone?.trim() || "[Telefon]";
  switch (kind) {
    case "followup_call":
      return {
        subject: "Wie besprochen — Ihre Website-Kurzanalyse",
        text: `${greet(i.leadName)},\n\ndanke für das Gespräch eben. Wie zugesagt schicke ich Ihnen die Eckdaten zu Ihrer Website. Aufgefallen ist mir vor allem: ${point}. Genau da können wir mit einer modernen Seite ansetzen, damit aus Besuchern Anfragen werden.\n\n${i.nextDay ? `Ich rufe Sie wie vereinbart am ${i.nextDay} noch einmal an. ` : ""}Vorab erreichen Sie mich unter ${phone}.\n\n${sign(i.agentName)}`,
      };
    case "voicemail":
      return {
        subject: "Kurze Erinnerung — Ihre Website-Analyse",
        text: `${greet(i.leadName)},\n\nich hatte versucht Sie zu erreichen und melde mich kurz schriftlich. Die Analyse Ihrer Seite liegt bereit, ein Punkt sticht heraus: ${point}. Sagen Sie mir einfach, wann es Ihnen passt, dann rufe ich kurz an.\n\n${sign(i.agentName)}`,
      };
    case "appointment_confirm":
      return {
        subject: i.appointmentWhen
          ? `Bestätigung Ihres Termins am ${i.appointmentWhen}`
          : "Bestätigung Ihres Termins",
        text: `${greet(i.leadName)},\n\nhiermit bestätige ich gerne unseren Termin${i.appointmentWhen ? `: ${i.appointmentWhen}` : ""}. Wir gehen in Ruhe Ihre aktuelle Website durch und ich zeige Ihnen, was sich konkret verbessern lässt.\n\nSollte etwas dazwischenkommen, sagen Sie mir kurz Bescheid, dann finden wir einen neuen Termin.\n\n${sign(i.agentName)}`,
      };
    case "audit_result":
      return {
        subject: "Ihre Website-Analyse im Überblick",
        text: `${greet(i.leadName)},\n\nanbei die Auswertung Ihrer Website${i.domain ? ` ${i.domain}` : ""}. Daraus ergeben sich konkrete Ansatzpunkte, die ich Ihnen gerne erkläre. Wann passt Ihnen ein kurzes Telefonat in den nächsten Tagen?\n\n${sign(i.agentName)}`,
      };
  }
}
