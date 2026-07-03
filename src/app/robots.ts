import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://rajyash-food-rescue.shahveerkeaten.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated / non-public surfaces — keep out of the index.
      disallow: [
        "/admin",
        "/api",
        "/portal",
        "/onboarding",
        "/staff",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
