"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HeartHandshake, HandHelping, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/forms";
import { cn } from "@/lib/utils";
import { ROUTES, DEFAULT_CITY, SELECTABLE_ROLES } from "@/config/constants";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/features/auth/validations/onboarding";
import { completeOnboarding } from "@/features/auth/actions/onboardingActions";

// Icons pick the role's real-world action — donor gives, volunteer distributes
// on-site (never picks up), driver drives the collection + delivery leg.
const ROLE_ICONS: Record<(typeof SELECTABLE_ROLES)[number], typeof Truck> = {
  donor: HeartHandshake,
  volunteer: HandHelping,
  driver: Truck,
};

// PUB-03: defaultRole pre-selects volunteer role when "Become a volunteer" CTA is clicked.
// Auth is still server-side; this only pre-fills the UI — onboardingSchema + completeOnboarding
// server action (AUTH-05 path) still validate the final role. (T-7-02-02, T-7-02-03)
export function OnboardingForm({
  defaultRole,
  isAdminInvite = false,
}: {
  defaultRole?: "donor" | "volunteer" | "driver";
  /** Admin-invited user: hide the role picker; completeOnboarding preserves their admin role. */
  isAdminInvite?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const { user } = useUser();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      city: DEFAULT_CITY,
      // Admin invitees don't pick a role — send a valid filler so the client schema passes;
      // completeOnboarding overrides it back to "admin" server-side (never demotes an admin).
      role: isAdminInvite ? "volunteer" : defaultRole,
    },
  });

  const role = watch("role");

  // Prefill name from the signed-in (Google) account so users don't retype it.
  // Only fills while the field is still empty — never clobbers a manual edit.
  useEffect(() => {
    if (user?.fullName && !watch("name")) {
      setValue("name", user.fullName);
    }
  }, [user?.fullName, setValue, watch]);

  async function onSubmit(values: OnboardingInput) {
    setServerError(null);
    const res = await completeOnboarding(values);
    if (!res.ok) {
      setServerError(res.message);
      return;
    }
    // Force a fresh JWT so the new role/onboarding claim is live before redirect.
    await user?.reload();
    router.push(isAdminInvite ? ROUTES.adminDashboard : ROUTES.portalDashboard);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {isAdminInvite ? (
        <div className="rounded-xl border border-primary bg-primary-soft p-4">
          <p className="font-semibold text-foreground">{t("adminSetupTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("adminSetupBlurb")}</p>
        </div>
      ) : (
        <div>
          <Label>{t("roleLabel")}</Label>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    "rj-press relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    selected
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                  aria-pressed={selected}
                >
                  {selected && (
                    <CheckCircle2 className="absolute top-3 right-3 size-4 text-primary" />
                  )}
                  <Icon
                    className={cn(
                      "size-6",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="font-display font-medium text-foreground">
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
      )}

      <FormField
        control={control}
        name="name"
        label={t("nameLabel")}
        autoComplete="name"
        placeholder={t("namePlaceholder")}
      />

      <FormField
        control={control}
        name="phone"
        label={
          <>
            {t("phoneLabel")}{" "}
            <span className="font-normal text-muted-foreground">{t("phoneOptional")}</span>
          </>
        }
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={t("phonePlaceholder")}
      />

      <FormField control={control} name="city" label={t("cityLabel")} autoComplete="address-level2" />

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
