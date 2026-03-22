import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export default function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
