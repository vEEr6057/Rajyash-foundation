import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Clock, MapPin, Package } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { getSignedDownloadUrl } from "@/lib/storage";
import { ROUTES } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import {
  formatQuantity,
  formatWindow,
} from "@/features/pickups/lib/format";
import { PickupStatusPill } from "@/features/pickups/components/PickupStatusPill";
import { MapView } from "@/features/pickups/components/MapView";
import { PickupClaimSection } from "@/features/pickups/components/PickupClaimSection";
import { StatusAdvanceSection } from "@/features/pickups/components/StatusAdvanceSection";
import { DonorPickupActions } from "@/features/pickups/components/DonorPickupActions";
import { LiveTrackingMap } from "@/features/pickups/components/LiveTrackingMap";
import { VolunteerTracker } from "@/features/pickups/components/VolunteerTracker";
import { NavigateButton } from "@/features/pickups/components/NavigateButton";
import { CallButton } from "@/features/pickups/components/CallButton";
import { VerifyToggle } from "@/features/admin/components/VerifyToggle";
import { PickupStatusTimeline } from "@/features/pickups/components/PickupStatusTimeline";
import { DeliveryProofBack } from "@/features/pickups/components/DeliveryProofBack";
import { buildStatusTimeline } from "@/features/pickups/lib/timeline";

export const dynamic = "force-dynamic";

async function safeSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await getSignedDownloadUrl(path);
  } catch {
    return null; // storage not configured yet (deferred) — skip the image
  }
}

