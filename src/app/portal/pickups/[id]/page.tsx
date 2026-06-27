import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Clock, MapPin, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { getSignedDownloadUrl } from "@/lib/storage";
import { ROUTES } from "@/config/constants";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatQuantity,
  formatWindow,
} from "@/features/pickups/lib/format";
import { PickupStatusPill } from "@/features/pickups/components/PickupStatusPill";
import { MapView } from "@/features/pickups/components/MapView";
import { ClaimButton } from "@/features/pickups/components/ClaimButton";
import { StatusAdvanceSection } from "@/features/pickups/components/StatusAdvanceSection";
import { DonorPickupActions } from "@/features/pickups/components/DonorPickupActions";
import { LiveTrackingMap } from "@/features/pickups/components/LiveTrackingMap";
import { VolunteerTracker } from "@/features/pickups/components/VolunteerTracker";

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
  const [tPortal, tCommon] = await Promise.all([
    getTranslations("portal"),
    getTranslations("common"),
  ]);

  const pickup = await pickupsRepo.getById(id);
  if (!pickup) notFound();

  const isDonorOwner = pickup.donorId === session.userId;
  const isAssignedVolunteer = pickup.volunteerId === session.userId;
  const isVolunteer = session.role === "volunteer";
  const isAdmin = session.role === "admin";
  // Visibility: owner, the assigned volunteer, an admin, or any volunteer while open.
  if (
    !isDonorOwner &&
    !isAssignedVolunteer &&
    !isAdmin &&
    !(isVolunteer && pickup.status === "requested")
  ) {
    notFound();
  }
  // TRK: live tracking runs only while the pickup is in motion.
  const isActive =
    pickup.status === "en_route" || pickup.status === "picked_up";

  const [foodUrl, proofUrl, events] = await Promise.all([
    safeSignedUrl(pickup.foodPhotoPath),
    safeSignedUrl(pickup.proofPhotoPath),
    statusEventsRepo.listForPickup(id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Package className="size-5 text-primary" />
          {tCommon(`foodCategory.${pickup.category}`)}
        </h1>
        <PickupStatusPill status={pickup.status} />
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-lg font-semibold">
            {formatQuantity(pickup.quantity, pickup.quantityUnit)}
          </p>
          {pickup.description && (
            <p className="text-sm text-muted-foreground">{pickup.description}</p>
          )}
          <p className="flex items-center gap-1.5 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            {formatWindow(pickup.windowStart, pickup.windowEnd)}
          </p>
          <p className="flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            {pickup.address}
          </p>
          {(isDonorOwner || isAdmin) && isActive ? (
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
        </CardContent>
      </Card>

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

      {/* Actions by viewer */}
      <div className="mt-6">
        {isDonorOwner && <DonorPickupActions pickupId={id} status={pickup.status} />}
        {isVolunteer && pickup.status === "requested" && <ClaimButton pickupId={id} />}
        {isAssignedVolunteer && (
          <StatusAdvanceSection
            pickupId={id}
            status={pickup.status}
            hasProof={!!pickup.proofPhotoPath}
          />
        )}
        {isAssignedVolunteer && (
          <VolunteerTracker pickupId={id} active={isActive} />
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {tPortal("pickup.detail.history")}
          </h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {events.map((e) => (
              <li key={e.id}>
                → {tCommon(`status.${e.toStatus}`)}{" "}
                <span className="text-subtle-foreground">
                  {new Intl.DateTimeFormat("en-IN", {
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
      )}
    </main>
  );
}
