import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

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
];

export default eslintConfig;
