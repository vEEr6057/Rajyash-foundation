// src/app/manifest.ts
// Source: nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rajyash Food Porter",
    short_name: "Food Porter",
    description:
      "Rescue surplus food and get it to people in need across Ahmedabad.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F0", // --color-background (cream) from design tokens
    theme_color: "#2E7A47", // --color-primary (green) from design tokens
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
