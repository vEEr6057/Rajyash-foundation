"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormActions, FormSwitch } from "@/components/forms";
import { MapView } from "@/features/pickups/components/MapView";
import { resolvePickupLocation } from "@/features/pickups/actions/pickupActions";
import {
  destinationSchema,
  type DestinationInput,
} from "../validations/destination";
import {
  createDestination,
  updateDestination,
} from "../actions/destinationActions";

// Ahmedabad default pin.
const DEFAULT_PIN = { lat: 23.0225, lng: 72.5714 };

export function DestinationForm({
  mode,
  destinationId,
  defaults,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  destinationId?: string;
  defaults?: Partial<DestinationInput>;
  onDone?: () => void;
  // A FormSheet host passes its `close` so Cancel dismisses the sheet.
  onCancel?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DestinationInput>({
    resolver: zodResolver(destinationSchema) as unknown as Resolver<DestinationInput>,
    mode: "onTouched",
    defaultValues: {
      name: "",
      area: "",
      address: "",
      mapsLink: "",
      lat: defaults?.lat ?? DEFAULT_PIN.lat,
      lng: defaults?.lng ?? DEFAULT_PIN.lng,
      city: "",
      active: true,
      ...defaults,
    },
  });

  const lat = watch("lat");
  const lng = watch("lng");
  const address = watch("address");

  const onSubmit = handleSubmit((values) => {
    setErr(null);
    start(async () => {
      const res =
        mode === "create"
          ? await createDestination(values)
          : await updateDestination(destinationId!, values);
      if (!res.ok) {
        setErr(res.message);
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? tCommon("toast.saved") : tCommon("toast.updated"));
      if (mode === "create") reset();
      router.refresh();
      onDone?.();
    });
  });

  // Same resolver donors use on the pickup form: accepts an address OR a Google Maps
  // link, drops the pin, and stashes the original link. No coordinates typed by hand.
  async function handleFind() {
    if (!address?.trim()) return;
    setResolving(true);
    setErr(null);
    const res = await resolvePickupLocation(address.trim());
    setResolving(false);
    if (res.ok) {
      setValue("lat", res.lat, { shouldValidate: true });
      setValue("lng", res.lng, { shouldValidate: true });
      setValue("mapsLink", res.googleMapsUrl ?? "");
    } else {
      setErr(res.message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormField
        control={control}
        name="name"
        id="dest-name"
        label={t("destinations.form.name")}
        errorClassName="mt-1 text-xs text-destructive"
      />
      <FormField
        control={control}
        name="area"
        id="dest-area"
        label={t("destinations.form.area")}
        errorClassName="mt-1 text-xs text-destructive"
      />

      <div>
        <Label htmlFor="dest-address">{t("destinations.form.address")}</Label>
        <p className="mb-1 text-xs text-muted-foreground">
          {t("destinations.form.addressHint")}
        </p>
        <div className="flex gap-2">
          <Input
            id="dest-address"
            placeholder={t("destinations.form.addressPlaceholder")}
            {...register("address")}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={resolving || !address?.trim()}
            onClick={handleFind}
          >
            {resolving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MapPin className="size-4" />
            )}
            {t("destinations.form.findButton")}
          </Button>
        </div>
        {errors.address && (
          <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">
          {t("destinations.form.pinInstruction")}
        </p>
        <MapView
          draggable
          pin={{ lat, lng }}
          onPinMove={(newLat, newLng) => {
            setValue("lat", newLat, { shouldValidate: true });
            setValue("lng", newLng, { shouldValidate: true });
          }}
          height={280}
        />
      </div>

      <FormField
        control={control}
        name="city"
        id="dest-city"
        label={t("destinations.form.city")}
        errorClassName="mt-1 text-xs text-destructive"
      />

      {/* UX-15: edit-only — a new destination is always active by default (schema
          default `true`); the toggle only matters once it's in use by pickers/runs. */}
      {mode === "edit" && (
        <FormSwitch
          control={control}
          name="active"
          id="dest-active"
          label={t("destinations.form.active")}
          description={t("destinations.form.activeHint")}
        />
      )}

      {err && <p className="text-sm text-destructive">{err}</p>}
      <FormActions
        onCancel={onCancel}
        cancelLabel={tCommon("buttons.cancel")}
        submitLabel={
          mode === "create"
            ? t("destinations.form.addButton")
            : t("destinations.form.saveButton")
        }
        pending={pending}
      />
    </form>
  );
}
