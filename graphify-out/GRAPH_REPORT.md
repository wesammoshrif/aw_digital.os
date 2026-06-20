# Graph Report - .  (2026-06-20)

## Corpus Check
- 46 files · ~99,286 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1110 nodes · 2877 edges · 54 communities (44 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API-Routen & Dispo|API-Routen & Dispo]]
- [[_COMMUNITY_Drizzle-Migrationen|Drizzle-Migrationen]]
- [[_COMMUNITY_Drizzle-Migrationen II|Drizzle-Migrationen II]]
- [[_COMMUNITY_DB-Schema-Felder|DB-Schema-Felder]]
- [[_COMMUNITY_Leads-Finder|Leads-Finder]]
- [[_COMMUNITY_Website-Audit & SEO|Website-Audit & SEO]]
- [[_COMMUNITY_Souffleur-Telefonie (SIP)|Souffleur-Telefonie (SIP)]]
- [[_COMMUNITY_Impressum-Anreicherung|Impressum-Anreicherung]]
- [[_COMMUNITY_Aktivitaeten & Termine|Aktivitaeten & Termine]]
- [[_COMMUNITY_ProjekteMockupsRechnungen-UI|Projekte/Mockups/Rechnungen-UI]]
- [[_COMMUNITY_Auth-Fundament (SessionAdmin)|Auth-Fundament (Session/Admin)]]
- [[_COMMUNITY_Leads-UI|Leads-UI]]
- [[_COMMUNITY_Dashboard|Dashboard]]
- [[_COMMUNITY_Store & Tagesziel-Rampe|Store & Tagesziel-Rampe]]
- [[_COMMUNITY_Bereich 14|Bereich 14]]
- [[_COMMUNITY_Bereich 15|Bereich 15]]
- [[_COMMUNITY_Bereich 16|Bereich 16]]
- [[_COMMUNITY_Bereich 17|Bereich 17]]
- [[_COMMUNITY_Bereich 18|Bereich 18]]
- [[_COMMUNITY_Bereich 19|Bereich 19]]
- [[_COMMUNITY_Bereich 20|Bereich 20]]
- [[_COMMUNITY_Bereich 21|Bereich 21]]
- [[_COMMUNITY_Bereich 22|Bereich 22]]
- [[_COMMUNITY_Bereich 23|Bereich 23]]
- [[_COMMUNITY_Bereich 24|Bereich 24]]
- [[_COMMUNITY_Bereich 25|Bereich 25]]
- [[_COMMUNITY_Bereich 26|Bereich 26]]
- [[_COMMUNITY_Bereich 27|Bereich 27]]
- [[_COMMUNITY_Bereich 28|Bereich 28]]
- [[_COMMUNITY_Bereich 29|Bereich 29]]
- [[_COMMUNITY_Bereich 30|Bereich 30]]
- [[_COMMUNITY_Bereich 31|Bereich 31]]
- [[_COMMUNITY_Bereich 32|Bereich 32]]
- [[_COMMUNITY_Bereich 33|Bereich 33]]
- [[_COMMUNITY_Bereich 34|Bereich 34]]
- [[_COMMUNITY_Bereich 35|Bereich 35]]
- [[_COMMUNITY_Bereich 36|Bereich 36]]
- [[_COMMUNITY_Bereich 37|Bereich 37]]
- [[_COMMUNITY_Bereich 38|Bereich 38]]
- [[_COMMUNITY_Bereich 39|Bereich 39]]
- [[_COMMUNITY_Bereich 40|Bereich 40]]
- [[_COMMUNITY_Bereich 41|Bereich 41]]
- [[_COMMUNITY_Bereich 42|Bereich 42]]
- [[_COMMUNITY_Bereich 46|Bereich 46]]
- [[_COMMUNITY_Bereich 47|Bereich 47]]
- [[_COMMUNITY_Bereich 49|Bereich 49]]
- [[_COMMUNITY_Bereich 50|Bereich 50]]

## God Nodes (most connected - your core abstractions)
1. `columns` - 60 edges
2. `columns` - 60 edges
3. `columns` - 59 edges
4. `requireAuth()` - 52 edges
5. `primaryKey` - 51 edges
6. `primaryKey` - 51 edges
7. `notNull` - 50 edges
8. `notNull` - 50 edges
9. `primaryKey` - 49 edges
10. `notNull` - 49 edges

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

## Communities (54 total, 10 thin omitted)

### Community 0 - "API-Routen & Dispo"
Cohesion: 0.05
Nodes (68): ACTIVITY_TYPES, POST(), POST(), POST(), Dispo, DISPO_VALUES, NewCallInput, POST() (+60 more)

