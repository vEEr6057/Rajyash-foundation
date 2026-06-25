"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { HeartHandshake, Truck } from "lucide-react";
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

const ROLE_CARDS: Record<
  (typeof SELECTABLE_ROLES)[number],
  { title: string; blurb: string; icon: typeof Truck }
> = {
  donor: {
    title: "Donate food",
    blurb: "I have surplus food to give — restaurant, event, or home.",
    icon: HeartHandshake,
  },
  volunteer: {
    title: "Volunteer / drive",
    blurb: "I'll pick up food and deliver it to people in need.",
    icon: Truck,
  },
};

export function OnboardingForm() {
  const router = useRouter();
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
    defaultValues: { city: DEFAULT_CITY },
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
        <Label>How would you like to help?</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SELECTABLE_ROLES.map((key) => {
            const card = ROLE_CARDS[key];
            const Icon = card.icon;
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
                  {card.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {card.blurb}
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
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="e.g. Rajeshbhai Patel"
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
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile"
          aria-invalid={!!errors.phone}
          className={cn(errors.phone && "rj-field--error border-destructive")}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="mt-1.5 text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" {...register("city")} />
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Setting up…" : "Continue"}
      </Button>
    </form>
  );
}
