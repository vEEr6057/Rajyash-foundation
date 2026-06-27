import "server-only";
import { env } from "@/config/env";

/** Send a transactional email via Resend REST. Throws on non-2xx so Inngest retries. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM, // default = Resend free test sender; override via RESEND_FROM to go live
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}