### Community 1 - "Drizzle-Migrationen"
Cohesion: 0.10
Nodes (90): concurrently, isUnique, method, with, columnsFrom, columnsTo, onDelete, onUpdate (+82 more)

### Community 2 - "Drizzle-Migrationen II"
Cohesion: 0.10
Nodes (90): concurrently, isUnique, method, with, columnsFrom, columnsTo, onDelete, onUpdate (+82 more)

### Community 3 - "DB-Schema-Felder"
Cohesion: 0.12
Nodes (77): amount, cls_score, converted_invoice_id, created_at, currency, desktop_score, dispo, due_date (+69 more)

### Community 4 - "Leads-Finder"
Cohesion: 0.06
Nodes (42): BUILDER_HOSTS, detectBuilderSubdomain(), dedupKey(), findLeads(), isRicher(), ImportResponse, PhoneFilter, SOURCE_CATALOG (+34 more)

### Community 5 - "Website-Audit & SEO"
Cohesion: 0.06
Nodes (53): Website-Audit-Engine (Pain-Score + Hook), Google Lighthouse (4 Kategorien), PDF Onepager (lib/pdf/onepager.ts), PAGESPEED_API_KEY (ENV), attr(), finalize(), metaContent(), runSeoChecks() (+45 more)

### Community 6 - "Souffleur-Telefonie (SIP)"
Cohesion: 0.06
Nodes (36): souffleurSuggestSchema, EasybellSipClient, JsSIPUA, JsSIPWS, RTCSession, RTCSessionExt, SipConfig, SipEvents (+28 more)

### Community 7 - "Impressum-Anreicherung"
Cohesion: 0.10
Nodes (37): cleanPhone(), enrichFromWebsite(), EnrichResult, extractContactName(), extractEmail(), extractPhone(), fetchHtml(), isPlausibleEmail() (+29 more)

### Community 8 - "Aktivitaeten & Termine"
Cohesion: 0.06
Nodes (35): Auth/Login & RLS-Policies (P0 fürs Online-Gehen), fmt, ICONS, TONES, activities, Activity, activityTypeEnum, appointments (+27 more)

### Community 9 - "Projekte/Mockups/Rechnungen-UI"
Cohesion: 0.07
Nodes (11): Shell(), NewProject, INVOICE_STATUS, QUOTE_STATUS, STATUS_OPTIONS, TRADES, TYPE_OPTIONS, COLUMNS (+3 more)

### Community 10 - "Auth-Fundament (Session/Admin)"
Cohesion: 0.10
Nodes (20): geistMono, inter, metadata, RootLayout(), ADMIN_EMAILS, isAdminEmail(), getSessionUser(), Role (+12 more)

### Community 11 - "Leads-UI"
Cohesion: 0.10
Nodes (16): Flag(), ScoreBar(), LeadsFilter(), STATUSES, PainCell(), STATUS_DOT, STATUS_LABEL, STATUS_OPTIONS (+8 more)

### Community 12 - "Dashboard"
Cohesion: 0.13
Nodes (12): CountUp(), PainScoreCell(), QueueItem(), scoreVariant(), STATUS_LABEL, FeedItem(), fmt, TYPE_META (+4 more)

### Community 13 - "Store & Tagesziel-Rampe"
Cohesion: 0.15
Nodes (20): AppointmentWithLead, DEFAULT_RAMP, RampConfig, callsThisWeek(), mockActivities, mockAppointments, mockAudits, mockCalls (+12 more)

### Community 14 - "Bereich 14"
Cohesion: 0.10
Nodes (25): Next.js Agent Rules, api/ai/strategy (Claude Haiku), DATABASE_URL, Deepgram (transcription), easybell REST Click-to-Call API (removed), invoices (quotes + invoices), Mock Mode (isMockMode), Souffleur (live sales coaching) (+17 more)

### Community 15 - "Bereich 15"
Cohesion: 0.13
Nodes (20): NotFound(), AuditsPage(), DbClient, LeadDetailPage(), MockupForLeadPage(), SouffleurPage(), PATCH(), createProject() (+12 more)

### Community 16 - "Bereich 16"
Cohesion: 0.13
Nodes (24): Termine & Termin-Erinnerung (appointments), Asterisk (Docker, andrius/asterisk, network_mode host), AW Digital OS (Cold-Call-Akquise-Cockpit), BERICHT.md — Status-Bericht & Go-Live-Checkliste, Call-Flow (CallMode → Souffleur → Dispo → Cadence), calls-Persistenz & Anruf-Statistik, Anthropic Claude Haiku 4.5 (Souffleur-Tipps/Summaries), Scheduler/Cron-Tick (/api/cron/tick) (+16 more)

### Community 17 - "Bereich 17"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "Bereich 18"
Cohesion: 0.12
Nodes (17): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, drizzle-orm, fast-xml-parser, jssip, lucide-react (+9 more)

