import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  validateCsrf,
  requiresCsrf,
  generateCsrfToken,
  setCsrfCookie,
} from "@/lib/csrf";

// --- Security headers (Task 17) ---

// React + Turbopack dev runtimes require eval() for HMR and callstack
// reconstruction. Production never needs it. Gate 'unsafe-eval' on dev only.
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://connect.facebook.net https://cdnjs.cloudflare.com https://*.clerk.accounts.dev`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://img.clerk.com https://*.fal.media https://*.vercel-storage.com",
  "media-src 'self' blob: https://*.fal.media https://*.vercel-storage.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://*.sentry.io https://*.upstash.io https://*.clerk.com https://*.clerk.accounts.dev https://*.facebook.com https://*.fal.media https://*.fal.run",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy-Report-Only": cspDirectives,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Apply security headers to an existing response. */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

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

export default async function middleware(request: NextRequest) {
  // Sentry route context for all requests
  Sentry.setTag("route", request.nextUrl.pathname);
  Sentry.setTag("method", request.method);

  // CSRF validation for state-changing API requests
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    requiresCsrf(request.method) &&
    !isCsrfExempt(request)
  ) {
    if (!validateCsrf(request)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid or missing CSRF token" },
          { status: 403 }
        )
      );
    }
  }

  // Skip Clerk entirely for API routes — they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Only use Clerk middleware if we have production keys
  // Dev/test keys cause "dev-browser-missing" errors on Vercel
  if (hasClerkKeys && isClerkProdKeys) {
    const clerkResponse = await clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })(request, {} as never);
    if (clerkResponse) {
      return applySecurityHeaders(clerkResponse as NextResponse);
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Ensure CSRF cookie exists on every response
  const response = NextResponse.next();
  if (!request.cookies.get("__csrf_token")) {
    setCsrfCookie(response, generateCsrfToken());
  }
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
