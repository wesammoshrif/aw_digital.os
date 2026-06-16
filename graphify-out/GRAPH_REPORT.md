# Graph Report - .  (2026-06-17)

## Corpus Check
- 167 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1088 nodes · 2828 edges · 51 communities (42 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

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

## Communities (51 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (90): concurrently, isUnique, method, with, columnsFrom, columnsTo, onDelete, onUpdate (+82 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (90): concurrently, isUnique, method, with, columnsFrom, columnsTo, onDelete, onUpdate (+82 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (64): amount, cls_score, converted_invoice_id, created_at, currency, desktop_score, dispo, due_date (+56 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (45): HomePage(), Invoice, eur(), FinancesPage(), STATUS_LABEL, TYPE_LABEL, timingSafeEqualStr(), verifyBasicAuth() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): souffleurSuggestSchema, EasybellSipClient, JsSIPUA, JsSIPWS, RTCSession, RTCSessionExt, SipConfig, SipEvents (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (42): ACTIVITY_TYPES, POST(), POST(), Dispo, DISPO_VALUES, NewCallInput, POST(), GET() (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (53): Website-Audit-Engine (Pain-Score + Hook), Google Lighthouse (4 Kategorien), PDF Onepager (lib/pdf/onepager.ts), PAGESPEED_API_KEY (ENV), attr(), finalize(), metaContent(), runSeoChecks() (+45 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (37): BUILDER_HOSTS, detectBuilderSubdomain(), dedupKey(), findLeads(), isRicher(), ImportResponse, PhoneFilter, SOURCE_CATALOG (+29 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (43): POST(), AuditsPage(), Auth/Login & RLS-Policies (P0 fürs Online-Gehen), DbClient, activities, activityTypeEnum, AgentReview, appointments (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (36): cleanPhone(), enrichFromWebsite(), EnrichResult, extractContactName(), extractEmail(), extractPhone(), fetchHtml(), isPlausibleEmail() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (35): columnsFrom, columnsTo, onDelete, onUpdate, tableFrom, tableTo, dialect, activities_lead_id_leads_id_fk (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (21): Flag(), ScoreBar(), LeadsFilter(), STATUSES, PainCell(), PainScoreCell(), QueueItem(), scoreVariant() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (19): geistMono, inter, metadata, RootLayout(), ADMIN_EMAILS, isAdminEmail(), getSessionUser(), Role (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (27): Next.js Agent Rules, api/ai/strategy (Claude Haiku), DATABASE_URL, Deepgram (transcription), easybell REST Click-to-Call API (removed), invoices (quotes + invoices), Mock Mode (isMockMode), Souffleur (live sales coaching) (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (19): NotFound(), fmt, ICONS, TONES, Activity, fmtDate(), LeadDetailPage(), MetaLink() (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (24): Termine & Termin-Erinnerung (appointments), Asterisk (Docker, andrius/asterisk, network_mode host), AW Digital OS (Cold-Call-Akquise-Cockpit), BERICHT.md — Status-Bericht & Go-Live-Checkliste, Call-Flow (CallMode → Souffleur → Dispo → Cadence), calls-Persistenz & Anruf-Statistik, Anthropic Claude Haiku 4.5 (Souffleur-Tipps/Summaries), Scheduler/Cron-Tick (/api/cron/tick) (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (10): Shell(), NewProject, LeadsPage(), listLeads(), INVOICE_STATUS, QUOTE_STATUS, STATUS_OPTIONS, TYPE_OPTIONS (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (10): TRADES, TRADES, Button, ButtonProps, CommonProps, LinkProps, Size, SIZES (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (17): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, drizzle-orm, fast-xml-parser, jssip, lucide-react (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): devDependencies, drizzle-kit, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (10): scrapeOsmSchema, POST(), RawLead, buildOverpassQuery(), fetchOsmLeads(), OsmLeadRaw, OVERPASS_ENDPOINTS, scrapeTrade() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.23
Nodes (6): STATUS_LABEL, fmtDateTime(), ReminderBadge(), ReminderState, ButtonLink(), Card()

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (10): NewLead, HtmlLeadSchema, mapHtmlExport(), SCORE_MAP, STATUS_MAP, POST(), quickPainScore(), toSource() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (11): getAudit(), getLatestAuditForLead(), checkRow(), esc(), OnepagerAudit, OnepagerLead, renderOnepagerHtml(), scoreColor() (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (13): scripts, build, db:clear, db:generate, db:migrate, db:push, db:seed, db:studio (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (3): CountUp(), TargetRing(), WeekSparkline()

### Community 27 - "Community 27"
Cohesion: 0.24
Nodes (4): INTEGRATIONS, IOSGroup(), IOSRow(), IOSSwitch()

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (5): TONE_STYLES, Lead, applyCadence(), CadenceResult, Disposition

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (5): AuditResult, LighthouseScores, ScoreTile(), SeoCheck, SeoReport

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (4): MockupForLeadPage(), pickTemplate(), TemplateBrief, TemplateId

### Community 31 - "Community 31"
Cohesion: 0.31
Nodes (6): GET(), FEEDS, fetchAllNeugruendungen(), filterHandwerk(), HandelsregisterEvent, HANDWERK_KEYWORDS

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (4): NAV, Sidebar(), Me, Logo()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): name, overrides, esbuild, private, version

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): dialect, entries, version

## Knowledge Gaps
- **238 isolated node(s):** `version`, `configurations`, `sentences`, `moves`, `sentences` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 11` to `Community 32`, `Community 4`, `Community 12`, `Community 14`, `Community 16`, `Community 18`, `Community 22`, `Community 26`, `Community 27`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Trigger Events` connect `Community 13` to `Community 8`, `Community 3`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `sentences` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09588014981273409 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09588014981273409 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._