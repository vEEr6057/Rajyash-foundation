import { defineConfig } from "drizzle-kit";

// Migrations use DIRECT_URL (port 5432) — NOT the pooler (6543, transaction mode
// has no DDL/prepared-statement support). Run locally, never from the Worker.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DIRECT_URL ??
      "postgresql://placeholder:placeholder@placeholder.supabase.co:5432/postgres",
  },
});
