CREATE TABLE "stop_status_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stop_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" "stop_status",
	"to_status" "stop_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stop_status_events" ADD CONSTRAINT "stop_status_events_stop_id_run_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."run_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stop_status_events_stop_idx" ON "stop_status_events" USING btree ("stop_id");--> statement-breakpoint

-- RLS boundary (see 0013_rls_policies.sql for why this matters): the anon key has
-- default full grants on every public table, so RLS-enable is the only thing
-- protecting this new table. Same model as status_events (run_stops' pickup-audit
-- equivalent) — server writes/reads via the service-role key, which bypasses RLS;
-- no browser role ever needs direct access, so there is deliberately NO policy
-- (RLS on, zero policies = default-deny for anon/authenticated).
ALTER TABLE "stop_status_events" ENABLE ROW LEVEL SECURITY;