/**
 * Vorher/Nachher-Onepager als druckfertiges HTML.
 *
 * Wird von /api/pdf/[id] (Lead) und /api/pdf/audit/[id] (Audit) gerendert.
 * Der Nutzer druckt über den Button als PDF (Strg+P, "Als PDF speichern")
 * und hängt das an die Tag-5-Follow-up-Mail aus der Kadenz.
 */

interface OnepagerLead {
  company: string;
  contactName?: string | null;
  city?: string | null;
  trade?: string | null;
}

interface OnepagerAudit {
  websiteUrl: string;
  mobileScore?: number | null;
  desktopScore?: number | null;
  lcpMs?: number | null;
  hasHttps?: boolean | null;
  hasImpressum?: boolean | null;
  hasViewport?: boolean | null;
  hasBookingCta?: boolean | null;
  painScore?: number | null;
  hookText?: string | null;
  createdAt?: Date | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreColor(v: number | null | undefined): string {
  if (v == null) return "#86868b";
  if (v >= 80) return "#1a7f37";
  if (v >= 50) return "#b25000";
  return "#d70015";
}

function checkRow(label: string, ok: boolean | null | undefined): string {
  const state =
    ok == null
      ? `<span class="chk neutral">?</span>`
      : ok
        ? `<span class="chk ok">&#10003;</span>`
        : `<span class="chk bad">&#10007;</span>`;
  return `<div class="check">${state}<span>${esc(label)}</span></div>`;
}

export function renderOnepagerHtml(
  lead: OnepagerLead | null,
  audit: OnepagerAudit | null,
): string {
  const title = lead ? `Website-Analyse für ${lead.company}` : "Website-Analyse";
  const date = (audit?.createdAt ?? new Date()).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const lcp = audit?.lcpMs != null ? (audit.lcpMs / 1000).toFixed(1).replace(".", ",") : null;

  const body = audit
    ? `
    <p class="meta">Geprüfte Website: <strong>${esc(audit.websiteUrl)}</strong> · Stand: ${date}</p>

    <div class="scores">
      <div class="score">
        <div class="num" style="color:${scoreColor(audit.mobileScore)}">${audit.mobileScore ?? "?"}</div>
        <div class="lbl">Google-Score Handy<br><span>von 100 Punkten</span></div>
      </div>
      <div class="score">
        <div class="num" style="color:${scoreColor(audit.desktopScore)}">${audit.desktopScore ?? "?"}</div>
        <div class="lbl">Google-Score Desktop<br><span>von 100 Punkten</span></div>
      </div>
      <div class="score">
        <div class="num" style="color:${audit.lcpMs != null && audit.lcpMs > 2500 ? "#d70015" : "#1a7f37"}">${lcp ?? "?"}<small> s</small></div>
        <div class="lbl">Ladezeit Handy<br><span>Google empfiehlt unter 2,5 s</span></div>
      </div>
      <div class="score">
        <div class="num" style="color:${scoreColor(audit.painScore)}">${audit.painScore ?? "?"}</div>
        <div class="lbl">Gesamt-Bewertung<br><span>von 100 Punkten</span></div>
      </div>
    </div>

    <div class="cols">
      <div>
        <h2>Technik-Check</h2>
        ${checkRow("Sichere Verbindung (HTTPS)", audit.hasHttps)}
        ${checkRow("Impressum vorhanden", audit.hasImpressum)}
        ${checkRow("Für Handys optimiert", audit.hasViewport)}
        ${checkRow("Kontakt-Button für Anfragen", audit.hasBookingCta)}
      </div>
      <div>
        <h2>Was das für Sie bedeutet</h2>
        ${audit.hookText ? `<p class="hook">${esc(audit.hookText)}</p>` : ""}
        <p class="small">Über 70 Prozent der Suchanfragen nach Handwerkern kommen vom Handy. Wer dort langsam lädt oder schlecht lesbar ist, verliert Anfragen an die Konkurrenz, ohne es zu merken.</p>
      </div>
    </div>

    <h2>Unsere Empfehlung</h2>
    <ol class="rec">
      <li>Ladezeit auf unter 2,5 Sekunden bringen, damit Besucher nicht abspringen.</li>
      <li>Mobile Darstellung optimieren, denn dort suchen Ihre Kunden.</li>
      <li>Klare Anfrage-Buttons einbauen, damit aus Besuchern Aufträge werden.</li>
    </ol>`
    : `
    <p class="meta">Für ${lead ? esc(lead.company) : "diesen Betrieb"} liegt noch keine Website-Analyse vor.</p>
    <p class="small">Analyse im Cockpit unter "Audits" starten, danach steht der Onepager hier zum Druck bereit.</p>`;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1d1d1f; background: #f5f5f7; padding: 40px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 48px 56px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
  .brand { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e8e8ed; padding-bottom: 16px; margin-bottom: 28px; }
  .brand .logo { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: #0071e3; }
  .brand .tag { font-size: 11px; color: #86868b; }
  h1 { font-size: 26px; letter-spacing: -0.02em; margin-bottom: 6px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #86868b; margin: 26px 0 10px; }
  .meta { font-size: 13px; color: #515154; margin-bottom: 6px; }
  .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
  .score { border: 1px solid #e8e8ed; border-radius: 12px; padding: 16px 14px; text-align: center; }
  .score .num { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .score .num small { font-size: 16px; font-weight: 600; }
  .score .lbl { margin-top: 6px; font-size: 11.5px; font-weight: 600; line-height: 1.35; }
  .score .lbl span { font-weight: 400; color: #86868b; font-size: 10.5px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .check { display: flex; align-items: center; gap: 9px; font-size: 13.5px; padding: 5px 0; }
  .chk { display: inline-flex; width: 19px; height: 19px; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .chk.ok { background: #1a7f37; } .chk.bad { background: #d70015; } .chk.neutral { background: #86868b; }
  .hook { font-size: 14.5px; font-style: italic; line-height: 1.5; border-left: 3px solid #0071e3; background: #eff5ff; padding: 10px 14px; border-radius: 6px; color: #0a3977; margin-bottom: 10px; }
  .small { font-size: 12.5px; color: #515154; line-height: 1.55; }
  .rec { margin-left: 18px; font-size: 13.5px; line-height: 1.7; }
  .footer { margin-top: 34px; border-top: 1px solid #e8e8ed; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #86868b; }
  .printbar { max-width: 760px; margin: 0 auto 16px; display: flex; justify-content: flex-end; }
  .printbar button { background: #0071e3; color: #fff; border: 0; border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; max-width: none; padding: 24px 8px; }
    .printbar { display: none; }
  }
</style>
</head>
<body>
  <div class="printbar"><button onclick="window.print()">Als PDF speichern / Drucken</button></div>
  <div class="sheet">
    <div class="brand">
      <span class="logo">AW Digital</span>
      <span class="tag">Websites für Handwerksbetriebe · awcode.de</span>
    </div>
    <h1>${esc(title)}</h1>
    ${lead?.trade || lead?.city ? `<p class="meta">${esc([lead?.trade, lead?.city].filter(Boolean).join(" · "))}</p>` : ""}
    ${body}
    <div class="footer">
      <span>AW Digital · Website-Analyse</span>
      <span>Erstellt am ${new Date().toLocaleDateString("de-DE")}</span>
    </div>
  </div>
</body>
</html>`;
}
