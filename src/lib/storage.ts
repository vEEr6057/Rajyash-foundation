import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Supabase Storage with the SERVICE-ROLE key (server-only — never bundled to the
 * client). Used to mint short-lived signed upload/download URLs for a private bucket.
 * @supabase/supabase-js is fetch-based, so it runs on the Cloudflare Workers runtime.
 */
let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

const BUCKET = env.SUPABASE_STORAGE_BUCKET;

/** A unique object path for a pickup photo, namespaced by pickup + kind. */
export function pickupPhotoPath(
  pickupId: string,
  kind: "food" | "proof",
  ext = "jpg",
): string {
  return `${pickupId}/${kind}-${crypto.randomUUID()}.${ext}`;
}

/** Signed URL the browser PUTs the (compressed) image to. ~2 min validity. */
export async function createSignedUpload(path: string) {
  const { data, error } = await client()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { path, signedUrl: data.signedUrl, token: data.token };
}

/** Short-lived signed URL to display a stored private object. */
export async function getSignedDownloadUrl(
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string> {
  const { data, error } = await client()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
