// src/i18n/request.ts
// SECURITY (T-7-01-01): locale validated against allowlist before use in
// dynamic import path — prevents locale-cookie injection.
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["en", "gu", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isValidLocale(v: string | undefined): v is Locale {
  return SUPPORTED_LOCALES.includes(v as Locale);
}

// Extracted as a named export so tests can spy on it.
// Production: Next.js/webpack resolves the template literal at build time
// because the stem `./messages/` is constant (a partially-static dynamic import).
export async function loadMessages(locale: Locale) {
  return {
    common: (await import(`./messages/${locale}/common.json`)).default,
    landing: (await import(`./messages/${locale}/landing.json`)).default,
    portal: (await import(`./messages/${locale}/portal.json`)).default,
    admin: (await import(`./messages/${locale}/admin.json`)).default,
    onboarding: (await import(`./messages/${locale}/onboarding.json`)).default,
    privacy: (await import(`./messages/${locale}/privacy.json`)).default,
  };
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("NEXT_LOCALE")?.value;
  // Allowlist guard — invalid/missing cookie falls back to 'en' (no throw,
  // mirrors middleware optional-chaining pattern from src/middleware.ts).
  const locale: Locale = isValidLocale(raw) ? raw : "en";

  return {
    locale,
    // NESTED namespaces (CRITICAL — see plan <namespace_contract>).
    // Each namespace is a TOP-LEVEL key, NOT flat-spread.
    // useTranslations("common"|"landing"|"portal"|"admin") and
    // getTranslations("...") all resolve correctly from this shape.
    // Flat-spreading collides keys (portal.dashboard vs admin.dashboard)
    // and breaks every t() call at runtime.
    messages: await loadMessages(locale),
  };
});
