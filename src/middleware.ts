import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy", // public policy page (in the (public) group, but the Clerk matcher still runs)
  "/terms", // public legal pages — Razorpay website-compliance checks these
  "/refund-policy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/staff(.*)", // staff (admin/coordinator) sign-in entry; /admin itself still role-gated below
  "/robots.txt", // SEO metadata routes — must not be auth-gated
  "/sitemap.xml",
  "/api/inngest(.*)", // S2S — Inngest authenticates via signing-key signature, not Clerk
  "/api/health", // B5 — uptime probe; must answer without auth
  "/api/csp-report", // B5 — browser POSTs CSP violations here; never auth-gate/redirect it
  "/api/client-error", // §3 — browser error reports; errors happen signed-out too
  "/api/razorpay/webhook", // PAY-02 — Razorpay authenticates via HMAC signature, not Clerk
  "/donate", // PAY-03 — public donate page (flag-gated to notFound() when payments are off)
  "/guide", // public user handbook (static book at public/guide.html; /guide rewrites to it)
]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Security headers (HOMEPAGE-STANDARDS §4). Enforced set + a report-only CSP so we can
// observe violations (Clerk/Supabase/OSM/geocoders) before switching CSP to enforcing.
// geolocation kept `self` — volunteer live-tracking uses it.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://checkout.razorpay.com https://api.razorpay.com",
  "connect-src 'self' https: wss: https://static.cloudflareinsights.com",
  "frame-src 'self' https://*.clerk.com https://challenges.cloudflare.com https://checkout.razorpay.com https://api.razorpay.com",
  "worker-src 'self' blob:",
  "report-uri /api/csp-report",
  // NOTE: `upgrade-insecure-requests` is intentionally omitted — Chrome ignores it in a
  // report-only policy and logs a console error on every page. Add it back only when the
  // CSP flips to enforcing (Content-Security-Policy).
].join("; ");

function secure(res: NextResponse): NextResponse {
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), usb=(), payment=(), geolocation=(self)",
  );
  res.headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);
  return res;
}

/**
 * Edge RBAC gate (AUTH-04). Defence-in-depth only — server actions and protected
 * server components MUST still call requireRole() (AUTH-05); middleware is not a
 * security boundary on its own (CVE-2025-29927).
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // Public routes pass through.
  if (isPublicRoute(req)) return secure(NextResponse.next());

  // Everything below requires authentication.
  if (!userId) return redirectToSignIn();

  const role = sessionClaims?.metadata?.role;
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete ?? false;

  // Onboarding gate: incomplete users are funnelled to /onboarding; completed
  // users visiting /onboarding are sent to their dashboard.
  if (isOnboardingRoute(req)) {
    if (onboardingComplete) {
      return secure(NextResponse.redirect(new URL("/portal/dashboard", req.url)));
    }
    return secure(NextResponse.next());
  }
  if (!onboardingComplete) {
    return secure(NextResponse.redirect(new URL("/onboarding", req.url)));
  }

  // Admin routes are admin-only → 403 for everyone else.
  if (isAdminRoute(req) && role !== "admin") {
    return secure(new NextResponse("Forbidden", { status: 403 }));
  }

  return secure(NextResponse.next());
});

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
