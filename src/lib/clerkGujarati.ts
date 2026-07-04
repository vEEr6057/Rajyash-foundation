import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

// Clerk's localization prop is a deep-partial LocalizationResource. @clerk/types
// isn't hoisted (see clerkAppearance.ts), so derive the type from ClerkProvider.
type Localization = NonNullable<ComponentProps<typeof ClerkProvider>["localization"]>;

/**
 * Minimal hand-authored Gujarati localization for Clerk. @clerk/localizations
 * ships Hindi (hiIN) but NOT Gujarati (no guIN as of v4.12), so the GU sign-in /
 * sign-up card would otherwise render fully in English. This covers the essentials
 * only; brand terms ("Food Porter", provider names) stay in Latin. Use it as the
 * base when locale === "gu" (exactly like hiIN is used for hi).
 */
export const guIN: Localization = {
  formButtonPrimary: "ચાલુ રાખો",
  dividerText: "અથવા",
  formFieldLabel__emailAddress: "ઈમેલ સરનામું",
  formFieldLabel__password: "પાસવર્ડ",
  socialButtonsBlockButton: "{{provider|titleize}} સાથે ચાલુ રાખો",
  signIn: {
    start: {
      title: "પાછા સ્વાગત છે",
      subtitle: "Food Porter ચાલુ રાખવા સાઇન ઇન કરો",
      actionText: "ખાતું નથી?",
      actionLink: "સાઇન અપ કરો",
    },
  },
  signUp: {
    start: {
      title: "ખાતું બનાવો",
      subtitle: "Food Porter શરૂ કરવા સાઇન અપ કરો",
      actionText: "પહેલેથી ખાતું છે?",
      actionLink: "સાઇન ઇન કરો",
    },
  },
};
