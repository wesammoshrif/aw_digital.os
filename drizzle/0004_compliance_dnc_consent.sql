ALTER TYPE "public"."call_dispo" ADD VALUE 'opt_out';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dnc" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dnc_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dnc_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "first_contact_channel" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_documented" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_source" text;