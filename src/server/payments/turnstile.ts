import "server-only";
import { env } from "@/config/env";

/**
 * Cloudflare Turnstile server-side verification (security-review MED-1). The donate flow
 * is intentionally UNAUTHENTICATED (no account needed to give) — Turnstile, not a login,
 * is the abuse gate that stops a script from flooding order-minting + the donations table.
 *
 * Gate semantics:
 *  - `TURNSTILE_SECRET_KEY` UNSET  → verification is SKIPPED (returns true). Lets the owner
 *    enable payments before wiring Turnstile keys; the day the secret is set, the gate is
 *    live with no code change. Documented in .env.example.
 *  - secret set + token missing/invalid → returns false; the caller refuses to mint.
 *
 * Uses `fetch` (Workers-safe), never throws — a Cloudflare outage returns false so we fail
 * CLOSED on donations (better to reject a few real donors briefly than open the flood gate).
 */
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string | null,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured yet — gate is off by design
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed
  }
}
