-- 0013_rls_policies — the authorization boundary for direct-to-Postgres access.
--
-- WHY THIS EXISTS (security-review 2026-07-05, HIGH-1): the Supabase `anon` role — whose
-- key ships publicly in the client bundle — has DEFAULT full grants on every table. Row
-- Level Security is the ONLY thing preventing the public key from reading/writing every
-- row. Until this migration, RLS was applied by hand in the dashboard and absent from the
-- repo, so a fresh project (env-split dev DB, prod restore) built from migrations would
-- come up with RLS OFF = wide-open database. This migration makes the boundary reproducible.
--
-- Drizzle does not manage RLS; this is hand-authored and hand-maintained. It is IDEMPOTENT
-- (create-if-not-exists / or-replace / drop-if-exists) so it re-asserts cleanly on the
-- existing prod DB where the same objects already exist.
--
-- Model: RLS enabled on ALL public tables. The server reads/writes with the service-role
-- key, which bypasses RLS. The browser holds only the anon key + a Clerk session token
-- (role `authenticated`, `auth.jwt()->>'sub'` = Clerk userId). Only the two live-tracking
-- tables the browser reads directly carry SELECT policies; every other table is
-- default-deny (RLS on, no policy) so the anon/authenticated roles get nothing.

CREATE SCHEMA IF NOT EXISTS private;
--> statement-breakpoint

-- Ownership check for pickup location pings. SECURITY DEFINER + empty search_path so the
-- policy can see `pickups`/`profiles` without granting the caller direct access to them.
CREATE OR REPLACE FUNCTION private.can_view_pickup_pings(p_pickup_id text, p_uid text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pickups p
    WHERE p.id = p_pickup_id
      AND (
        p.donor_id = p_uid
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = p_uid AND pr.role = 'admin'
        )
      )
  );
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION private.can_view_pickup_pings(text, text) TO authenticated;
--> statement-breakpoint

-- Enable RLS on every public table. Enabling an already-enabled table is a no-op.
-- No FORCE: the table owner / service-role key must bypass RLS (that is how the server reads).
ALTER TABLE "profiles"                ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pickups"                 ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "location_pings"          ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "status_events"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "destinations"            ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partners"                ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "runs"                    ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "run_stops"               ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "run_pings"               ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- location_pings: the assigned volunteer inserts their own pings while the pickup is active;
-- the donor-owner or an admin may read them. Nobody else (and no anon) sees anything.
DROP POLICY IF EXISTS "location_pings_insert_assigned_volunteer" ON "location_pings";--> statement-breakpoint
CREATE POLICY "location_pings_insert_assigned_volunteer" ON "location_pings"
  FOR INSERT TO authenticated
  WITH CHECK (
    volunteer_id = (auth.jwt() ->> 'sub')
    AND EXISTS (
      SELECT 1 FROM pickups p
      WHERE p.id = location_pings.pickup_id
        AND p.volunteer_id = (auth.jwt() ->> 'sub')
        AND p.status = ANY (ARRAY['en_route'::pickup_status, 'picked_up'::pickup_status])
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "location_pings_select_donor_or_admin" ON "location_pings";--> statement-breakpoint
CREATE POLICY "location_pings_select_donor_or_admin" ON "location_pings"
  FOR SELECT TO authenticated
  USING (private.can_view_pickup_pings(pickup_id, (auth.jwt() ->> 'sub')));
--> statement-breakpoint

-- run_pings: admins and volunteers may watch any run; the run's assigned driver may watch
-- their own. Inserts happen server-side (service-role) so no INSERT policy is needed.
DROP POLICY IF EXISTS "run_pings_select_watcher" ON "run_pings";--> statement-breakpoint
CREATE POLICY "run_pings_select_watcher" ON "run_pings"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = (auth.jwt() ->> 'sub')
        AND pr.role = ANY (ARRAY['admin'::role, 'volunteer'::role])
    )
    OR EXISTS (
      SELECT 1 FROM runs r
      WHERE r.id = run_pings.run_id
        AND r.driver_id = (auth.jwt() ->> 'sub')
    )
  );
