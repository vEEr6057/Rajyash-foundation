import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { logger } from "@/lib/logger";

/**
 * Uptime probe (B5). GET → `SELECT 1` through the per-request db client.
 * Returns `{ ok: true, ts }` (200) when the DB round-trips, `{ ok: false }`
 * (503) otherwise. Deliberately leaks NOTHING — no versions, no env, no error
 * detail in the body (the failure is logged server-side only). Owner points a
 * free UptimeRobot monitor at this path.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    logger.error("health check failed", { err: String(e) });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
