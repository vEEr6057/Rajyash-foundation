"use server";

// SECURITY (T-7-01-02): allowlist guard — only en/gu/hi accepted.
// Any other value is silently rejected; cookies().set() is never called.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/request";
import { getSession } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { logger } from "@/lib/logger";

export async function setLocaleCookieAction(locale: Locale): Promise<void> {
  // Validate against allowlist (I18N-02; D-09).
  if (!SUPPORTED_LOCALES.includes(locale)) return;

  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year — D-09: persists across sessions
    httpOnly: false, // httpOnly: false — JS-readable in the browser for next-intl cookie mode; not a session secret
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // B3: mirror the preference onto the profile so notification copy uses the user's
  // language. Best-effort + non-blocking — anonymous visitors have no session, and a
  // DB blip must never fail the language switch (the cookie is the source of truth for UI).
  try {
    const session = await getSession();
    if (session) await profilesRepo.setLocale(session.userId, locale);
  } catch (e) {
    logger.error("setLocale: profile locale write failed", { err: String(e) });
  }

  // Forces root layout Server Component to re-run getRequestConfig with the
  // new NEXT_LOCALE cookie — RESEARCH §Pattern 2.
  revalidatePath("/", "layout");
}
