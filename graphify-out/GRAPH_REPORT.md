# Graph Report - .  (2026-06-13)

## Corpus Check
- 19 files · ~66,940 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 779 nodes · 1641 edges · 52 communities (42 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.8)
- Token cost: 0 input · 50,025 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Finanzen & Rechnungs-UI|Finanzen & Rechnungs-UI]]
- [[_COMMUNITY_DB-Felder (CallsInvoices)|DB-Felder (Calls/Invoices)]]
- [[_COMMUNITY_NPM-Abhängigkeiten|NPM-Abhängigkeiten]]
- [[_COMMUNITY_Detail-Seiten & Mockup-Vorschau|Detail-Seiten & Mockup-Vorschau]]
- [[_COMMUNITY_Leads-Finder|Leads-Finder]]
- [[_COMMUNITY_Telefonie-Client & Souffleur-Matcher|Telefonie-Client & Souffleur-Matcher]]
- [[_COMMUNITY_OS-Konzepte & Call-Flow (Docs)|OS-Konzepte & Call-Flow (Docs)]]
- [[_COMMUNITY_Architektur-Konzepte (MockWebRTCKI)|Architektur-Konzepte (Mock/WebRTC/KI)]]
- [[_COMMUNITY_DB-Migration & Indizes|DB-Migration & Indizes]]
- [[_COMMUNITY_DB-Schema (Drizzle)|DB-Schema (Drizzle)]]
- [[_COMMUNITY_Impressum-Anreicherung|Impressum-Anreicherung]]
- [[_COMMUNITY_Audit-UI & Dialer|Audit-UI & Dialer]]
- [[_COMMUNITY_Termine-UI & Erinnerung|Termine-UI & Erinnerung]]
- [[_COMMUNITY_TypeScript-Config|TypeScript-Config]]
- [[_COMMUNITY_Formulare & UI-Primitiven|Formulare & UI-Primitiven]]
- [[_COMMUNITY_Dashboard-Widgets|Dashboard-Widgets]]
- [[_COMMUNITY_Website-Audit-Engine|Website-Audit-Engine]]
- [[_COMMUNITY_API-Routen & DB-Client|API-Routen & DB-Client]]
- [[_COMMUNITY_Shell & Navigation|Shell & Navigation]]
- [[_COMMUNITY_DB-Fremdschlüssel|DB-Fremdschlüssel]]
- [[_COMMUNITY_Leads-Tabelle & Filter|Leads-Tabelle & Filter]]
- [[_COMMUNITY_Einstellungen & Telefonie-Setup|Einstellungen & Telefonie-Setup]]
- [[_COMMUNITY_Verkaufs-Strategien & Kadenz|Verkaufs-Strategien & Kadenz]]
- [[_COMMUNITY_Call-Modus & Kadenz-Logik|Call-Modus & Kadenz-Logik]]
- [[_COMMUNITY_HTML-CRM-Import|HTML-CRM-Import]]
- [[_COMMUNITY_Handelsregister-Feed|Handelsregister-Feed]]
- [[_COMMUNITY_Neue-Rechnung-Seite|Neue-Rechnung-Seite]]
- [[_COMMUNITY_Easybell-SIP-Client|Easybell-SIP-Client]]
- [[_COMMUNITY_Pipeline-Kanban|Pipeline-Kanban]]
- [[_COMMUNITY_Root-Layout & Fonts|Root-Layout & Fonts]]
- [[_COMMUNITY_Calls-API|Calls-API]]
- [[_COMMUNITY_Aktivitäts-Timeline|Aktivitäts-Timeline]]
- [[_COMMUNITY_Drizzle-Journal|Drizzle-Journal]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `columns` - 59 edges
2. `primaryKey` - 49 edges
3. `notNull` - 49 edges
4. `cn()` - 40 edges
5. `Shell()` - 20 edges
6. `Badge()` - 19 edges
7. `Card()` - 18 edges
8. `dashboardSummary()` - 16 edges
9. `compilerOptions` - 16 edges
10. `ButtonLink()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `PDF Onepager (lib/pdf/onepager.ts)` --references--> `Website-Audit-Engine (Pain-Score + Hook)`  [INFERRED]
  src/lib/pdf/onepager.ts → ROADMAP.md
- `Website-Audit-Engine (Pain-Score + Hook)` --shares_data_with--> `audits`  [INFERRED]
  ROADMAP.md → README.md
- `VoIP-Brücke (Asterisk WebRTC↔SIP, Vapi-Nachbau)` --semantically_similar_to--> `tel:-Link + Zoiper Stopgap (System-Telefon)`  [INFERRED] [semantically similar]
  voip-bridge/README.md → BERICHT.md
- `Quellen-Katalog (Source Catalog)` --references--> `Branchenbuch Adapter (branchenbuch.ts)`  [EXTRACTED]
  BERICHT.md → src/lib/finder/sources/branchenbuch.ts
- `Quellen-Katalog (Source Catalog)` --references--> `Google Places Adapter (googlePlaces.ts)`  [EXTRACTED]
  BERICHT.md → src/lib/finder/sources/googlePlaces.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Finder Source Adapters → FinderLead** — finder_source_osm, finder_source_googleplaces, finder_source_handelsregister, finder_source_kleinanzeigen, finder_source_branchenbuch, finder_index, finderlead_type [INFERRED 0.95]
- **Audit Pipeline (Lighthouse + SEO → UI + PDF)** — audit_website, audit_lighthouse, audit_seo, audit_ui, audit_onepager [INFERRED 0.85]
- **Legal Signal Constraint (BVerwG → Signal + Brief)** — bverwg_6c323, rationale_letter_contact, finder_sources, gratis_baukasten_signal [INFERRED 0.85]

## Communities (52 total, 10 thin omitted)

### Community 0 - "Finanzen & Rechnungs-UI"
Cohesion: 0.06
Nodes (46): HomePage(), Invoice, eur(), FinancesPage(), STATUS_LABEL, TYPE_LABEL, PATCH(), sendEmail() (+38 more)

### Community 1 - "DB-Felder (Calls/Invoices)"
Cohesion: 0.07
Nodes (38): dedupKey(), findLeads(), isRicher(), ImportResponse, PhoneFilter, SOURCE_CATALOG, SOURCES, TIER_BADGE (+30 more)

### Community 2 - "NPM-Abhängigkeiten"
Cohesion: 0.17
Nodes (55): amount, cls_score, converted_invoice_id, created_at, currency, desktop_score, dispo, due_date (+47 more)

### Community 3 - "Detail-Seiten & Mockup-Vorschau"
Cohesion: 0.06
Nodes (50): Website-Audit-Engine (Pain-Score + Hook), Google Lighthouse (4 Kategorien), PDF Onepager (lib/pdf/onepager.ts), PAGESPEED_API_KEY (ENV), attr(), finalize(), metaContent(), runSeoChecks() (+42 more)

### Community 4 - "Leads-Finder"
Cohesion: 0.04
Nodes (45): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, drizzle-orm, fast-xml-parser, jssip, lucide-react (+37 more)

### Community 5 - "Telefonie-Client & Souffleur-Matcher"
Cohesion: 0.07
Nodes (25): EasybellSipClient, JsSIPUA, JsSIPWS, RTCSession, SipConfig, SipEvents, SipStatus, matchMove() (+17 more)

### Community 6 - "OS-Konzepte & Call-Flow (Docs)"
Cohesion: 0.16
Nodes (38): columnsFrom, columnsTo, onDelete, onUpdate, tableFrom, tableTo, dialect, activities_lead_id_leads_id_fk (+30 more)

### Community 7 - "Architektur-Konzepte (Mock/WebRTC/KI)"
Cohesion: 0.11
Nodes (23): NotFound(), fmtDate(), LeadDetailPage(), MockupForLeadPage(), ProjectDetailPage(), SouffleurPage(), STATUS_LABEL, statusVariant() (+15 more)

### Community 8 - "DB-Migration & Indizes"
Cohesion: 0.14
Nodes (16): Flag(), ScoreBar(), LeadsFilter(), STATUSES, PainCell(), STATUS_DOT, STATUS_LABEL, STATUS_OPTIONS (+8 more)

### Community 9 - "DB-Schema (Drizzle)"
Cohesion: 0.09
Nodes (27): Next.js Agent Rules, api/ai/strategy (Claude Haiku), DATABASE_URL, Deepgram (transcription), easybell REST Click-to-Call API (removed), invoices (quotes + invoices), Mock Mode (isMockMode), Souffleur (live sales coaching) (+19 more)

### Community 10 - "Impressum-Anreicherung"
Cohesion: 0.12
Nodes (19): cleanPhone(), enrichFromWebsite(), EnrichResult, extractContactName(), extractEmail(), extractPhone(), fetchHtml(), isPlausibleEmail() (+11 more)

### Community 11 - "Audit-UI & Dialer"
Cohesion: 0.13
Nodes (24): Termine & Termin-Erinnerung (appointments), Asterisk (Docker, andrius/asterisk, network_mode host), AW Digital OS (Cold-Call-Akquise-Cockpit), BERICHT.md — Status-Bericht & Go-Live-Checkliste, Call-Flow (CallMode → Souffleur → Dispo → Cadence), calls-Persistenz & Anruf-Statistik, Anthropic Claude Haiku 4.5 (Souffleur-Tipps/Summaries), Scheduler/Cron-Tick (/api/cron/tick) (+16 more)

### Community 12 - "Termine-UI & Erinnerung"
Cohesion: 0.13
Nodes (10): Shell(), NAV, Sidebar(), NewProject, LeadsPage(), listLeads(), STATUS_OPTIONS, COLUMNS (+2 more)

### Community 13 - "TypeScript-Config"
Cohesion: 0.10
Nodes (20): activities, activityTypeEnum, Audit, Call, callDispoEnum, calls, invoiceKindEnum, invoices (+12 more)

### Community 14 - "Formulare & UI-Primitiven"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "Dashboard-Widgets"
Cohesion: 0.12
Nodes (10): TRADES, TRADES, Button, ButtonProps, CommonProps, LinkProps, Size, SIZES (+2 more)

### Community 16 - "Website-Audit-Engine"
Cohesion: 0.15
Nodes (7): CountUp(), PainScoreCell(), QueueItem(), scoreVariant(), TargetRing(), WeekSparkline(), TRADE_LABELS

### Community 17 - "API-Routen & DB-Client"
Cohesion: 0.21
Nodes (15): buildSearchUrl(), classifyPhone(), CONFIG, extractCompany(), extractEmail(), extractPhone(), extractPostal(), extractStreet() (+7 more)

### Community 18 - "Shell & Navigation"
Cohesion: 0.13
Nodes (12): POST(), AuditsPage(), db, DbClient, audits, leads, NewLeadInput, POST() (+4 more)

### Community 19 - "DB-Fremdschlüssel"
Cohesion: 0.23
Nodes (6): STATUS_LABEL, Badge(), DOT, VARIANTS, ButtonLink(), CardHeader()

### Community 20 - "Leads-Tabelle & Filter"
Cohesion: 0.18
Nodes (5): AuditResult, LighthouseScores, ScoreTile(), SeoCheck, SeoReport

### Community 21 - "Einstellungen & Telefonie-Setup"
Cohesion: 0.27
Nodes (4): INTEGRATIONS, IOSGroup(), IOSRow(), IOSSwitch()

### Community 22 - "Verkaufs-Strategien & Kadenz"
Cohesion: 0.18
Nodes (10): BEST_CALL_TIMES, CadenceStep, FOLLOW_UP_CADENCE, GOLDEN_RULES, MICRO_COMMITMENTS, NeinGradient, NeinTyp, PAIN_SEQUENCES (+2 more)

### Community 23 - "Call-Modus & Kadenz-Logik"
Cohesion: 0.31
Nodes (5): TONE_STYLES, Lead, applyCadence(), CadenceResult, Disposition

### Community 24 - "HTML-CRM-Import"
Cohesion: 0.27
Nodes (7): NewLead, HtmlLeadSchema, mapHtmlExport(), SCORE_MAP, STATUS_MAP, POST(), toSource()

### Community 25 - "Handelsregister-Feed"
Cohesion: 0.22
Nodes (3): INVOICE_STATUS, QUOTE_STATUS, TYPE_OPTIONS

### Community 26 - "Neue-Rechnung-Seite"
Cohesion: 0.29
Nodes (3): pickTemplate(), TemplateBrief, TemplateId

### Community 27 - "Easybell-SIP-Client"
Cohesion: 0.40
Nodes (3): geistMono, inter, metadata

### Community 28 - "Pipeline-Kanban"
Cohesion: 0.40
Nodes (3): Dispo, DISPO_VALUES, NewCallInput

### Community 29 - "Root-Layout & Fonts"
Cohesion: 0.40
Nodes (4): fmt, ICONS, TONES, Activity

### Community 30 - "Calls-API"
Cohesion: 0.60
Nodes (3): fmtDateTime(), ReminderBadge(), ReminderState

### Community 31 - "Aktivitäts-Timeline"
Cohesion: 0.50
Nodes (4): Auth/Login & RLS-Policies (P0 fürs Online-Gehen), Mock vs. Production-Modus (isMockMode / DATABASE_URL), Supabase (Postgres EU, Session-Pooler), Supabase MCP (HTTP/OAuth für Claude Code)

### Community 32 - "Drizzle-Journal"
Cohesion: 0.50
Nodes (3): dialect, entries, version

## Knowledge Gaps
- **208 isolated node(s):** `version`, `configurations`, `sentences`, `moves`, `sentences` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `DB-Migration & Indizes` to `Telefonie-Client & Souffleur-Matcher`, `Termine-UI & Erinnerung`, `Dashboard-Widgets`, `Website-Audit-Engine`, `DB-Fremdschlüssel`, `Leads-Tabelle & Filter`, `Einstellungen & Telefonie-Setup`, `Call-Modus & Kadenz-Logik`, `Root-Layout & Fonts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Trigger Events` connect `DB-Schema (Drizzle)` to `Finanzen & Rechnungs-UI`, `TypeScript-Config`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `POST()` connect `Impressum-Anreicherung` to `Shell & Navigation`, `TypeScript-Config`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `sentences` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Finanzen & Rechnungs-UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06398730830248546 - nodes in this community are weakly interconnected._
- **Should `DB-Felder (Calls/Invoices)` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._
- **Should `Detail-Seiten & Mockup-Vorschau` be split into smaller, more focused modules?**
  _Cohesion score 0.06009783368273934 - nodes in this community are weakly interconnected._