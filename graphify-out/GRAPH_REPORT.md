# Graph Report - .  (2026-06-13)

## Corpus Check
- 58 files · ~60,838 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 705 nodes · 1508 edges · 51 communities (41 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.79)
- Token cost: 0 input · 58,279 output

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
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]

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
- `VoIP-Brücke (Asterisk WebRTC↔SIP, Vapi-Nachbau)` --semantically_similar_to--> `tel:-Link + Zoiper Stopgap (System-Telefon)`  [INFERRED] [semantically similar]
  voip-bridge/README.md → BERICHT.md
- `invoices (quotes + invoices)` --shares_data_with--> `leads`  [INFERRED]
  BERICHT.md → README.md
- `E-Mail-Versand (src/lib/email.ts, Resend)` --shares_data_with--> `Termine & Termin-Erinnerung (appointments)`  [INFERRED]
  HANDOFF.md → BERICHT.md
- `AW Digital OS` --references--> `Next.js Agent Rules`  [EXTRACTED]
  README.md → AGENTS.md
- `Souffleur (live sales coaching)` --calls--> `Anthropic Claude (Sonnet 4.6 / Haiku 4.5)`  [INFERRED]
  BERICHT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Call-Flow Pipeline: Audit → Souffleur → Disposition → Rechnung** — audit_engine, souffleur, call_flow, invoices_quotes [INFERRED 0.85]
- **VoIP-Brücke Stack: Browser-Dialer ↔ Asterisk ↔ easybell-Trunk** — webrtc_dialer, asterisk, easybell_trunk, voip_bridge [INFERRED 0.85]
- **Automatik-Engine: Cron-Tick führt Reminder, Mail-Versand und Follow-up-Kadenz aus** — cron_tick, email_resend, follow_up_cadence, appointments [INFERRED 0.75]

## Communities (51 total, 10 thin omitted)

### Community 0 - "Finanzen & Rechnungs-UI"
Cohesion: 0.06
Nodes (46): HomePage(), Invoice, eur(), FinancesPage(), STATUS_LABEL, TYPE_LABEL, PATCH(), sendEmail() (+38 more)

### Community 1 - "DB-Felder (Calls/Invoices)"
Cohesion: 0.17
Nodes (55): amount, cls_score, converted_invoice_id, created_at, currency, desktop_score, dispo, due_date (+47 more)

### Community 2 - "NPM-Abhängigkeiten"
Cohesion: 0.04
Nodes (45): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, drizzle-orm, fast-xml-parser, jssip, lucide-react (+37 more)

### Community 3 - "Detail-Seiten & Mockup-Vorschau"
Cohesion: 0.08
Nodes (26): NotFound(), fmtDate(), LeadDetailPage(), MockupForLeadPage(), ProjectDetailPage(), SouffleurPage(), STATUS_LABEL, statusVariant() (+18 more)

### Community 4 - "Leads-Finder"
Cohesion: 0.11
Nodes (24): dedupKey(), findLeads(), isRicher(), ImportResponse, SOURCES, TRADES, POST(), FinderLead (+16 more)

### Community 5 - "Telefonie-Client & Souffleur-Matcher"
Cohesion: 0.08
Nodes (24): JsSIPUA, JsSIPWS, RTCSession, SipConfig, SipEvents, SipStatus, matchMove(), PRIORITY (+16 more)

### Community 6 - "OS-Konzepte & Call-Flow (Docs)"
Cohesion: 0.10
Nodes (29): Termine & Termin-Erinnerung (appointments), Asterisk (Docker, andrius/asterisk, network_mode host), Website-Audit-Engine (Pain-Score + Hook), AW Digital OS (Cold-Call-Akquise-Cockpit), BERICHT.md — Status-Bericht & Go-Live-Checkliste, Call-Flow (CallMode → Souffleur → Dispo → Cadence), calls-Persistenz & Anruf-Statistik, Anthropic Claude Haiku 4.5 (Souffleur-Tipps/Summaries) (+21 more)

### Community 7 - "Architektur-Konzepte (Mock/WebRTC/KI)"
Cohesion: 0.10
Nodes (26): Next.js Agent Rules, api/ai/strategy (Claude Haiku), DATABASE_URL, Deepgram (transcription), easybell REST Click-to-Call API (removed), invoices (quotes + invoices), Mock Mode (isMockMode), Souffleur (live sales coaching) (+18 more)

### Community 8 - "DB-Migration & Indizes"
Cohesion: 0.21
Nodes (25): dialect, activities_lead_idx, activities_owner_type_idx, invoices_lead_idx, invoices_number_idx, invoices_owner_status_idx, concurrently, isUnique (+17 more)

### Community 9 - "DB-Schema (Drizzle)"
Cohesion: 0.08
Nodes (24): Auth/Login & RLS-Policies (P0 fürs Online-Gehen), activities, activityTypeEnum, Audit, Call, callDispoEnum, calls, invoiceKindEnum (+16 more)

