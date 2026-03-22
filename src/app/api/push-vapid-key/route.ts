import { NextRequest } from "next/server";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return errorResponse(
      "Push notifications not configured",
      503,
      origin
    );
  }

  return jsonResponse({ publicKey }, 200, origin);
}
