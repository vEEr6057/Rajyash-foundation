import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/config/constants";
import { LeafMark } from "@/components/LeafMark";

/**
 * Two-column auth shell: an editorial mission panel (left, desktop) beside the Clerk
 * card (right). On mobile the panel collapses to a slim brand header so the card
 * stays the focus. Solid CTA-green panel, gold leaf + accent word, provenance stat
 * (BATCH-1-SHELL-AUTH-SPEC §7.1). All override props are plain strings (e.g. /staff).
 */
export async function AuthSplitLayout({
  children,
  headline,
  subline,
  eyebrow,
  stat,
  statNote,
}: {
  children: React.ReactNode;
  headline?: string;
  subline?: string;
  eyebrow?: string;
  stat?: string;
  statNote?: string;
}) {
  // `auth.*` copy lives under the `common` namespace (common.auth.*) — the
  // top-level namespace set is locked by request.test.ts, so no new namespace.
  const t = await getTranslations("common.auth");
  const tc = await getTranslations("common");
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — solid CTA green */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: "var(--primary)" }}
      >
        <Link href={ROUTES.home} className="flex flex-col leading-tight">
          <span className="font-display text-xl font-medium">{tc("appName")}</span>
          <span className="text-sm text-white/70">{tc("appTagline")}</span>
        </Link>

        <div className="max-w-md">
          <LeafMark className="mb-5 size-9 text-[#F6C445]" />
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#F6C445]">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display font-medium text-[clamp(1.75rem,2.6vw,2.25rem)] leading-[1.15] text-balance">
            {headline ??
              t.rich("headline", {
                g: (c) => <span className="text-[#F6C445]">{c}</span>,
              })}
          </h2>
          <p className="mt-3 text-white/80">{subline ?? t("subline")}</p>
        </div>

        <div className="max-w-xs">
          <p className="font-display font-medium text-2xl tabular-nums">
            {stat ?? t("stat")}
          </p>
          <p className="text-sm text-white/70">{statNote ?? t("statNote")}</p>
        </div>
      </aside>

      {/* Card column */}
      <div className="flex flex-col items-center justify-center gap-6 bg-background px-4 py-10">
        <Link href={ROUTES.home} className="flex flex-col items-center leading-tight lg:hidden">
          <span className="font-display text-xl font-medium text-primary">{tc("appName")}</span>
          <span className="text-sm text-muted-foreground">{tc("appTagline")}</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
