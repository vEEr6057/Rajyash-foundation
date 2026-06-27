import "server-only";
import { cache } from "react";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

/**
 * Per-request Drizzle client.
 *
 * Cloudflare Workers cannot reuse a connection across requests, so the client is
 * wrapped in React `cache()` — one connection per request, never module-global.
 * Supabase pooler (port 6543, transaction mode) requires `prepare: false`.
 * DDL/migrations use DIRECT_URL (port 5432) via drizzle-kit, not this client.
 */
export const getDb = cache(() => {
  const sql = postgres(env.DATABASE_URL, { prepare: false });
  return drizzle(sql, { schema });
});

export { schema };
