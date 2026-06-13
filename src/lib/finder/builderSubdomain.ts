/**
 * Gratis-Baukasten-Subdomain-Erkennung.
 *
 * Reine Funktion auf dem Host einer URL — klassifiziert nur ein bereits
 * (legal über OSM/Google Places) vorhandenes `website`-Feld. Sie liest NICHTS
 * Neues aus und greift auf keinen Anbieter zu. Genau dieses Muster wurde im
 * Rechts-Check als unbedenklich eingestuft (im Gegensatz zum Massen-Harvesting
 * fremder Baukasten-Seiten).
 *
 * Signal: Der Betrieb hat KEINE eigene Domain → stärkstes Webdesign-Argument
 * („Ihre Seite läuft auf einer Gratis-Adresse von …").
 */
export const BUILDER_HOSTS: Array<{ re: RegExp; name: string }> = [
  { re: /\.jimdosite\.com$|\.jimdofree\.com$/i, name: "Jimdo" },
  { re: /\.wixsite\.com$|\.editorx\.io$/i, name: "Wix (Gratis)" },
  { re: /\.business\.site$/i, name: "Google Business-Site" },
  { re: /\.canva\.site$/i, name: "Canva" },
  { re: /\.webnode\.[a-z.]+$|\.website2\.me$/i, name: "Webnode" },
  { re: /\.weebly\.com$/i, name: "Weebly" },
  { re: /\.mystrikingly\.com$/i, name: "Strikingly" },
  { re: /\.godaddysites\.com$/i, name: "GoDaddy" },
  { re: /\.square\.site$/i, name: "Square" },
  { re: /\.wordpress\.com$/i, name: "WordPress.com (Gratis)" },
  { re: /\.blogspot\.com$/i, name: "Blogspot" },
  { re: /(^|\.)sites\.google\.com$/i, name: "Google Sites" },
  { re: /\.carrd\.co$/i, name: "Carrd" },
  { re: /\.npage\.de$|\.beepworld\.de$|\.de\.tl$|\.jouwweb\.|\.ucoz\./i, name: "Gratis-Homepage" },
];

export function detectBuilderSubdomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
      .hostname.toLowerCase();
    for (const b of BUILDER_HOSTS) if (b.re.test(host)) return b.name;
    return null;
  } catch {
    return null;
  }
}
