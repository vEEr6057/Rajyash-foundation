CREATE TYPE "public"."run_slot" AS ENUM('morning', 'night');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('planned', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stop_kind" AS ENUM('pickup', 'drop');--> statement-breakpoint
CREATE TYPE "public"."stop_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TABLE "run_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"seq" integer NOT NULL,
	"kind" "stop_kind" NOT NULL,
	"partner_id" text,
	"destination_id" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"status" "stop_status" DEFAULT 'pending' NOT NULL,
	"done_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"driver_id" text,
	"slot" "run_slot" NOT NULL,
	"status" "run_status" DEFAULT 'planned' NOT NULL,
	"run_date" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_stops" ADD CONSTRAINT "run_stops_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_stops" ADD CONSTRAINT "run_stops_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_stops" ADD CONSTRAINT "run_stops_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_driver_id_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_stops_run_idx" ON "run_stops" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "run_stops_run_seq_idx" ON "run_stops" USING btree ("run_id","seq");