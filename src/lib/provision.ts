/**
 * Provisions-Motivation: mögliche Provision je gebuchtem Termin.
 * Pro Browser konfigurierbar (localStorage) — Default 20 % von 1.000 € = 200 €.
 *
 * Reine Helfer, kein "use client": getProvisionConfig() liest localStorage nur,
 * wenn window existiert, sonst der Default → auch serverseitig gefahrlos nutzbar.
 */

export type ProvisionConfig = { pct: number; deal: number };

export const PROVISION_DEFAULT: ProvisionConfig = { pct: 20, deal: 1000 };

export function getProvisionConfig(): ProvisionConfig {
  if (typeof window === "undefined") return PROVISION_DEFAULT;
  try {
    const pct = Number(localStorage.getItem("aw_provision_pct"));
    const deal = Number(localStorage.getItem("aw_provision_deal"));
    return {
      pct: pct > 0 && pct <= 100 ? pct : PROVISION_DEFAULT.pct,
      deal: deal > 0 ? deal : PROVISION_DEFAULT.deal,
    };
  } catch {
    return PROVISION_DEFAULT;
  }
}

export function setProvisionConfig(cfg: ProvisionConfig): void {
  try {
    localStorage.setItem("aw_provision_pct", String(cfg.pct));
    localStorage.setItem("aw_provision_deal", String(cfg.deal));
  } catch {}
}

/** Provision pro Termin = Auftragswert × Prozentsatz. Gerundet auf ganze Euro. */
export function provisionPerTermin(
  cfg: ProvisionConfig = getProvisionConfig(),
): number {
  return Math.round((cfg.deal * cfg.pct) / 100);
}

const EURO = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function fmtEuro(n: number): string {
  return EURO.format(n);
}
