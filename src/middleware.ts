import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateCsrf,
  requiresCsrf,
  generateCsrfToken,
  setCsrfCookie,
} from "@/lib/csrf";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/guide",
  "/demo",
  "/diagnostic",
  "/docs",
  "/blog(.*)",
  "/lp/(.*)",
  "/walkin/(.*)",
  "/audit/(.*)",
  "/audit-tool",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",
  "/portal(.*)",
  "/partner(.*)",
  "/admin(.*)",
]);

// Detect whether Clerk keys are production keys (pk_live_) vs dev/test keys (pk_test_)
const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? "";
const hasClerkKeys = !!clerkPubKey && !!clerkSecretKey;
const isClerkProdKeys = clerkPubKey.startsWith("pk_live_");

function isCsrfExempt(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/webhooks/")) return true;
  if (path.startsWith("/api/stripe-webhook")) return true;
  if (path.startsWith("/api/call-webhook")) return true;
  if (path.startsWith("/api/cron/")) return true;
  if (path.startsWith("/api/v1/")) return true;
  if (req.headers.get("x-admin-key")) return true;
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true;
  if (req.headers.get("x-org-token")) return true;
  return false;
}

export default function middleware(request: NextRequest) {
  // CSRF validation for state-changing API requests
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    requiresCsrf(request.method) &&
    !isCsrfExempt(request)
  ) {
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }
  }

  // Skip Clerk entirely for API routes — they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Only use Clerk middleware if we have production keys
  // Dev/test keys cause "dev-browser-missing" errors on Vercel
  if (hasClerkKeys && isClerkProdKeys) {
    return clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })(request, {} as never);
  }

  // Ensure CSRF cookie exists on every response
  const response = NextResponse.next();
  if (!request.cookies.get("__csrf_token")) {
    setCsrfCookie(response, generateCsrfToken());
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
