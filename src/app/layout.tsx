import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Mukta,
  Noto_Sans_Devanagari,
  Roboto,
  Roboto_Slab,
  Baloo_Bhai_2,
  Baloo_2,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Providers } from "./providers";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

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
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#2E7A47",
          colorPrimaryForeground: "#FFFFFF",
          colorBackground: "#FFFFFF",
          colorForeground: "#1F2937",
          colorMutedForeground: "#6B7280",
          colorInput: "#FFFFFF",
          colorInputForeground: "#1F2937",
          colorDanger: "#C0341D",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-mukta), system-ui, sans-serif",
        },
        elements: {
          rootBox: "mx-auto w-full",
          cardBox: "shadow-xl",
          card: "border border-black/[0.06] bg-white",
          headerTitle: "font-display text-xl font-bold text-gray-900",
          headerSubtitle: "text-sm text-gray-500",
          socialButtonsBlockButton:
            "border border-black/10 bg-white text-gray-800 hover:bg-black/[0.03] justify-center gap-3",
          // the provider label exists in the DOM but renders hidden for a single
          // provider — force it visible so it reads "Continue with Google".
          socialButtonsBlockButtonText: "!inline-block text-sm font-medium text-gray-800",
          dividerLine: "bg-black/10",
          dividerText: "text-gray-400",
          formFieldLabel: "text-gray-700 font-medium",
          formFieldInput:
            "border border-black/15 bg-white text-gray-900 focus:border-[#2E7A47]",
          formButtonPrimary:
            "bg-[#2E7A47] text-white hover:bg-[#256b3c] shadow-sm normal-case font-semibold",
          footerActionLink: "text-[#2E7A47] hover:text-[#256b3c] font-semibold",
          identityPreviewEditButton: "text-[#2E7A47]",
        },
      }}
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
          className={`${bricolage.variable} ${mukta.variable} ${notoDevanagari.variable} ${roboto.variable} ${robotoSlab.variable} ${balooBhai2.variable} ${baloo2.variable} antialiased`}
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
        </body>
      </html>
    </ClerkProvider>
  );
}
