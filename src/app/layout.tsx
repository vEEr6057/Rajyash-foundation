import type { Metadata } from "next";
import {
  Mukta,
  Noto_Sans_Devanagari,
  Roboto,
  Roboto_Slab,
  Baloo_Bhai_2,
  Baloo_2,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { hiIN } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Providers } from "./providers";
import { SkipLink } from "@/components/SkipLink";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { env } from "@/config/env";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Hindi (Devanagari) — Gujarati is loaded via a <link> fallback below
// (Noto Sans Gujarati subset coverage in next/font is inconsistent).
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600"],
  display: "swap",
});

// Public-site faces — mirror the official rajyashfoundation.com (Roboto + Roboto Slab).
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Indic display faces for the homepage (GU/HI headings) — Roboto Slab has no Indic glyphs.
const balooBhai2 = Baloo_Bhai_2({
  variable: "--font-baloo-bhai2",
  subsets: ["gujarati", "latin"],
  weight: ["500", "600"],
  display: "swap",
});

const baloo2 = Baloo_2({
  variable: "--font-baloo2",
  subsets: ["devanagari", "latin"],
  weight: ["500", "600"],
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["500", "600"], // 700/800 are banned by HOMEPAGE-SPEC §3
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://rajyash-food-rescue.shahveerkeaten.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rajyash Food Rescue — Surplus food to people in need, Ahmedabad",
    template: "%s — Rajyash Food Rescue",
  },
  description:
    "Every evening, Rajyash Foundation volunteers carry Ahmedabad's surplus food to people in need. Donate surplus or volunteer to drive a rescue.",
  applicationName: "Rajyash Food Rescue",
  openGraph: {
    type: "website",
    siteName: "Rajyash Food Rescue",
    locale: "en_IN",
    url: "/",
    title: "Rajyash Food Rescue — Surplus food to people in need, Ahmedabad",
    description:
      "Every evening, Rajyash Foundation volunteers carry Ahmedabad's surplus food to people in need.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Rajyash Foundation volunteers distributing rescued food in Ahmedabad",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rajyash Food Rescue",
    description:
      "Rescuing Ahmedabad's surplus food — carried warm to people in need, every evening.",
    images: ["/og.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  // Clerk widgets follow the app locale. @clerk/localizations ships Hindi (hiIN)
  // but NOT Gujarati (no guIN in v4.12) — gu falls back to English. Custom brand
  // overrides are merged OVER the package (spread package first) so our copy wins.
  const clerkBase = locale === "hi" ? hiIN : undefined;
  const clerkLocalization = {
    ...clerkBase,
    signIn: {
      ...clerkBase?.signIn,
      start: {
        ...clerkBase?.signIn?.start,
        title: "Welcome back",
        subtitle: "Sign in to continue to Food Rescue",
      },
    },
  };
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={clerkAppearance}
      localization={clerkLocalization}
    >
      <html lang={locale} suppressHydrationWarning>
        <head>
          {/* Polyfill esbuild's `__name` helper. opennext's esbuild (keepNames) injects
              `__name(...)` calls into next-themes' no-flash function, which next-themes then
              inlines via toString() — but `__name` isn't defined in that inline scope, so it
              throws ("__name is not defined") and breaks the pre-paint theme set. Defining it
              first (identity fn) makes the inlined script run cleanly. Must precede any inlined
              theme script, hence first in <head>. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "globalThis.__name||(globalThis.__name=function(f){return f})",
            }}
          />
          {/* Gujarati script fallback (next/font coverage is inconsistent) */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap"
          />
        </head>
        <body
          className={`${mukta.variable} ${notoDevanagari.variable} ${roboto.variable} ${robotoSlab.variable} ${balooBhai2.variable} ${baloo2.variable} antialiased`}
        >
          {/* PITFALL GUARD (RESEARCH §Pitfall 2): NextIntlClientProvider MUST be
              outside <Providers> (which is 'use client'). As a Server Component
              parent, it auto-inherits locale + messages from getRequestConfig.
              Provider order: ClerkProvider > NextIntlClientProvider > Providers > children */}
          <NextIntlClientProvider>
            {/* Global header removed — public landing has its own PublicHeader (plan 07-02).
                Portal/admin shells add their own LanguageSwitcher in plan 07-03. */}
            <SkipLink />
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
          {/* Cloudflare Web Analytics (B5) — cookieless, free. Rendered only when the
              beacon token is configured; absent in local/dev where it's unset. */}
          {env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
            <script
              defer
              src="https://static.cloudflareinsights.com/beacon.min.js"
              data-cf-beacon={JSON.stringify({
                token: env.NEXT_PUBLIC_CF_BEACON_TOKEN,
              })}
            />
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
