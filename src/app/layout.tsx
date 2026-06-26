import type { Metadata } from "next";
import { Bricolage_Grotesque, Mukta, Noto_Sans_Devanagari } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#C04E12",
          colorBackground: "#FFFFFF",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-mukta), system-ui, sans-serif",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
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
