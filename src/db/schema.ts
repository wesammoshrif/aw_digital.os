/**
 * AW Digital OS — Drizzle Schema
 *
 * Domain model for the Solo-Akquise-CRM. All tables have:
 *   - owner_id (single-tenant for now; ready for multi-tenant later)
 *   - created_at / updated_at timestamps
 *
 * Convention: snake_case in DB, camelCase in TS via column().
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  boolean,
  numeric,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "reached",
  "audit_sent",
  "proposal",
  "won",
  "lost",
  "frozen",
]);

export const leadScoreEnum = pgEnum("lead_score", ["hot", "warm", "cold"]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "sms",
  "note",
  "meeting",
  "audit",
  "proposal",
  "contract",
  "status_change",
]);

export const callDispoEnum = pgEnum("call_dispo", [
  "no_answer",
  "voicemail",
  "busy",
  "interested",
  "appointment",
  "callback",
  "not_interested",
  "wrong_number",
  // Harter Opt-out: Kunde will nie wieder angerufen werden (DNC).
  "opt_out",
]);

export const sourceEnum = pgEnum("lead_source", [
  "osm",
  "google_places",
  "innung",
  "hwk",
  "kommune",
  "handelsregister",
  "google_news",
  "manual",
  "inbound_form",
  "referral",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "design",
  "development",
  "review",
  "live",
  "on_hold",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  // Angebot-Lebenszyklus (kind = "quote"):
  "accepted",
  "declined",
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "one_time",
  "deposit",
  "recurring_maintenance",
  "recurring_hosting",
]);

// Angebote sind Teil der invoices-Tabelle, unterschieden über kind.
export const invoiceKindEnum = pgEnum("invoice_kind", ["quote", "invoice"]);

// Rollen: admin (Wesam + Aschraf), agent (Mitarbeiter), pending (wartet auf Freigabe).
export const userRoleEnum = pgEnum("user_role", ["admin", "agent", "pending"]);

// ─── Tables ────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),

    // Stamm
    company: text("company").notNull(),
    trade: text("trade"), // Dachdecker, Maler, …
    city: text("city"),
    postalCode: text("postal_code"),
    address: text("address"),

    // Kontakt
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),

    // Pipeline
    status: leadStatusEnum("status").notNull().default("new"),
    score: leadScoreEnum("score"),
    source: sourceEnum("source").notNull().default("manual"),
    value: numeric("value", { precision: 10, scale: 2 }),
    maintenance: numeric("maintenance", { precision: 10, scale: 2 }),
    // Opt-in MRR-Automat: ist ein Intervall (in Monaten) gesetzt, erzeugt der
    // Cron für diesen gewonnenen Kunden automatisch wiederkehrende Wartungs-
    // rechnungen (Betrag = maintenance). NULL = aus → keine Auto-Rechnung.
    maintenanceIntervalMonths: integer("maintenance_interval_months"),
    lastMaintenanceInvoiceAt: timestamp("last_maintenance_invoice_at", {
      withTimezone: true,
    }),

    // Audit & Hooks
    painScore: integer("pain_score"), // 0–100, je niedriger desto besser für uns
    auditHook: text("audit_hook"),
    auditPayload: jsonb("audit_payload").$type<Record<string, unknown>>(),

    // Akquise-State
    nextStep: text("next_step"),
    nextStepAt: timestamp("next_step_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    locked: boolean("locked").notNull().default(false), // „nicht kontaktieren"

    // Compliance / Do-Not-Call (DNC) — harter, dauerhafter Anruf-Ausschluss.
    dnc: boolean("dnc").notNull().default(false),
    dncReason: text("dnc_reason"),
    dncAt: timestamp("dnc_at", { withTimezone: true }),
    // Erlaubter Erstkontakt: 'brief' (rechtssicher bei Public-Scraping) oder
    // 'telefon' (erst nach dokumentierter Einwilligung). NULL = unbestimmt.
    firstContactChannel: text("first_contact_channel"),
    // Einwilligung in Telefonwerbung dokumentiert (§7 UWG) + Zeitstempel/Quelle.
    consentDocumented: boolean("consent_documented").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentSource: text("consent_source"),

    notes: text("notes"),
    tags: text("tags").array(),
    custom: jsonb("custom").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("leads_owner_status_idx").on(t.ownerId, t.status),
    index("leads_owner_next_step_idx").on(t.ownerId, t.nextStepAt),
    index("leads_phone_idx").on(t.phone),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),

    type: activityTypeEnum("type").notNull(),
    title: text("title"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activities_lead_idx").on(t.leadId, t.createdAt),
    index("activities_owner_type_idx").on(t.ownerId, t.type, t.createdAt),
  ],
);

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSec: integer("duration_sec"),

  dispo: callDispoEnum("dispo"),
  transcript: text("transcript"),
  summary: jsonb("summary").$type<Record<string, unknown>>(),
  sentiment: text("sentiment"), // positive | neutral | negative

  // easybell-Integration
  externalCallId: text("external_call_id"),
  externalProvider: text("external_provider").default("easybell"),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"),
  status: text("status").notNull().default("scheduled"), // scheduled|done|cancelled
  title: text("title"), // z.B. "Vor-Ort-Audit", "Telefon-Termin"
  icsUid: text("ics_uid"),
  // Termin-Erinnerung: Zeitpunkt, zu dem erinnert werden soll, + ob schon raus.
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const audits = pgTable("audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),

  websiteUrl: text("website_url").notNull(),

  // PageSpeed
  mobileScore: integer("mobile_score"),
  desktopScore: integer("desktop_score"),
  lcpMs: integer("lcp_ms"),
  clsScore: numeric("cls_score", { precision: 5, scale: 3 }),

  // Basic Checks
  hasHttps: boolean("has_https"),
  hasImpressum: boolean("has_impressum"),
  hasViewport: boolean("has_viewport"),
  hasBookingCta: boolean("has_booking_cta"),
  techStack: jsonb("tech_stack").$type<string[]>(),

  // Score
  painScore: integer("pain_score"), // 0–100
  hookText: text("hook_text"), // automatisch generierter Cold-Call-Hook

  // Vorher/Nachher
  screenshotUrl: text("screenshot_url"),
  pdfUrl: text("pdf_url"),

  rawResult: jsonb("raw_result").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const triggerEvents = pgTable(
  "trigger_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),

    type: text("type").notNull(), // handelsregister_new, hwk_press, foerderung, ssl_expired, news_alert
    source: text("source").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url"),
    matchedKeyword: text("matched_keyword"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("trigger_events_owner_occurred_idx").on(t.ownerId, t.occurredAt),
    index("trigger_events_lead_idx").on(t.leadId),
  ],
);


export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    status: projectStatusEnum("status").notNull().default("planning"),
    description: text("description"),

    // Timing
    startDate: timestamp("start_date", { withTimezone: true }),
    deadline: timestamp("deadline", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Assets & Access (Secure storage recommended in production)
    repoUrl: text("repo_url"),
    stagingUrl: text("staging_url"),
    liveUrl: text("live_url"),
    accessNotes: text("access_notes"), // e.g. "Hosting: Hetzner, CMS: WP"

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("projects_owner_status_idx").on(t.ownerId, t.status),
    index("projects_lead_idx").on(t.leadId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),
    priority: integer("priority").default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    dueDate: timestamp("due_date", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tasks_project_idx").on(t.projectId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    // Belegnummer: AN-… für Angebote, RE-… für Rechnungen
    invoiceNumber: text("invoice_number").notNull(),
    kind: invoiceKindEnum("kind").notNull().default("invoice"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    type: invoiceTypeEnum("type").notNull().default("one_time"),

    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),

    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow(),
    // Bei Angeboten: Gültig-bis. Bei Rechnungen: Zahlungsziel.
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // Wenn ein angenommenes Angebot in eine Rechnung überführt wurde:
    convertedInvoiceId: uuid("converted_invoice_id"),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invoices_owner_status_idx").on(t.ownerId, t.status),
    index("invoices_lead_idx").on(t.leadId),
    index("invoices_number_idx").on(t.invoiceNumber),
  ],
);


export const scrapeRuns = pgTable("scrape_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  source: sourceEnum("source").notNull(),
  region: text("region"), // PLZ, Stadt, Land
  trade: text("trade"),

  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"), // running|done|failed
  rawCount: integer("raw_count"),
  newCount: integer("new_count"),
  errorMessage: text("error_message"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
});

export const settings = pgTable("settings", {
  ownerId: uuid("owner_id").primaryKey(),

  // Rampe
  rampStart: integer("ramp_start").notNull().default(25),
  rampStep: integer("ramp_step").notNull().default(10),
  rampIntervalDays: integer("ramp_interval_days").notNull().default(14),
  rampMax: integer("ramp_max").notNull().default(100),
  rampStartedAt: timestamp("ramp_started_at", { withTimezone: true }),

  // Streak
  streakDays: integer("streak_days").notNull().default(0),
  streakRecord: integer("streak_record").notNull().default(0),
  lastActiveDate: text("last_active_date"), // YYYY-MM-DD

  // Integrations
  easybellApiKey: text("easybell_api_key"),
  pagespeedApiKey: text("pagespeed_api_key"),
  googlePlacesApiKey: text("google_places_api_key"),
  anthropicApiKey: text("anthropic_api_key"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Auth / Team (Multi-User) ───────────────────────────────────────────

// 1:1 mit Supabase auth.users (id = auth.users.id). role steuert RBAC,
// approved die Freigabe nach Selbst-Registrierung. Eigene SIP-Config pro
// Mitarbeiter, damit jeder mit seiner eigenen easybell-Nummer telefoniert.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("pending"),
  approved: boolean("approved").notNull().default(false),

  // Eigene Telefonie pro Mitarbeiter (Asterisk-/easybell-SIP-User)
  sipUsername: text("sip_username"),
  sipPassword: text("sip_password"),
  sipDomain: text("sip_domain"),
  sipWss: text("sip_wss"),
  sipDisplayName: text("sip_display_name"),
  sipClip: text("sip_clip"), // angezeigte Rufnummer (+49…)

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// KI-Mitarbeiter-Bewertung — NUR für Admins sichtbar (RLS), nie für den Agent.
export const agentReviews = pgTable(
  "agent_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    rating: integer("rating"), // 0–100
    strengths: jsonb("strengths").$type<string[]>(),
    weaknesses: jsonb("weaknesses").$type<string[]>(),
    failurePoints: jsonb("failure_points").$type<string[]>(), // wo es gescheitert ist
    summary: text("summary"),
    coaching: text("coaching"),
    callsAnalyzed: integer("calls_analyzed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("agent_reviews_agent_idx").on(t.agentId, t.createdAt)],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type TriggerEvent = typeof triggerEvents.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type AgentReview = typeof agentReviews.$inferSelect;
