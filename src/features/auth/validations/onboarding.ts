import { z } from "zod";
import { SELECTABLE_ROLES, DEFAULT_CITY } from "@/config/constants";

/** Onboarding input (D-05). Admin is NOT selectable — manual elevation only. */
export const onboardingSchema = z.object({
  role: z.enum(SELECTABLE_ROLES, {
    error: "Please choose how you'll help",
  }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your name" })
    .max(80, { message: "Name is too long" }),
  city: z.string().trim().min(1, { message: "Please enter your city" }),
});

export const DEFAULT_ONBOARDING_CITY = DEFAULT_CITY;

export type OnboardingInput = z.infer<typeof onboardingSchema>;
