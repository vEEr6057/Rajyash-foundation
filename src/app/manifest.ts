// src/app/manifest.ts
// Source: nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rajyash Food Rescue",
    short_name: "Food Rescue",
    description:
      "Rescue surplus food and get it to people in need across Ahmedabad.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F0", // --color-background (cream) from design tokens
    theme_color: "#C04E12", // --color-primary (saffron) from design tokens
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable", // Android adaptive icons — safe zone = 40% radius circle
      },
    ],
  };
}
