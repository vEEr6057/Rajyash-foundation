# Razorpay KYC — What the Foundation Needs to Do

*For the Rajyash Foundation co-founders · July 2026*
*This is the one item on the critical path that only the foundation can move. Everything
else about the launch proceeds without it — but online donations stay in test mode until
this clears.*

## Why this matters

Razorpay is the payment gateway that will accept donations on the new website (UPI,
cards, netbanking) and settle them **directly into the foundation's bank account**. Before
activating live payments, Razorpay must verify the foundation's identity — standard RBI
requirement for every payment gateway in India. Under the RBI's revised 2026 rules the
checks are stricter than before: names must match **exactly** across PAN, bank account,
and registration documents, and clean scans matter
([Razorpay KYC guide](https://razorpay.com/docs/payments/business-types-kyc-documents/?preferred-country=IN)).

Done properly, review takes about **3–5 working days**.

## Critical: whose account is it?

The Razorpay account **must be created with the foundation's own PAN and settle to the
foundation's own bank account**. A payment account cannot be transferred later — if the
current in-progress KYC is under anyone else's PAN (a person, or Rajyash Group), it must
be redone under the foundation's. Please confirm this first; it decides whether we
continue or restart the application.

## Document checklist (gather before starting)

| # | Document | Notes |
|---|----------|-------|
| 1 | **Foundation PAN card** | The entity's PAN, not a person's |
| 2 | **Registration proof** | Trust deed / society registration certificate / Section 8 incorporation — whichever form the foundation is registered under |
| 3 | **Cancelled cheque** or recent bank statement | In the foundation's exact registered name — this is the settlement account |
| 4 | **Address proof** for the registered office | Utility bill / bank statement / registration doc showing the address |
| 5 | **Authorised signatory's PAN + Aadhaar** | The person who operates the account (a co-founder/trustee) |
| 6 | **12A & 80G certificates** | Not required by Razorpay, but have them ready — they belong on the donation page for donor tax benefit, and donors will ask |
| 7 | *(If available)* **NGO Darpan ID / FCRA** | Optional; strengthens the application. Note: **foreign donations require FCRA** — without it, donations must be limited to Indian cards/UPI |

**The exact-name rule:** the name on the PAN, the bank account, and the registration
document must match character-for-character. This is the #1 cause of rejected
applications. Check before submitting.

## Website requirements (our side — already in hand)

Razorpay reviews the website that will take payments. It must display: contact details,
a privacy policy, terms & conditions, and a refund/cancellation policy. The new site has
contact + privacy live; **terms and refund-policy pages are being added this week** as
part of the pre-launch hardening work. The application should list
`https://rajyashfoundation.com` as the business website once the domain points at the
new site (or the current preview URL if submitted earlier).

## The process, start to finish

1. **Confirm account ownership** (above) — continue or restart under the foundation's PAN.
2. **Create / log into the Razorpay account** using the foundation's email (the same
   ownership email from the handover doc).
3. **Fill the activation form**: business type (Trust/Society/Section 8 — as registered),
   category (Not-for-Profit / Social Service), the foundation's details, bank account.
4. **Upload the documents** from the checklist — clean, complete scans; every corner
   visible; no cropped edges.
5. **Submit and respond fast** — if Razorpay asks a clarification, same-day answers keep
   the 3–5 day clock running instead of restarting it.
6. **On approval**: the developer plugs the live keys into the platform (15 minutes),
   runs a ₹10 end-to-end test donation, and donations go live with automatic 80G-numbered
   receipts.

## What the foundation gets when this clears

- Donations on the foundation's own website — UPI, all cards, netbanking.
- Money settles directly to the foundation's bank account (T+2/T+3 typically).
- Razorpay's fee: **2% per transaction** (standard; no setup or monthly fee). Worth
  asking Razorpay support for their **NGO/Section-8 discounted pricing** once activated —
  they have offered reduced rates for registered non-profits.
- Every donation recorded in the platform with a sequential 80G receipt number, visible
  in the admin dashboard and exportable for audit.

## Who does what

| Step | Owner |
|------|-------|
| Confirm PAN/bank ownership of the application | **Co-founder** |
| Gather checklist documents | **Foundation office** |
| Fill + submit the activation form | Together (30 min sitting) |
| Answer Razorpay's follow-ups | **Foundation** (with developer on call) |
| Live keys, test donation, go-live | **Developer** |
