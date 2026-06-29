import type { Metadata } from "next";
import { Bricolage_Grotesque, Mukta, Noto_Sans_Devanagari } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Providers } from "./providers";
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
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rajyash Food Rescue",
  description:
    "Rescue surplus food and get it to people in need across Ahmedabad — Rajyash Foundation.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2E7A47",
          colorBackground: "#FFFFFF",
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
            "border border-black/10 bg-white text-gray-800 hover:bg-black/[0.03]",
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
          className={`${bricolage.variable} ${mukta.variable} ${notoDevanagari.variable} antialiased`}
        >
          {/* PITFALL GUARD (RESEARCH §Pitfall 2): NextIntlClientProvider MUST be
              outside <Providers> (which is 'use client'). As a Server Component
              parent, it auto-inherits locale + messages from getRequestConfig.
              Provider order: ClerkProvider > NextIntlClientProvider > Providers > children */}
          <NextIntlClientProvider>
            {/* Global header removed — public landing has its own PublicHeader (plan 07-02).
                Portal/admin shells add their own LanguageSwitcher in plan 07-03. */}
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
