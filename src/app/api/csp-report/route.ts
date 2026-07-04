import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * CSP violation collector (B5). The report-only CSP header points its `report-uri`
 * here; browsers POST violations in one of two shapes:
 *   - `application/csp-report`     → `{ "csp-report": { "blocked-uri", ... } }`
 *   - `application/reports+json`   → `[{ "type": "csp-violation", "body": { "blockedURL", ... } }]`
 * We parse both defensively, log a truncated `csp-violation` warning, and ALWAYS
 * answer 204 — a malformed body must never surface an error to the browser.
 *
 * Flood guard: a single misconfigured page can fire thousands of reports, so each
 * Worker isolate stops logging after 50. The count resets when the isolate recycles.
 */
export const dynamic = "force-dynamic";

const MAX_LOGS_PER_ISOLATE = 50;
let logged = 0;

const trunc = (v: unknown, n = 300): string | undefined =>
  typeof v === "string" ? v.slice(0, n) : undefined;

type Fields = {
  blockedUri?: string;
  violatedDirective?: string;
  documentUri?: string;
};

/** Normalize either report shape into our flat field set. */
function extract(entry: unknown): Fields | null {
  if (!entry || typeof entry !== "object") return null;
  const obj = entry as Record<string, unknown>;

  // `application/csp-report` — nested under "csp-report", hyphenated keys.
  const legacy = obj["csp-report"];
  if (legacy && typeof legacy === "object") {
    const r = legacy as Record<string, unknown>;
    return {
      blockedUri: trunc(r["blocked-uri"]),
      violatedDirective: trunc(r["violated-directive"]),
      documentUri: trunc(r["document-uri"]),
    };
  }

  // Reporting API (`application/reports+json`) — camelCase under "body".
  const body = obj["body"];
  if (body && typeof body === "object") {
    const r = body as Record<string, unknown>;
    return {
      blockedUri: trunc(r["blockedURL"] ?? r["blocked-uri"]),
      violatedDirective: trunc(r["effectiveDirective"] ?? r["violatedDirective"]),
      documentUri: trunc(r["documentURL"] ?? r["document-uri"]),
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json();
    // reports+json is an array; csp-report is a single object.
    const entries = Array.isArray(raw) ? raw : [raw];
    for (const entry of entries) {
      if (logged >= MAX_LOGS_PER_ISOLATE) break;
      const fields = extract(entry);
      if (!fields) continue;
      logged += 1;
      logger.warn("csp-violation", fields);
    }
  } catch {
    // Garbage / empty / non-JSON body — swallow. 204 regardless.
  }
  return new NextResponse(null, { status: 204 });
}
