CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'sms', 'note', 'meeting', 'audit', 'proposal', 'contract', 'status_change');--> statement-breakpoint
CREATE TYPE "public"."call_dispo" AS ENUM('no_answer', 'voicemail', 'busy', 'interested', 'appointment', 'callback', 'not_interested', 'wrong_number');--> statement-breakpoint
CREATE TYPE "public"."invoice_kind" AS ENUM('quote', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('one_time', 'deposit', 'recurring_maintenance', 'recurring_hosting');--> statement-breakpoint
CREATE TYPE "public"."lead_score" AS ENUM('hot', 'warm', 'cold');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'reached', 'audit_sent', 'proposal', 'won', 'lost', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'design', 'development', 'review', 'live', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('osm', 'google_places', 'innung', 'hwk', 'kommune', 'handelsregister', 'google_news', 'manual', 'inbound_form', 'referral');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"title" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"title" text,
	"ics_uid" text,
	"reminder_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid,
	"website_url" text NOT NULL,
	"mobile_score" integer,
	"desktop_score" integer,
	"lcp_ms" integer,
	"cls_score" numeric(5, 3),
	"has_https" boolean,
	"has_impressum" boolean,
	"has_viewport" boolean,
	"has_booking_cta" boolean,
	"tech_stack" jsonb,
	"pain_score" integer,
	"hook_text" text,
	"screenshot_url" text,
	"pdf_url" text,
	"raw_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_sec" integer,
	"dispo" "call_dispo",
	"transcript" text,
	"summary" jsonb,
	"sentiment" text,
	"external_call_id" text,
	"external_provider" text DEFAULT 'easybell'
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"project_id" uuid,
	"invoice_number" text NOT NULL,
	"kind" "invoice_kind" DEFAULT 'invoice' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"type" "invoice_type" DEFAULT 'one_time' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now(),
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"converted_invoice_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"company" text NOT NULL,
	"trade" text,
	"city" text,
	"postal_code" text,
	"address" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" "lead_score",
	"source" "lead_source" DEFAULT 'manual' NOT NULL,
	"value" numeric(10, 2),
	"maintenance" numeric(10, 2),
	"pain_score" integer,
	"audit_hook" text,
	"audit_payload" jsonb,
	"next_step" text,
	"next_step_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"tags" text[],
	"custom" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"description" text,
	"start_date" timestamp with time zone,
	"deadline" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"repo_url" text,
	"staging_url" text,
	"live_url" text,
	"access_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"source" "lead_source" NOT NULL,
	"region" text,
	"trade" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"raw_count" integer,
	"new_count" integer,
	"error_message" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"ramp_start" integer DEFAULT 25 NOT NULL,
	"ramp_step" integer DEFAULT 10 NOT NULL,
	"ramp_interval_days" integer DEFAULT 14 NOT NULL,
	"ramp_max" integer DEFAULT 100 NOT NULL,
	"ramp_started_at" timestamp with time zone,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"streak_record" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"easybell_api_key" text,
	"pagespeed_api_key" text,
	"google_places_api_key" text,
	"anthropic_api_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trigger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"lead_id" uuid,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"matched_keyword" text,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_events" ADD CONSTRAINT "trigger_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_lead_idx" ON "activities" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "activities_owner_type_idx" ON "activities" USING btree ("owner_id","type","created_at");--> statement-breakpoint
CREATE INDEX "invoices_owner_status_idx" ON "invoices" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "invoices_lead_idx" ON "invoices" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "leads_owner_status_idx" ON "leads" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "leads_owner_next_step_idx" ON "leads" USING btree ("owner_id","next_step_at");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "projects_owner_status_idx" ON "projects" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "projects_lead_idx" ON "projects" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "trigger_events_owner_occurred_idx" ON "trigger_events" USING btree ("owner_id","occurred_at");--> statement-breakpoint
CREATE INDEX "trigger_events_lead_idx" ON "trigger_events" USING btree ("lead_id");