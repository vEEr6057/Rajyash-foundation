import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Client-error sink (production-discipline §3). Volunteers' phone-browser errors are
 * invisible to Workers Logs (server-side only) — ClientErrorReporter posts them here so
 * they surface in the same searchable log stream. Deliberately tiny: no auth (errors
 * happen signed-out too; route is rate-limited by the reporter's per-session cap), no
 * DB, no echo of the payload back. Body size is capped to keep abuse boring.
 */
export const dynamic = "force-dynamic";

const MAX_BODY = 8_192; // an error report is small; anything bigger is noise/abuse

interface ClientErrorReport {
  message?: string;
  stack?: string;
  url?: string;
  source?: string;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return new NextResponse("Payload too large", { status: 413 });
  }
  let report: ClientErrorReport;
  try {
    report = JSON.parse(raw) as ClientErrorReport;
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  logger.error("client error", {
    message: String(report.message ?? "").slice(0, 500),
    stack: String(report.stack ?? "").slice(0, 2000),
    url: String(report.url ?? "").slice(0, 300),
    source: String(report.source ?? "").slice(0, 100),
    ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });
  return NextResponse.json({ ok: true });
}
