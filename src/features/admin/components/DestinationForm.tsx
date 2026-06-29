"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapView } from "@/features/pickups/components/MapView";
import {
  destinationSchema,
  type DestinationInput,
} from "../validations/destination";
import {
  createDestination,
  updateDestination,
  geocodeDestinationAddress,
} from "../actions/destinationActions";

// Ahmedabad default pin.
const DEFAULT_PIN = { lat: 23.0225, lng: 72.5714 };

export function DestinationForm({
  mode,
  destinationId,
  defaults,
  onDone,
}: {
  mode: "create" | "edit";
  destinationId?: string;
  defaults?: Partial<DestinationInput>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [geocodeAddr, setGeocodeAddr] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DestinationInput>({
    resolver: zodResolver(destinationSchema) as unknown as Resolver<DestinationInput>,
    defaultValues: {
      name: "",
      area: "",
      lat: defaults?.lat ?? DEFAULT_PIN.lat,
      lng: defaults?.lng ?? DEFAULT_PIN.lng,
      city: "",
      active: true,
      ...defaults,
    },
  });

  const lat = watch("lat");
  const lng = watch("lng");

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

  async function handleGeocode() {
    if (!geocodeAddr.trim()) return;
    setGeocoding(true);
    const result = await geocodeDestinationAddress(geocodeAddr);
    setGeocoding(false);
    if (result) {
      setValue("lat", result.lat, { shouldValidate: true });
      setValue("lng", result.lng, { shouldValidate: true });
    } else {
      setErr("Address not found. Try a more specific address.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="dest-name">{t("destinations.form.name")}</Label>
        <Input id="dest-name" {...register("name")} />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="dest-area">{t("destinations.form.area")}</Label>
        <Input id="dest-area" {...register("area")} />
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

      <div className="flex gap-2">
        <Input
          placeholder={t("destinations.form.geocodeAddress")}
          value={geocodeAddr}
          onChange={(e) => setGeocodeAddr(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={geocoding}
          onClick={handleGeocode}
        >
          {t("destinations.form.geocodeButton")}
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="dest-lat">{t("destinations.form.lat")}</Label>
          <Input
            id="dest-lat"
            type="number"
            step="any"
            {...register("lat", { valueAsNumber: true })}
          />
          {errors.lat && (
            <p className="mt-1 text-xs text-destructive">{errors.lat.message}</p>
          )}
        </div>
        <div className="flex-1">
          <Label htmlFor="dest-lng">{t("destinations.form.lng")}</Label>
          <Input
            id="dest-lng"
            type="number"
            step="any"
            {...register("lng", { valueAsNumber: true })}
          />
          {errors.lng && (
            <p className="mt-1 text-xs text-destructive">{errors.lng.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="dest-city">{t("destinations.form.city")}</Label>
        <Input id="dest-city" {...register("city")} />
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? tCommon("buttons.loading")
          : mode === "create"
            ? t("destinations.form.addButton")
            : t("destinations.form.saveButton")}
      </Button>
    </form>
  );
}
