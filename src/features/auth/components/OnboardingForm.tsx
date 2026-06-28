"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HeartHandshake, Truck, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ROUTES, DEFAULT_CITY, SELECTABLE_ROLES } from "@/config/constants";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/features/auth/validations/onboarding";
import { completeOnboarding } from "@/features/auth/actions/onboardingActions";

const ROLE_ICONS: Record<(typeof SELECTABLE_ROLES)[number], typeof Truck> = {
  donor: HeartHandshake,
  volunteer: Truck,
  driver: Bike,
};

// PUB-03: defaultRole pre-selects volunteer role when "Become a volunteer" CTA is clicked.
// Auth is still server-side; this only pre-fills the UI — onboardingSchema + completeOnboarding
// server action (AUTH-05 path) still validate the final role. (T-7-02-02, T-7-02-03)
export function OnboardingForm({
  defaultRole,
}: {
  defaultRole?: "donor" | "volunteer";
}) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const { user } = useUser();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      city: DEFAULT_CITY,
      role: defaultRole, // pre-selects volunteer when coming from the landing page CTA
    },
  });

  const role = watch("role");

  async function onSubmit(values: OnboardingInput) {
    setServerError(null);
    const res = await completeOnboarding(values);
    if (!res.ok) {
      setServerError(res.message);
      return;
    }
    // Force a fresh JWT so the new role/onboarding claim is live before redirect.
    await user?.reload();
    router.push(ROUTES.portalDashboard);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <Label>{t("roleLabel")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SELECTABLE_ROLES.map((key) => {
            const Icon = ROLE_ICONS[key];
            const selected = role === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() =>
                  setValue("role", key, { shouldValidate: true })
                }
                className={cn(
                  "rj-press flex flex-col items-start gap-2 rounded-xl border p-4 text-left",
                  selected
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface hover:bg-secondary",
                )}
                aria-pressed={selected}
              >
                <Icon
                  className={cn(
                    "size-6",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="font-semibold text-foreground">
                  {t(`${key}.title`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`${key}.blurb`)}
                </span>
              </button>
            );
          })}
        </div>
        {errors.role && (
          <p className="mt-1.5 text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          aria-invalid={!!errors.name}
          className={cn(errors.name && "rj-field--error border-destructive")}
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">
          {t("phoneLabel")}{" "}
          <span className="font-normal text-muted-foreground">{t("phoneOptional")}</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          aria-invalid={!!errors.phone}
          className={cn(errors.phone && "rj-field--error border-destructive")}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="mt-1.5 text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="city">{t("cityLabel")}</Label>
        <Input id="city" {...register("city")} />
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
