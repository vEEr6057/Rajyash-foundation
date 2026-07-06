import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      // Agent worktrees are full checkouts (with their own .next builds) — never
      // our source to lint. Mirrors the same exclusion in vitest.config.ts.
      ".claude/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Serwist-generated service worker output (not hand-authored source).
      "public/sw.js",
      "public/swe-worker-*.js",
      // Non-app dirs: design-system reference, planning docs, memory, scratch.
      "tokens/**",
      "docs/**",
      ".planning/**",
      ".remember/**",
      "src/server/db/migrations/**",
    ],
  },
  // Modulith boundaries: features are modules; their public API is index.ts (client-safe)
  // and server.ts (actions). Cross-module deep imports are lint errors — this is the
  // enforcement half of the modular monolith (folders alone are just intent).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
        { type: "app", pattern: "src/app/**" },
        { type: "server", pattern: "src/server/**" },
        {
          type: "shared",
          pattern: [
            "src/components/**",
            "src/lib/**",
            "src/config/**",
            "src/i18n/**",
            "src/types/**",
            "src/test/**",
            "src/middleware.ts",
          ],
        },
      ],
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["app", "feature", "server", "shared"] },
            { from: "feature", allow: ["feature", "server", "shared"] },
            // server never imports features — the one offender (stats.ts -> admin
            // analytics shapes) was extracted to src/server/analytics on 2026-07-07
            // after client-carrying barrel re-exports zeroed the live dashboard.
            { from: "server", allow: ["server", "shared"] },
            { from: "shared", allow: ["shared", "server"] },
          ],
        },
      ],
      // Other modules may only enter a feature through its public API.
      "boundaries/entry-point": [
        "error",
        {
          default: "allow",
          rules: [
            { target: ["feature"], disallow: ["**"] },
            { target: ["feature"], allow: ["index.ts", "server.ts"] },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