export default async function PickupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  const [tPortal, tCommon, locale] = await Promise.all([
    getTranslations("portal"),
    getTranslations("common"),
    getLocale(),
  ]);

  const pickup = await pickupsRepo.getById(id);
  if (!pickup) notFound();

  // dispatch-model-v2 (docs/specs/dispatch-model-v2.md): the collector role is
  // now the driver — `pickup.volunteerId` still holds that column (kept to
  // avoid a destructive rename in v1) but it means "assigned driver".
  const isDonorOwner = pickup.donorId === session.userId;
  const isDriver = session.role === "driver";
  const isVolunteer = session.role === "volunteer";
  const isAdmin = session.role === "admin";
  const isAssignedDriver = isDriver && pickup.volunteerId === session.userId;
  // TRK: live tracking runs only while the pickup is in motion.
  const isActive =
    pickup.status === "en_route" || pickup.status === "picked_up";
  // Visibility: owner, the assigned driver, an admin; a driver/volunteer
  // browsing the open board; or any volunteer while a pickup is trackable
  // (leg-aware tracking — the "any active volunteer can view" assumption in
  // the spec's Open assumptions §1).
  const canView =
    isDonorOwner ||
    isAdmin ||
    isAssignedDriver ||
    ((isDriver || isVolunteer) && pickup.status === "requested") ||
    (isVolunteer && isActive);
  if (!canView) notFound();
  // The donor's live view ends once the food is collected (spec: leg-aware
  // visibility) — admin/volunteer keep watching through both legs.
  const donorTrackable = isDonorOwner && pickup.status === "en_route";
  const showLiveTrackingMap = donorTrackable || ((isAdmin || isVolunteer) && isActive);

  const [foodUrl, proofUrl, events, donor] = await Promise.all([
    safeSignedUrl(pickup.foodPhotoPath),
    safeSignedUrl(pickup.proofPhotoPath),
    statusEventsRepo.listForPickup(id),
    // UX-3: only the assigned driver gets the donor's phone number.
    isAssignedDriver ? profilesRepo.getById(pickup.donorId) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={tPortal("pickup.detail.eyebrow")}
        title={
          <span className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            {tCommon(`foodCategory.${pickup.category}`)}
          </span>
        }
        action={<PickupStatusPill status={pickup.status} />}
      />

      {/* Info — hairline panel (charter: hairlines over boxes) */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-lg font-semibold">
          {formatQuantity(pickup.quantity, pickup.quantityUnit, tCommon)}
        </p>
        {pickup.description && (
          <p className="text-sm text-muted-foreground">{pickup.description}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm">
          <Clock className="size-4 text-muted-foreground" />
          {formatWindow(pickup.windowStart, pickup.windowEnd, locale)}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 text-muted-foreground" />
          {pickup.address}
        </p>
      </div>

      {/* Map — same hairline frame; tracking components untouched */}
      <div className="mt-4 rounded-lg border border-border p-4">
        {showLiveTrackingMap ? (
          <LiveTrackingMap
            pickupId={id}
            active={isActive}
            destination={{ lat: pickup.lat, lng: pickup.lng }}
          />
        ) : (
          <MapView
            markers={[{ id: pickup.id, lat: pickup.lat, lng: pickup.lng }]}
            height={240}
          />
        )}
      </div>

      {(foodUrl || proofUrl) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {foodUrl && (
            <figure>
              <figcaption className="mb-1 text-xs font-semibold text-muted-foreground">{tPortal("pickup.detail.foodPhoto")}</figcaption>
              <Image src={foodUrl} alt={tPortal("pickup.detail.foodPhoto")} width={400} height={300} className="rounded-lg" unoptimized />
            </figure>
          )}
          {proofUrl && (
            <figure>
              <figcaption className="mb-1 text-xs font-semibold text-muted-foreground">{tPortal("pickup.detail.deliveredPhoto")}</figcaption>
              <Image src={proofUrl} alt={tPortal("pickup.detail.deliveredPhoto")} width={400} height={300} className="rounded-lg" unoptimized />
            </figure>
          )}
        </div>
      )}

      {/* UX-8: donor-only "your food reached people in need" moment — gated on
          isDonorOwner (ownership already established above), reusing the same
          signed proofUrl the generic photo grid above resolves. */}
      {isDonorOwner && <DeliveryProofBack status={pickup.status} proofUrl={proofUrl} />}

      {/* Actions by viewer */}
      <div className="mt-6">
        {isAdmin && (
          <div className="mb-4">
            <VerifyToggle
              pickupId={id}
              verifiedAt={pickup.verifiedAt ?? null}
              verifiedBy={pickup.verifiedBy ?? null}
            />
          </div>
        )}
        {isDonorOwner && (
          <DonorPickupActions pickupId={id} status={pickup.status} pickup={pickup} />
        )}
        <PickupClaimSection role={session.role} status={pickup.status} pickupId={id} />
        {isAssignedDriver &&
          (pickup.status === "accepted" || isActive) && (
            <div className="mb-3 space-y-2">
              <NavigateButton lat={pickup.lat} lng={pickup.lng} />
              <CallButton phone={donor?.phone} />
            </div>
          )}
        {isAssignedDriver && (
          <StatusAdvanceSection
            pickupId={id}
            status={pickup.status}
            hasProof={!!pickup.proofPhotoPath}
          />
        )}
        {isAssignedDriver && (
          <VolunteerTracker pickupId={id} active={isActive} />
        )}
      </div>

      {/* UX-7: the donor gets a proper stage timeline (posted → claimed →
          en route → delivered/cancelled) built from the SAME ownership-checked
          read as the rest of this page (canView above already required
          isDonorOwner for this branch) — always shown (even with zero
          statusEvents, since "posted" comes from the pickup row itself, not an
          event). Every other viewer keeps the original flat event log. */}
      {isDonorOwner ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {tPortal("pickup.detail.history")}
          </h2>
          <PickupStatusTimeline stages={buildStatusTimeline(pickup, events)} />
        </div>
      ) : (
        events.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {tPortal("pickup.detail.history")}
            </h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {events.map((e) => (
                <li key={e.id}>
                  → {tCommon(`status.${e.toStatus}`)}{" "}
                  <span className="text-subtle-foreground tabular-nums">
                    {new Intl.DateTimeFormat(`${locale}-IN`, {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </main>
  );
}
