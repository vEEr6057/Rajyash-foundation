CREATE TYPE "public"."partner_type" AS ENUM('restaurant', 'hall', 'event_planner', 'family', 'other');--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "partner_type" NOT NULL,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"address" text,
	"city" text DEFAULT 'Ahmedabad' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;