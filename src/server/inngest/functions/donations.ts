import { inngest } from "@/server/inngest/client";
import { donationsRepo } from "@/server/db/repositories/donations";
import { sendEmail } from "@/server/notifications/email";
import { logger } from "@/lib/logger";
import {
  NOTIFICATION_EVENTS,
  NGO_80G_NUMBER,
  NGO_LEGAL_NAME,
} from "@/config/constants";

/** ₹ amount from paise, formatted with Indian digit grouping. */
function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** 80G-style receipt email body. The 80G line is omitted while NGO_80G_NUMBER is empty. */
function receiptHtml(d: {
  donorName: string | null;
  amount: number;
  receiptNumber: string;
  date: string;
}): string {
  const eightyG = NGO_80G_NUMBER
    ? `<p style="margin:4px 0;color:#555">This donation is eligible for tax exemption under Section 80G. Registration no.: ${NGO_80G_NUMBER}.</p>`
    : "";
  return `
    <div style="font-family:system-ui,sans-serif;max-width:32rem;margin:0 auto">
      <h2 style="color:#2E7D46">Thank you for your donation</h2>
      <p>Dear ${d.donorName ? d.donorName : "friend"},</p>
      <p>We gratefully acknowledge your generous contribution to ${NGO_LEGAL_NAME}'s
         Food Porter programme.</p>
      <table style="margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Amount</td><td style="font-weight:600">${formatRupees(d.amount)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Receipt no.</td><td style="font-weight:600">${d.receiptNumber}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Date</td><td>${d.date}</td></tr>
      </table>
      ${eightyG}
      <p style="color:#555">— ${NGO_LEGAL_NAME}</p>
    </div>`;
}

/**
 * PAY-04: email an 80G-style receipt after a webhook-verified capture. Fired by the
 * `donation/captured` event (emitted from the webhook), so it only ever runs for a
 * genuinely-paid donation. Idempotent on event.data.eventId (the Razorpay event id),
 * so an at-least-once event delivery never double-sends the receipt. No donor email
 * on file → nothing to send (logged, not an error).
 */
export const sendDonationReceipt = inngest.createFunction(
  {
    id: "send-donation-receipt",
    retries: 3,
    idempotency: "event.data.eventId",
    triggers: [{ event: NOTIFICATION_EVENTS.donationCaptured }],
  },
  async ({ event, step }) => {
    const { donationId } = event.data as { donationId: string; eventId: string };

    await step.run("send-receipt-email", async () => {
      const donation = await donationsRepo.getById(donationId);
      if (!donation) {
        logger.warn("donation receipt: donation not found", { donationId });
        return "not-found";
      }
      if (!donation.donorEmail) {
        logger.info("donation receipt: no donor email, skipping", { donationId });
        return "no-email";
      }
      const date = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeZone: "Asia/Kolkata",
      }).format(donation.createdAt);
      await sendEmail(
        donation.donorEmail,
        `Your donation receipt — ${donation.receiptNumber ?? "Rajyash Food Porter"}`,
        receiptHtml({
          donorName: donation.donorName,
          amount: donation.amount,
          receiptNumber: donation.receiptNumber ?? "—",
          date,
        }),
      );
      return "sent";
    });
  },
);