### Community 19 - "Bereich 19"
Cohesion: 0.12
Nodes (15): devDependencies, drizzle-kit, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom (+7 more)

### Community 20 - "Bereich 20"
Cohesion: 0.17
Nodes (11): fmtDateTime(), ReminderBadge(), ReminderState, ButtonLink(), ButtonProps, CommonProps, LinkProps, Size (+3 more)

### Community 21 - "Bereich 21"
Cohesion: 0.25
Nodes (11): timingSafeEqualStr(), verifyBasicAuth(), sendEmail(), listAppointments(), listAppointmentsWithLead(), nowAnchor(), TerminePage(), GET() (+3 more)

### Community 22 - "Bereich 22"
Cohesion: 0.21
Nodes (8): Invoice, eur(), FinancesPage(), STATUS_LABEL, TYPE_LABEL, listInvoices(), listQuotes(), listRechnungen()

### Community 23 - "Bereich 23"
Cohesion: 0.54
Nodes (13): columnsFrom, columnsTo, onDelete, onUpdate, tableFrom, tableTo, activities_lead_id_leads_id_fk, appointments_lead_id_leads_id_fk (+5 more)

### Community 24 - "Bereich 24"
Cohesion: 0.15
Nodes (13): scripts, build, db:clear, db:generate, db:migrate, db:push, db:seed, db:studio (+5 more)

### Community 25 - "Bereich 25"
Cohesion: 0.35
Nodes (9): fmtDate(), MetaLink(), MetaRow(), ProjectDetailPage(), STATUS_LABEL, statusVariant(), STEPS, getProject() (+1 more)

### Community 26 - "Bereich 26"
Cohesion: 0.24
Nodes (4): INTEGRATIONS, IOSGroup(), IOSRow(), IOSSwitch()

### Community 27 - "Bereich 27"
Cohesion: 0.27
Nodes (5): TONE_STYLES, Lead, applyCadence(), CadenceResult, Disposition

### Community 28 - "Bereich 28"
Cohesion: 0.31
Nodes (9): getLatestAuditForLead(), checkRow(), esc(), OnepagerAudit, OnepagerLead, renderOnepagerHtml(), scoreColor(), SeoCheckLite (+1 more)

### Community 29 - "Bereich 29"
Cohesion: 0.18
Nodes (5): AuditResult, LighthouseScores, ScoreTile(), SeoCheck, SeoReport

### Community 30 - "Bereich 30"
Cohesion: 0.24
Nodes (10): HomePage(), LeadsPage(), callStats(), dashboardSummary(), getStreak(), listCalls(), listLeads(), rampDailyTarget() (+2 more)

### Community 31 - "Bereich 31"
Cohesion: 0.20
Nodes (9): dialect, prevId, version, dialect, prevId, version, dialect, prevId (+1 more)

### Community 32 - "Bereich 32"
Cohesion: 0.31
Nodes (9): AgentMetrics, clamp(), computeAgentMetrics(), deterministicReview(), generateAgentReview(), num(), pct(), RecentCall (+1 more)

### Community 33 - "Bereich 33"
Cohesion: 0.28
Nodes (4): NAV, Sidebar(), Me, Logo()

### Community 36 - "Bereich 36"
Cohesion: 0.29
Nodes (3): Phase, PHASE_INDEX, PHASES

### Community 37 - "Bereich 37"
Cohesion: 0.33
Nodes (5): name, overrides, esbuild, private, version

### Community 38 - "Bereich 38"
Cohesion: 0.50
Nodes (3): dialect, entries, version

## Knowledge Gaps
- **246 isolated node(s):** `version`, `configurations`, `sentences`, `moves`, `sentences` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Leads-UI` to `Bereich 33`, `Souffleur-Telefonie (SIP)`, `Aktivitaeten & Termine`, `Projekte/Mockups/Rechnungen-UI`, `Auth-Fundament (Session/Admin)`, `Dashboard`, `Bereich 20`, `Bereich 26`, `Bereich 27`, `Bereich 29`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Trigger Events` connect `Aktivitaeten & Termine` to `Store & Tagesziel-Rampe`, `Bereich 14`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `AW Digital OS` connect `Bereich 14` to `Aktivitaeten & Termine`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `sentences` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API-Routen & Dispo` be split into smaller, more focused modules?**
  _Cohesion score 0.050560512468542665 - nodes in this community are weakly interconnected._
- **Should `Drizzle-Migrationen` be split into smaller, more focused modules?**
  _Cohesion score 0.09588014981273409 - nodes in this community are weakly interconnected._
- **Should `Drizzle-Migrationen II` be split into smaller, more focused modules?**
  _Cohesion score 0.09588014981273409 - nodes in this community are weakly interconnected._