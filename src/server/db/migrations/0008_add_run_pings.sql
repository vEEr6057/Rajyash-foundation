CREATE TABLE "run_pings" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_pings" ADD CONSTRAINT "run_pings_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_pings" ADD CONSTRAINT "run_pings_driver_id_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_pings_run_idx" ON "run_pings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "run_pings_run_created_idx" ON "run_pings" USING btree ("run_id","created_at" DESC NULLS LAST);