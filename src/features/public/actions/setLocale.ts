"use server";

// SECURITY (T-7-01-02): allowlist guard — only en/gu/hi accepted.
// Any other value is silently rejected; cookies().set() is never called.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/request";

export async function setLocaleCookieAction(locale: Locale): Promise<void> {
  // Validate against allowlist (I18N-02; D-09).
  if (!SUPPORTED_LOCALES.includes(locale)) return;

  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year — D-09: persists across sessions
    httpOnly: false, // must NOT be httpOnly — readable by server; RESEARCH Anti-Patterns
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Forces root layout Server Component to re-run getRequestConfig with the
  // new NEXT_LOCALE cookie — RESEARCH §Pattern 2.
  revalidatePath("/", "layout");
}
