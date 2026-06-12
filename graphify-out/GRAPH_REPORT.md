# Graph Report - .  (2026-06-12)

## Corpus Check
- Corpus is ~43,058 words - fits in a single context window. You may not need a graph.

## Summary
- 469 nodes · 850 edges · 34 communities (25 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.8)
- Token cost: 66,102 input · 2,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard & UI-Komponenten|Dashboard & UI-Komponenten]]
- [[_COMMUNITY_Finanzen-Seite & Rechnungen|Finanzen-Seite & Rechnungen]]
- [[_COMMUNITY_Dependencies & Build-Config|Dependencies & Build-Config]]
- [[_COMMUNITY_SIP-Client & Souffleur-Matcher|SIP-Client & Souffleur-Matcher]]
- [[_COMMUNITY_Architektur-Konzepte (Docs)|Architektur-Konzepte (Docs)]]
- [[_COMMUNITY_Drizzle-Datenmodell|Drizzle-Datenmodell]]
- [[_COMMUNITY_Call-Mode & Aktivitaeten|Call-Mode & Aktivitaeten]]
- [[_COMMUNITY_TypeScript-Konfiguration|TypeScript-Konfiguration]]
- [[_COMMUNITY_Seiten & Store-Loader|Seiten & Store-Loader]]
- [[_COMMUNITY_Leads-Tabelle & Filter|Leads-Tabelle & Filter]]
- [[_COMMUNITY_Website-Audit-Worker|Website-Audit-Worker]]
- [[_COMMUNITY_Audit-Route & DB-Client|Audit-Route & DB-Client]]
- [[_COMMUNITY_Verkaufs-Strategien & Kadenz|Verkaufs-Strategien & Kadenz]]
- [[_COMMUNITY_OSM-Scraper|OSM-Scraper]]
- [[_COMMUNITY_HTML-CRM-Import|HTML-CRM-Import]]
- [[_COMMUNITY_Handelsregister-Trigger|Handelsregister-Trigger]]
- [[_COMMUNITY_Mockup-Vorlagen|Mockup-Vorlagen]]
- [[_COMMUNITY_easybell-SIP-Client|easybell-SIP-Client]]
- [[_COMMUNITY_Audit-Runner-Seite|Audit-Runner-Seite]]
- [[_COMMUNITY_Root-Layout & Fonts|Root-Layout & Fonts]]
- [[_COMMUNITY_Launch-Konfiguration|Launch-Konfiguration]]
- [[_COMMUNITY_Lead-API|Lead-API]]
- [[_COMMUNITY_Matcher-Test|Matcher-Test]]
- [[_COMMUNITY_ESLint-Config|ESLint-Config]]
- [[_COMMUNITY_Next.js-Config|Next.js-Config]]
- [[_COMMUNITY_PostCSS-Config|PostCSS-Config]]
- [[_COMMUNITY_Matcher-Verify-Tmp|Matcher-Verify-Tmp]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 44 edges
2. `Badge()` - 17 edges
3. `Shell()` - 16 edges
4. `compilerOptions` - 16 edges
5. `Card()` - 14 edges
6. `ButtonLink()` - 13 edges
7. `getLead()` - 13 edges
8. `dashboardSummary()` - 13 edges
9. `Lead` - 10 edges
10. `runAudit()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `invoices (quotes + invoices)` --shares_data_with--> `leads`  [INFERRED]
  BERICHT.md → README.md
- `AW Digital OS` --references--> `Next.js Agent Rules`  [EXTRACTED]
  README.md → AGENTS.md
- `Souffleur (live sales coaching)` --calls--> `Anthropic Claude (Sonnet 4.6 / Haiku 4.5)`  [INFERRED]
  BERICHT.md → README.md
- `ScoreTile()` --calls--> `cn()`  [EXTRACTED]
  src/app/audits/run/page.tsx → src/lib/utils.ts
- `LeadDetailPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/leads/[id]/page.tsx → src/app/not-found.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Souffleur Live Sales Coaching Flow** — bericht_souffleur, bericht_deepgram, readme_anthropic_claude, bericht_webrtc_softphone [INFERRED 0.85]
- **easybell Telephony Call Paths** — readme_easybell, bericht_tel_link, bericht_webrtc_softphone, bericht_easybell_rest_api [INFERRED 0.85]
- **Lead-Centric Data Model** — readme_leads, readme_activities, readme_calls, readme_appointments, readme_audits [EXTRACTED 1.00]

## Communities (34 total, 9 thin omitted)

### Community 0 - "Dashboard & UI-Komponenten"
Cohesion: 0.06
Nodes (41): Flag(), ScoreBar(), GeminiChat(), PainScoreCell(), QueueItem(), scoreVariant(), TRADE_LABEL, Shell() (+33 more)

### Community 1 - "Finanzen-Seite & Rechnungen"
Cohesion: 0.09
Nodes (30): HomePage(), Invoice, eur(), FinancesPage(), STATUS_LABEL, TYPE_LABEL, AppointmentWithLead, dashboardSummary() (+22 more)

### Community 2 - "Dependencies & Build-Config"
Cohesion: 0.05
Nodes (41): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, drizzle-orm, fast-xml-parser, jssip, lucide-react (+33 more)

### Community 3 - "SIP-Client & Souffleur-Matcher"
Cohesion: 0.07
Nodes (28): JsSIPUA, JsSIPWS, RTCSession, SipConfig, SipEvents, SipStatus, matchMove(), PRIORITY (+20 more)

### Community 4 - "Architektur-Konzepte (Docs)"
Cohesion: 0.09
Nodes (28): Next.js Agent Rules, api/ai/strategy (Claude Haiku), DATABASE_URL, Deepgram (transcription), easybell REST Click-to-Call API (removed), invoices (quotes + invoices), Mock Mode (isMockMode), Souffleur (live sales coaching) (+20 more)

### Community 5 - "Drizzle-Datenmodell"
Cohesion: 0.07
Nodes (27): activities, activityTypeEnum, Appointment, appointments, Audit, Call, callDispoEnum, calls (+19 more)

### Community 6 - "Call-Mode & Aktivitaeten"
Cohesion: 0.12
Nodes (15): ActivityTimeline(), fmt, ICONS, TONES, CallMode(), DISPOSITIONS, TONE_STYLES, Activity (+7 more)

### Community 7 - "TypeScript-Konfiguration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Seiten & Store-Loader"
Cohesion: 0.19
Nodes (15): NotFound(), MockupForLeadPage(), SouffleurPage(), getAudit(), getLatestAuditForLead(), getLead(), pickTemplate(), checkRow() (+7 more)

### Community 9 - "Leads-Tabelle & Filter"
Cohesion: 0.13
Nodes (12): LeadsFilter(), STATUSES, LeadsTable(), PainCell(), STATUS_DOT, STATUS_LABEL, STATUS_OPTIONS, StatusMenu() (+4 more)

### Community 10 - "Website-Audit-Worker"
Cohesion: 0.23
Nodes (12): POST(), AuditResult, buildHook(), detectTechStack(), extractFooterYear(), fetchHtml(), fetchPagespeed(), normalize() (+4 more)

### Community 11 - "Audit-Route & DB-Client"
Cohesion: 0.15
Nodes (9): POST(), AuditsPage(), DbClient, PATCH(), listAudits(), listProjects(), listTriggers(), ProjectsPage() (+1 more)

### Community 12 - "Verkaufs-Strategien & Kadenz"
Cohesion: 0.15
Nodes (12): BEST_CALL_TIMES, CadenceStep, FOLLOW_UP_CADENCE, GOLDEN_RULES, MICRO_COMMITMENTS, NEIN_GRADIENTEN, NeinGradient, NeinTyp (+4 more)

### Community 13 - "OSM-Scraper"
Cohesion: 0.24
Nodes (7): POST(), buildOverpassQuery(), fetchOsmLeads(), OsmLeadRaw, OVERPASS_ENDPOINTS, scrapeTrade(), TRADE_MAP

### Community 14 - "HTML-CRM-Import"
Cohesion: 0.28
Nodes (6): NewLead, HtmlLeadSchema, mapHtmlExport(), SCORE_MAP, STATUS_MAP, POST()

### Community 15 - "Handelsregister-Trigger"
Cohesion: 0.31
Nodes (6): GET(), FEEDS, fetchAllNeugruendungen(), filterHandwerk(), HandelsregisterEvent, HANDWERK_KEYWORDS

### Community 16 - "Mockup-Vorlagen"
Cohesion: 0.39
Nodes (6): MockupPreview(), servicesFor(), slug(), tradePhrase(), TemplateBrief, TemplateId

### Community 19 - "Root-Layout & Fonts"
Cohesion: 0.40
Nodes (3): geistMono, inter, metadata

## Knowledge Gaps
- **164 isolated node(s):** `version`, `configurations`, `sentences`, `moves`, `sentences` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Dashboard & UI-Komponenten` to `Leads-Tabelle & Filter`, `Audit-Runner-Seite`, `SIP-Client & Souffleur-Matcher`, `Call-Mode & Aktivitaeten`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `EasybellSipClient` connect `easybell-SIP-Client` to `Dashboard & UI-Komponenten`, `SIP-Client & Souffleur-Matcher`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `getLead()` connect `Seiten & Store-Loader` to `Dashboard & UI-Komponenten`, `Finanzen-Seite & Rechnungen`, `SIP-Client & Souffleur-Matcher`, `Drizzle-Datenmodell`, `Call-Mode & Aktivitaeten`, `Audit-Route & DB-Client`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `sentences` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard & UI-Komponenten` be split into smaller, more focused modules?**
  _Cohesion score 0.06049382716049383 - nodes in this community are weakly interconnected._
- **Should `Finanzen-Seite & Rechnungen` be split into smaller, more focused modules?**
  _Cohesion score 0.08710801393728224 - nodes in this community are weakly interconnected._
- **Should `Dependencies & Build-Config` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._