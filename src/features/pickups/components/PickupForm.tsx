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
import { FormField, FormSelect, FormTextarea, FormDateTime } from "@/components/forms";
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
    control,
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Section: What you're sharing (charter §3.5 — hairline sections, not cards) */}
      <section className="space-y-5">
        <h2 className="font-display text-[15px] font-semibold">
          {t("pickup.form.sectionWhat")}
        </h2>
      <FormSelect
        control={control}
        name="category"
        label={t("pickup.form.category")}
        placeholder={t("pickup.form.categoryPlaceholder")}
        options={FOOD_CATEGORIES.map((c) => ({ value: c, label: tCommon(`foodCategory.${c}`) }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="quantity"
          label={t("pickup.form.quantity")}
          type="number"
          min={1}
        />
        <FormSelect
          control={control}
          name="quantityUnit"
          label={t("pickup.form.unit")}
          options={QUANTITY_UNITS.map((u) => ({ value: u, label: tCommon(`quantityUnit.${u}`) }))}
        />
      </div>

      <FormTextarea
        control={control}
        name="description"
        label={
          <>
            {t("pickup.form.description")}{" "}
            <span className="font-normal text-muted-foreground">{t("pickup.form.descriptionOptional")}</span>
          </>
        }
        rows={2}
        placeholder={t("pickup.form.descriptionPlaceholder")}
      />
      </section>

      {/* Section: When to pick up */}
      <section className="mt-6 space-y-5 border-t border-border pt-5">
        <h2 className="font-display text-[15px] font-semibold">
          {t("pickup.form.sectionWhen")}
        </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormDateTime control={control} name="windowStart" label={t("pickup.form.windowStart")} />
        <FormDateTime control={control} name="windowEnd" label={t("pickup.form.windowEnd")} />
      </div>
      </section>

      {/* Section: Where */}
      <section className="mt-6 space-y-5 border-t border-border pt-5">
        <h2 className="font-display text-[15px] font-semibold">
          {t("pickup.form.sectionWhere")}
        </h2>
      <div>
        <Label htmlFor="address">{t("pickup.form.location")}</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">{t("pickup.form.locationLinkHint")}</p>
        <input type="hidden" {...register("googleMapsUrl")} />
        <div className="flex gap-2">
          <Input id="address" placeholder={t("pickup.form.addressPlaceholder")} {...register("address")} />
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
      </section>

      {serverError && (
        <p className="mt-5 text-sm text-destructive" role="alert">{serverError}</p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.back()}
          disabled={isPending || submitting}
        >
          {tCommon("buttons.cancel")}
        </Button>
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isPending || submitting}
        >
          {isPending || submitting
            ? tCommon("buttons.loading")
            : (submitLabel ??
              (mode === "create"
                ? t("pickup.form.submitCreate")
                : t("pickup.form.submitEdit")))}
        </Button>
      </div>
    </form>
  );
}
