-- 0014_tracking_leg_aware — leg-aware live-tracking visibility (dispatch-model-v2).
--
-- WHY THIS EXISTS (docs/specs/dispatch-model-v2.md): the dispatch model is corrected —
-- DRIVERS collect food (claim/advance/track-write), VOLUNTEERS only help distribute. The
-- 0013 can_view_pickup_pings() helper granted the donor a standing view for the whole
-- lifecycle and had no volunteer-visibility path at all. This migration replaces it with a
-- LEG-AWARE version: the donor's live view ends the moment the pickup is collected
-- (status leaves 'en_route'), and any active volunteer (a trusted distribution helper in
-- this single-org app) may watch every leg for situational awareness.
--
-- `pickups.volunteer_id` / `location_pings.volunteer_id` are UNCHANGED column names — they
-- now semantically hold the assigned COLLECTOR (the driver). Renaming them is a destructive
-- v2 follow-up, not this migration; see the column comments below for the documented intent.
--
-- Idempotent, like 0013: CREATE OR REPLACE / DROP POLICY IF EXISTS / COMMENT ON (all safe
-- to re-run on the existing prod DB).

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
        -- Admin: always, while active (not soft-deactivated).
        EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = p_uid AND pr.role = 'admin' AND pr.deactivated_at IS NULL
        )
        -- Donor-owner: pickup leg only — the view ends once the food is collected.
        OR (p.donor_id = p_uid AND p.status = 'en_route'::pickup_status)
        -- Any active volunteer: trusted distribution helper, sees every leg (v1 scope;
        -- per-run scoping is a later refinement — see spec "Open assumptions").
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = p_uid AND pr.role = 'volunteer' AND pr.deactivated_at IS NULL
        )
      )
  );
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION private.can_view_pickup_pings(text, text) TO authenticated;
--> statement-breakpoint

-- Recreate the SELECT policy against the leg-aware function above (same name as 0013;
-- the WHERE/USING body is unchanged — only the function it delegates to changed).
DROP POLICY IF EXISTS "location_pings_select_donor_or_admin" ON "location_pings";--> statement-breakpoint
CREATE POLICY "location_pings_select_donor_or_admin" ON "location_pings"
  FOR SELECT TO authenticated
  USING (private.can_view_pickup_pings(pickup_id, (auth.jwt() ->> 'sub')));
--> statement-breakpoint

-- INSERT policy shape from 0013 is UNCHANGED (assigned actor writes their own pings while
-- en_route/picked_up) — documenting the column's new meaning, not altering the policy.
COMMENT ON POLICY "location_pings_insert_assigned_volunteer" ON "location_pings" IS
  'volunteer_id = assigned collector (driver). Column name kept from the v1 schema to avoid a destructive rename; dispatch-model-v2 (docs/specs/dispatch-model-v2.md) reassigns the actor to the driver role.';
--> statement-breakpoint

COMMENT ON COLUMN "location_pings"."volunteer_id" IS
  'Assigned collector (driver) id, not necessarily a volunteer-role profile. Kept from v1 schema; see dispatch-model-v2 spec.';
--> statement-breakpoint

COMMENT ON COLUMN "pickups"."volunteer_id" IS
  'Assigned collector (driver) id, not necessarily a volunteer-role profile. Kept from v1 schema; see dispatch-model-v2 spec.';
