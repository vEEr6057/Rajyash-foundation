import { getTranslations } from "next-intl/server";

/**
 * Keyboard a11y: first focusable element on the page. Visually hidden until
 * focused, then jumps focus past the chrome to the page's #main-content landmark.
 */
export async function SkipLink() {
  const t = await getTranslations("common");
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
