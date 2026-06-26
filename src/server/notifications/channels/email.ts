import "server-only";
import { sendEmail } from "../email";
import type { NotificationChannel } from "../types";

/** Escape interpolated copy — hardcoded today, but i18n/DB copy later must not inject HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const emailChannel: NotificationChannel = {
  key: "email",
  async send(msg, to) {
    if (!to.email) return; // can't deliver without an address (sandbox limit, D-08)
    const html = `<h2>${escapeHtml(msg.title)}</h2><p>${escapeHtml(msg.body)}</p>`;
    await sendEmail(to.email, msg.title, html);
  },
};
