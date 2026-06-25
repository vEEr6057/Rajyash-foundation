import "./src/config/env"; // boot-time env validation (D-06 / AUTH-06)
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Enables the Cloudflare Workers bindings/env during `next dev`.
initOpenNextCloudflareForDev();
