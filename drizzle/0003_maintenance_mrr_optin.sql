ALTER TABLE "leads" ADD COLUMN "maintenance_interval_months" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_maintenance_invoice_at" timestamp with time zone;