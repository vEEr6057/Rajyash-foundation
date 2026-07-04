import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://rajyash-food-rescue.shahveerkeaten.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  // The homepage is the only public, indexable surface today. Add public pages
  // (e.g. /privacy) here as they ship. Never list a robots-disallowed path.
  return [
    {
      url: `${BASE}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
