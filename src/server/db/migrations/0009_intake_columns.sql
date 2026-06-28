ALTER TABLE "pickups" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "pickups" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickups" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;