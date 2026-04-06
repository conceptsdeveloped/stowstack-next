import { NextRequest } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import {
  createAdminKey,
  revokeAdminKey,
  listAdminKeys,
} from "@/lib/admin-keys";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;
  const origin = getOrigin(req);

  const keys = await listAdminKeys();
  return jsonResponse(keys, 200, origin);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;
  const origin = getOrigin(req);

  const body = await req.json();
  const { email, label } = body;
  if (!email) {
    return errorResponse("email is required", 400, origin);
  }

  const plainKey = await createAdminKey(email, label);
  return jsonResponse(
    { key: plainKey, message: "Save this key now. It cannot be retrieved again." },
    201,
    origin
  );
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;
  const origin = getOrigin(req);

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return errorResponse("id query parameter is required", 400, origin);
  }

  await revokeAdminKey(keyId);
  return jsonResponse({ success: true }, 200, origin);
}
