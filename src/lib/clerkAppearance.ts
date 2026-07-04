import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

// @clerk/types is a transitive dep pnpm does not hoist, so it isn't directly
// importable. Derive the Appearance type from ClerkProvider's own prop instead.
type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Single source of truth for Clerk's <SignIn>/<SignUp>/<UserButton> theming
 * (BATCH-1-SHELL-AUTH-SPEC §7.2). Applied once on <ClerkProvider>, so every
 * Clerk surface picks up the app's green + 12px-radius card without per-page wiring.
 *
 * `colorPrimary` tracks the unified CTA green (--primary = #2A5C3C, charter §2).
 * The element overrides are the carried-forward, load-bearing fixes (single-provider
 * social-button label, input borders) — recoloured to the new primary.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#2A5C3C",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorForeground: "#22271F",
    colorMutedForeground: "#6B7280",
    colorInput: "#FFFFFF",
    colorInputForeground: "#22271F",
    colorDanger: "#C0341D",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-mukta), system-ui, sans-serif",
  },
  elements: {
    rootBox: "mx-auto w-full",
    cardBox: "shadow-lg",
    card: "border border-black/[0.06] bg-white",
    headerTitle: "font-display text-xl font-medium text-gray-900",
    headerSubtitle: "text-sm text-gray-500",
    socialButtonsBlockButton:
      "border border-black/10 bg-white text-gray-800 hover:bg-black/[0.03] justify-center gap-3",
    // The provider label exists in the DOM but renders hidden for a single
    // provider — force it visible so it reads "Continue with Google".
    socialButtonsBlockButtonText: "!inline-block text-sm font-medium text-gray-800",
    dividerLine: "bg-black/10",
    dividerText: "text-gray-400",
    formFieldLabel: "text-gray-700 font-medium",
    formFieldInput:
      "border border-black/15 bg-white text-gray-900 focus:border-[#2A5C3C]",
    formButtonPrimary:
      "bg-[#2A5C3C] text-white hover:bg-[#234E33] shadow-sm text-sm normal-case font-semibold",
    footerActionLink: "text-[#2A5C3C] hover:text-[#234E33] font-semibold",
    identityPreviewEditButton: "text-[#2A5C3C]",
    // ≥44px tap target (a11y) for the header avatar without enlarging the avatar
    // itself (avatarBox stays size-8/9 per instance) — the trigger button carries
    // the hit area. Applied globally so every <UserButton> inherits it.
    userButtonTrigger: "min-h-11 min-w-11 justify-center",
  },
};
