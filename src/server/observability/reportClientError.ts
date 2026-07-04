"use server";

import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Client-error sink (B5). Error boundaries render on the client, where a thrown
 * error otherwise vanishes — this action forwards it to Workers Logs so it
 * PERSISTS. Deliberately:
 *  - No auth: public pages error too, and this writes nothing but a log line.
 *  - No DB writes: log-only (Workers Logs is the store).
 *  - Hard input caps + coercion: an untrusted client can call it, so every field
 *    is truncated to a bounded length; invalid input is dropped as `{ ok: false }`
 *    rather than throwing.
 */
const MAX = { message: 500, digest: 100, url: 300 } as const;

const schema = z.object({
  message: z.string().max(MAX.message),
  digest: z.string().max(MAX.digest).optional(),
  url: z.string().max(MAX.url).optional(),
});

export type ClientErrorReport = z.input<typeof schema>;

const cap = (v: unknown, n: number): string | undefined =>
  typeof v === "string" ? v.slice(0, n) : undefined;

export async function reportClientError(
  input: ClientErrorReport,
): Promise<{ ok: boolean }> {
  // Coerce + truncate BEFORE validating so oversize-but-well-meant reports still
  // land (capped) instead of being rejected outright.
  const parsed = schema.safeParse({
    message: cap(input?.message, MAX.message),
    digest: cap(input?.digest, MAX.digest),
    url: cap(input?.url, MAX.url),
  });
  if (!parsed.success) return { ok: false };

  logger.error("client-error", {
    message: parsed.data.message,
    digest: parsed.data.digest,
    url: parsed.data.url,
  });
  return { ok: true };
}
