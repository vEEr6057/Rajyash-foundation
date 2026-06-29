import Link from "next/link";
import { HandHeart, Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/config/constants";

/**
 * Two-column auth shell: a branded mission panel (left, desktop) beside the Clerk
 * card (right). On mobile the panel collapses to a slim brand header so the card
 * stays the focus. Gives the auth pages a real product identity (audit fix).
 */
export async function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            "linear-gradient(150deg, var(--primary), color-mix(in srgb, var(--leaf) 70%, #0b3a1f))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[26rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--leaf-bright)" }}
        />
        <Link href={ROUTES.home} className="relative z-10 flex flex-col leading-tight">
          <span className="font-display text-xl font-extrabold">{tc("appName")}</span>
          <span className="text-sm text-white/70">{tc("appTagline")}</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <HandHeart className="mb-5 size-12 text-white/90" strokeWidth={1.4} aria-hidden />
          <h2 className="font-display text-3xl font-extrabold leading-tight text-balance">
            {t("heroTitle")}
          </h2>
          <p className="mt-3 text-white/80">{t("heroSub")}</p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-sm text-white/80">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15">
            <Sprout className="size-5" aria-hidden />
          </span>
          {t("heroLive")}
        </div>
      </aside>

      {/* Card column */}
      <div className="flex flex-col items-center justify-center gap-6 bg-background px-4 py-10">
        <Link href={ROUTES.home} className="flex flex-col items-center leading-tight lg:hidden">
          <span className="font-display text-xl font-extrabold text-primary">{tc("appName")}</span>
          <span className="text-sm text-muted-foreground">{tc("appTagline")}</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
