import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // Unit tests never have real runtime secrets; skip env boot-validation so
    // importing server code (env.ts) doesn't throw. Real validation still runs
    // at app boot / build. (Was previously passed ad-hoc as SKIP_ENV_VALIDATION=1.)
    env: { SKIP_ENV_VALIDATION: "1" },
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tokens": path.resolve(__dirname, "./tokens"),
      // `server-only` throws outside an RSC; stub it so server repos/libs unit-test.
      "server-only": path.resolve(__dirname, "./src/test/server-only.stub.ts"),
    },
  },
});
