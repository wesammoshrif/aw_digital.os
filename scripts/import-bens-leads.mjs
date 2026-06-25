/**
 * Einmal-Import: Google-Sheet-CSV (Mysales-Altbestand, ~541 Leads, 1× angerufen)
 * → SQL für Bens Liste. Robuster RFC4180-Parser, Mapping + Dedup per Telefon.
 *
 * Aufruf:  node scripts/import-bens-leads.mjs /tmp/bens_leads.csv > /tmp/bens_import.sql
 */
import { readFileSync } from "node:fs";

const BEN = "5d6c3146-b860-4b35-b540-b4507ef58da3";
const csv = readFileSync(process.argv[2], "utf8");

// ── RFC4180-CSV-Parser (quotes, eingebettete Kommas/Zeilenumbrüche) ──
function parseCsv(s) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* ignore */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCsv(csv);

// Kopfzeile finden (enthält "Unternehmensname" + "Telefon")
let headerIdx = rows.findIndex(
  (r) => r.some((c) => /unternehmensname/i.test(c)) && r.some((c) => /telefon/i.test(c)),
);
if (headerIdx < 0) headerIdx = 0;
const header = rows[headerIdx].map((c) => c.trim().toLowerCase());
const col = (name) => header.findIndex((h) => h.includes(name));
const ci = {
  branche: col("branche"),
  firma: col("unternehmensname"),
  tel: col("telefon"),
  name: col("entscheider"),
  mail: col("mail"),
  ergebnis: col("anrufergebnis"),
  notiz: col("notiz"),
};

const sqlStr = (v) =>
  v == null || v === "" ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'";
const cleanSpace = (v) => (v || "").replace(/\s+/g, " ").trim();
const normPhone = (v) => (v || "").replace(/[^0-9]/g, "");
const isUrl = (v) => /^(https?:\/\/|www\.)/i.test((v || "").trim());
const domainOf = (v) =>
  (v || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .trim();

function fixEmail(v) {
  let e = cleanSpace(v).replace(/\[\s*at\s*\]/gi, "@").replace(/\[\s*@\s*\]/g, "@");
  e = e.replace(/\s+/g, "");
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

const out = [];
const seen = new Set();
let kept = 0;
let skippedNoPhone = 0;
let skippedDupe = 0;

for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i];
  const phoneRaw = cleanSpace(r[ci.tel]);
  const np = normPhone(phoneRaw);
  if (!np || np.length < 5) { skippedNoPhone++; continue; }
  if (seen.has(np)) { skippedDupe++; continue; }
  seen.add(np);

  const firmaRaw = cleanSpace(r[ci.firma]);
  const name = cleanSpace(r[ci.name]) || null;
  let website = null;
  let company = firmaRaw;
  if (isUrl(firmaRaw)) {
    website = firmaRaw.replace(/\s+/g, "");
    company = domainOf(firmaRaw) || name || "Unbekannt";
  }
  if (!company) company = name || "Unbekannt";

  const trade = cleanSpace(r[ci.branche]) || null; // leer = unbekannt
  const email = fixEmail(r[ci.mail]);
  const ergebnis = cleanSpace(r[ci.ergebnis]);
  const notizRaw = cleanSpace(r[ci.notiz]);
  const noteParts = ["Altbestand (1× angerufen)"];
  if (ergebnis) noteParts.push("Letztes Ergebnis: " + ergebnis);
  if (notizRaw) noteParts.push("Notiz: " + notizRaw);
  const notes = noteParts.join(" · ");

  // Idempotent: nur einfügen, wenn diese Nummer noch in KEINEM Lead steckt.
  out.push(
    `INSERT INTO leads (owner_id, company, trade, contact_name, phone, email, website, status, source, attempts, next_step, next_step_at, notes)\n` +
      `SELECT '${BEN}'::uuid, ${sqlStr(company)}, ${sqlStr(trade)}, ${sqlStr(name)}, ${sqlStr(phoneRaw)}, ${sqlStr(email)}, ${sqlStr(website)}, 'new', 'manual', 1, 'Erstanruf (Altbestand)', now(), ${sqlStr(notes)}\n` +
      `WHERE NOT EXISTS (SELECT 1 FROM leads WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') = '${np}');`,
  );
  kept++;
}

process.stderr.write(
  `Zeilen gesamt: ${rows.length - headerIdx - 1} · importierbar: ${kept} · ohne Telefon übersprungen: ${skippedNoPhone} · CSV-Dubletten: ${skippedDupe}\n`,
);
console.log("BEGIN;");
console.log(out.join("\n"));
console.log("COMMIT;");
