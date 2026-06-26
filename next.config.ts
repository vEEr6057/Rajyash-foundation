import "./src/config/env"; // boot-time env validation (D-06 / AUTH-06)
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  // SECURITY (T-7-00-01): never precache authed routes — stale auth HTML served offline = security bug
  exclude: [/\/api\//, /\/__clerk\//, /\/admin\//, /\/portal\//],
});

const nextConfig: NextConfig = {};

// Serwist OUTERMOST (RESEARCH Pitfall 1: plugin order matters for webpack transform)
export default withSerwist(withNextIntl(nextConfig));

// Enables the Cloudflare Workers bindings/env during `next dev`.
initOpenNextCloudflareForDev();
