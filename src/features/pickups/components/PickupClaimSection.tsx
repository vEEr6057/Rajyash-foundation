import type { Role, PickupStatus } from "@/config/constants";
import { ClaimButton } from "./ClaimButton";
import { VolunteerClaimNote } from "./VolunteerClaimNote";

/**
 * dispatch-model-v2 (docs/specs/dispatch-model-v2.md): the collector role gate
 * is the driver, not the volunteer. Single decision point for "claim button vs
 * read-only note vs nothing" so the board's detail page and any future surface
 * stay in sync — the server (claimPickup) is the actual gate; this only has to
 * match it, never enforce it.
 */
export function PickupClaimSection({
  role,
  status,
  pickupId,
}: {
  role: Role | undefined;
  status: PickupStatus;
  pickupId: string;
}) {
  if (status !== "requested") return null;
  if (role === "driver") return <ClaimButton pickupId={pickupId} />;
  if (role === "volunteer") return <VolunteerClaimNote />;
  return null;
}
