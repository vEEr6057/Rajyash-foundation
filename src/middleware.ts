import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/staff(.*)", // staff (admin/coordinator) sign-in entry; /admin itself still role-gated below
  "/api/inngest(.*)", // S2S — Inngest authenticates via signing-key signature, not Clerk
]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

/**
 * Edge RBAC gate (AUTH-04). Defence-in-depth only — server actions and protected
 * server components MUST still call requireRole() (AUTH-05); middleware is not a
 * security boundary on its own (CVE-2025-29927).
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // Public routes pass through.
  if (isPublicRoute(req)) return NextResponse.next();

  // Everything below requires authentication.
  if (!userId) return redirectToSignIn();

  const role = sessionClaims?.metadata?.role;
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete ?? false;

  // Onboarding gate: incomplete users are funnelled to /onboarding; completed
  // users visiting /onboarding are sent to their dashboard.
  if (isOnboardingRoute(req)) {
    if (onboardingComplete) {
      return NextResponse.redirect(new URL("/portal/dashboard", req.url));
    }
    return NextResponse.next();
  }
  if (!onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Admin routes are admin-only → 403 for everyone else.
  if (isAdminRoute(req) && role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
