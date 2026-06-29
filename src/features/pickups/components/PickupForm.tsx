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
import {
  FOOD_CATEGORIES,
  QUANTITY_UNITS,
  ROUTES,
  type FoodCategory,
  type QuantityUnit,
} from "@/config/constants";
import {
  pickupFormSchema,
  type PickupFormInput,
} from "@/features/pickups/validations/pickup";
import {
  createPickup,
  updatePickup,
  resolvePickupLocation,
} from "@/features/pickups/actions/pickupActions";
import { PhotoUploader } from "./PhotoUploader";
import { MapView } from "./MapView";

// Explicit string-based form shape (the Zod schema coerces these at submit).
interface FormValues {
  category: FoodCategory;
  description?: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  windowStart: string;
  windowEnd: string;
  address: string;
  lat: number;
  lng: number;
  googleMapsUrl?: string;
  safetyAttested: boolean;
  foodPhotoPath?: string;
}

export function PickupForm({
  mode,
  pickupId,
  defaults,
  onSubmit: onSubmitOverride,
  submitLabel,
  submitting,
}: {
  mode: "create" | "edit";
  pickupId?: string;
  defaults?: Partial<FormValues>;
  // When provided, the form calls this instead of createPickup/updatePickup
  // (used by AdminSurplusForm to route through logSurplus). INT-02.
  onSubmit?: (data: PickupFormInput) => void | Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("portal");
  const tCommon = useTranslations("common");
  const [serverError, setServerError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    // schema coerces form strings → number/date at submit; type the resolver to
    // the string-based form shape so watch/register stay typed.
    resolver: zodResolver(pickupFormSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: { quantityUnit: "servings", ...defaults },
  });

  const lat = watch("lat");
  const lng = watch("lng");
  const address = watch("address");
  const foodPhotoPath = watch("foodPhotoPath");

  async function findOnMap() {
    if (!address) return;
    setGeocoding(true);
    const r = await resolvePickupLocation(address);
    setGeocoding(false);
    if (r.ok) {
      setValue("lat", r.lat, { shouldValidate: true });
      setValue("lng", r.lng, { shouldValidate: true });
      setValue("googleMapsUrl", r.googleMapsUrl ?? "");
    } else {
      setServerError(r.message);
    }
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    // INT-02: caller-supplied submit handler (e.g. logSurplus) takes over.
    if (onSubmitOverride) {
      void onSubmitOverride(values as unknown as PickupFormInput);
      return;
    }
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPickup(values as unknown as PickupFormInput)
          : await updatePickup(pickupId!, values as unknown as PickupFormInput);
      if (!res.ok) {
        setServerError(res.message);
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? tCommon("toast.sent") : tCommon("toast.saved"));
      const id =
        mode === "create"
          ? (res as unknown as { id: string }).id
          : pickupId!;
      router.push(ROUTES.pickup(id));
    });
  }

  const hasPin = typeof lat === "number" && typeof lng === "number" && !!lat && !!lng;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="category">{t("pickup.form.category")}</Label>
        <select
          id="category"
          className="rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]"
          {...register("category")}
        >
          <option value="">{t("pickup.form.categoryPlaceholder")}</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tCommon(`foodCategory.${c}`)}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1.5 text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="quantity">{t("pickup.form.quantity")}</Label>
          <Input id="quantity" type="number" min={1} {...register("quantity")} />
          {errors.quantity && (
            <p className="mt-1.5 text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="quantityUnit">{t("pickup.form.unit")}</Label>
          <select
            id="quantityUnit"
            className="rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]"
            {...register("quantityUnit")}
          >
            {QUANTITY_UNITS.map((u) => (
              <option key={u} value={u}>
                {tCommon(`quantityUnit.${u}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">
          {t("pickup.form.description")}{" "}
          <span className="font-normal text-muted-foreground">{t("pickup.form.descriptionOptional")}</span>
        </Label>
        <textarea
          id="description"
          rows={2}
          className="rj-field w-full rounded-lg border border-input bg-surface px-3 py-2 text-[15px]"
          placeholder={t("pickup.form.descriptionPlaceholder")}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="windowStart">{t("pickup.form.windowStart")}</Label>
          <Input id="windowStart" type="datetime-local" {...register("windowStart")} />
          {errors.windowStart && (
            <p className="mt-1.5 text-sm text-destructive">{errors.windowStart.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="windowEnd">{t("pickup.form.windowEnd")}</Label>
          <Input id="windowEnd" type="datetime-local" {...register("windowEnd")} />
          {errors.windowEnd && (
            <p className="mt-1.5 text-sm text-destructive">{errors.windowEnd.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">{t("pickup.form.location")}</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">{t("pickup.form.locationLinkHint")}</p>
        <input type="hidden" {...register("googleMapsUrl")} />
        <div className="flex gap-2">
          <Input id="address" placeholder="Area, landmark, or Google Maps link" {...register("address")} />
          <Button
            type="button"
            variant="outline"
            onClick={findOnMap}
            disabled={geocoding}
            aria-label={t("pickup.form.findButtonAriaLabel")}
          >
            {geocoding ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
            {t("pickup.form.findButton")}
          </Button>
        </div>
        {errors.address && (
          <p className="mt-1.5 text-sm text-destructive">{errors.address.message}</p>
        )}
        {errors.lat && (
          <p className="mt-1.5 text-sm text-destructive">{t("pickup.form.setLocationHint")}</p>
        )}
      </div>

      {hasPin && (
        <div>
          <p className="mb-1.5 text-sm text-muted-foreground">{t("pickup.form.dragPinHint")}</p>
          <MapView
            draggable
            pin={{ lat: lat as number, lng: lng as number }}
            onPinMove={(la, ln) => {
              setValue("lat", la, { shouldValidate: true });
              setValue("lng", ln, { shouldValidate: true });
            }}
          />
        </div>
      )}

      <div>
        <Label>
          {t("pickup.form.foodPhoto")}{" "}
          <span className="font-normal text-muted-foreground">{t("pickup.form.foodPhotoOptional")}</span>
        </Label>
        <PhotoUploader
          kind="food"
          label={t("pickup.form.addPhoto")}
          onUploaded={(p) => setValue("foodPhotoPath", p)}
        />
        {foodPhotoPath && <p className="mt-1 text-xs text-leaf">{t("pickup.form.photoAttached")}</p>}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" {...register("safetyAttested")} />
        <span>{t("pickup.form.attestation")}</span>
      </label>
      {errors.safetyAttested && (
        <p className="-mt-3 text-sm text-destructive">{errors.safetyAttested.message}</p>
      )}

      {serverError && (
        <p className="text-sm text-destructive" role="alert">{serverError}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending || submitting}>
        {isPending || submitting
          ? tCommon("buttons.loading")
          : (submitLabel ??
            (mode === "create"
              ? t("pickup.form.submitCreate")
              : t("pickup.form.submitEdit")))}
      </Button>
    </form>
  );
}