### Community 10 - "Impressum-Anreicherung"
Cohesion: 0.13
Nodes (19): cleanPhone(), enrichFromWebsite(), EnrichResult, extractContactName(), extractEmail(), extractPhone(), fetchHtml(), isPlausibleEmail() (+11 more)

### Community 11 - "Audit-UI & Dialer"
Cohesion: 0.16
Nodes (12): Flag(), ScoreBar(), cn(), AuditResult, ScoreTile(), SipDialer(), StatusPill(), FeedItem() (+4 more)

### Community 12 - "Termine-UI & Erinnerung"
Cohesion: 0.18
Nodes (10): Shell(), STATUS_LABEL, fmtDateTime(), ReminderBadge(), ReminderState, Badge(), DOT, VARIANTS (+2 more)

### Community 13 - "TypeScript-Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Formulare & UI-Primitiven"
Cohesion: 0.12
Nodes (10): TRADES, TRADES, Button, ButtonProps, CommonProps, LinkProps, Size, SIZES (+2 more)

### Community 15 - "Dashboard-Widgets"
Cohesion: 0.15
Nodes (7): CountUp(), PainScoreCell(), QueueItem(), scoreVariant(), TRADE_LABEL, TargetRing(), WeekSparkline()

### Community 16 - "Website-Audit-Engine"
Cohesion: 0.23
Nodes (12): POST(), AuditResult, buildHook(), detectTechStack(), extractFooterYear(), fetchHtml(), fetchPagespeed(), normalize() (+4 more)

### Community 17 - "API-Routen & DB-Client"
Cohesion: 0.14
Nodes (10): ACTIVITY_TYPES, POST(), AuditsPage(), db, DbClient, NewLeadInput, POST(), listAudits() (+2 more)

### Community 18 - "Shell & Navigation"
Cohesion: 0.18
Nodes (5): NAV, Sidebar(), NewProject, STATUS_OPTIONS, Logo()

### Community 19 - "DB-Fremdschlüssel"
Cohesion: 0.54
Nodes (13): columnsFrom, columnsTo, onDelete, onUpdate, tableFrom, tableTo, activities_lead_id_leads_id_fk, appointments_lead_id_leads_id_fk (+5 more)

### Community 20 - "Leads-Tabelle & Filter"
Cohesion: 0.20
Nodes (6): LeadsFilter(), STATUSES, PainCell(), STATUS_DOT, STATUS_LABEL, STATUS_OPTIONS

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
Cohesion: 0.31
Nodes (6): GET(), FEEDS, fetchAllNeugruendungen(), filterHandwerk(), HandelsregisterEvent, HANDWERK_KEYWORDS

### Community 26 - "Neue-Rechnung-Seite"
Cohesion: 0.22
Nodes (3): INVOICE_STATUS, QUOTE_STATUS, TYPE_OPTIONS

### Community 28 - "Pipeline-Kanban"
Cohesion: 0.40
Nodes (4): LeadsPage(), listLeads(), COLUMNS, PipelinePage()

### Community 29 - "Root-Layout & Fonts"
Cohesion: 0.40
Nodes (3): geistMono, inter, metadata

### Community 30 - "Calls-API"
Cohesion: 0.40
Nodes (3): Dispo, DISPO_VALUES, NewCallInput

### Community 31 - "Aktivitäts-Timeline"
Cohesion: 0.40
Nodes (4): fmt, ICONS, TONES, Activity

### Community 32 - "Drizzle-Journal"
Cohesion: 0.50
Nodes (3): dialect, entries, version

## Knowledge Gaps
- **191 isolated node(s):** `version`, `configurations`, `sentences`, `moves`, `sentences` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Trigger Events` connect `Architektur-Konzepte (Mock/WebRTC/KI)` to `Finanzen & Rechnungs-UI`, `DB-Schema (Drizzle)`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `cn()` connect `Audit-UI & Dialer` to `Telefonie-Client & Souffleur-Matcher`, `Termine-UI & Erinnerung`, `Formulare & UI-Primitiven`, `Dashboard-Widgets`, `Shell & Navigation`, `Leads-Tabelle & Filter`, `Einstellungen & Telefonie-Setup`, `Call-Modus & Kadenz-Logik`, `Aktivitäts-Timeline`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `POST()` connect `Impressum-Anreicherung` to `API-Routen & DB-Client`, `DB-Schema (Drizzle)`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `sentences` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Finanzen & Rechnungs-UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06398730830248546 - nodes in this community are weakly interconnected._
- **Should `NPM-Abhängigkeiten` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Detail-Seiten & Mockup-Vorschau` be split into smaller, more focused modules?**
  _Cohesion score 0.08097165991902834 - nodes in this community are weakly interconnected._