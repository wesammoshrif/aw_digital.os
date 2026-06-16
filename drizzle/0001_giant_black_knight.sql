CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent', 'pending');--> statement-breakpoint
CREATE TABLE "agent_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"rating" integer,
	"strengths" jsonb,
	"weaknesses" jsonb,
	"failure_points" jsonb,
	"summary" text,
	"coaching" text,
	"calls_analyzed" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'pending' NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"sip_username" text,
	"sip_password" text,
	"sip_domain" text,
	"sip_wss" text,
	"sip_display_name" text,
	"sip_clip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_reviews_agent_idx" ON "agent_reviews" USING btree ("agent_id","created_at");