import { NextRequest } from "next/server";
import { jsonResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

/**
 * GET /api/manage/health
 *
 * Diagnostic only. Reports whether the running serverless function can see the
 * env vars the /manage flows need — as BOOLEANS, never the values — plus which
 * Vercel environment and git commit is actually serving the request. Use this
 * to confirm an env var is reaching the deployment under test.
 *
 * Safe to expose: it returns no secret material. Remove before launch if you
 * prefer not to advertise the env surface.
 */

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  // Which secret the scratch route will actually compare the typed code
  // against — mirrors the gate logic in /api/manage/scratch.
  const scratchGateSource = process.env.MANAGE_INVITE_CODE
    ? "MANAGE_INVITE_CODE"
    : process.env.ADMIN_SECRET
      ? "ADMIN_SECRET (fallback)"
      : "none";

  return jsonResponse(
    {
      ok: true,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      // The field that tells you WHICH value to type into the invite box:
      scratchGateSource,
      hasInviteCode: Boolean(process.env.MANAGE_INVITE_CODE),
      hasSessionSecret: Boolean(process.env.MANAGE_SESSION_SECRET),
      hasAdminSecretFallback: Boolean(process.env.ADMIN_SECRET),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
    },
    200,
    getOrigin(req)
  );
}
