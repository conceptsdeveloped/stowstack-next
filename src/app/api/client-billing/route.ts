import { NextRequest, NextResponse } from "next/server";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";

interface Invoice {
  id: string;
  month: string;
  amount: number;
  adSpend: number;
  managementFee: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  notes: string;
  createdAt: string;
  code?: string;
}

async function loadRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-billing");
  if (limited) return limited;
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("accessCode") ?? url.searchParams.get("code");
  const all = url.searchParams.get("all");

  // Canonical portal auth: a client is validated to their own access code; an
  // admin (X-Admin-Key) may read any client's invoices. Replaces the route's
  // private verifyClientAuth copy.
  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;
  const isAdmin = scope.kind === "admin";

  const redis = await loadRedis();
  if (!redis) {
    return jsonResponse({ invoices: [] }, 200, origin);
  }

  // Admin can list all invoices
  if (isAdmin && all === "true") {
    try {
      const keys = await redis.keys("billing:*");
      const results: Invoice[] = [];
      for (const key of keys) {
        const clientCodeKey = key.replace("billing:", "");
        const raw = await redis.get(key);
        const invoices: Invoice[] =
          typeof raw === "string" ? JSON.parse(raw) : (raw as Invoice[]) || [];
        for (const inv of invoices) {
          results.push({ ...inv, code: clientCodeKey });
        }
      }
      return jsonResponse({ invoices: results }, 200, origin);
    } catch {
      return errorResponse("Failed to get invoices", 500, origin);
    }
  }

  // Get invoices for a specific client. For a client this is their own access
  // code (already validated above); for an admin it is the requested ?code.
  const lookupCode = code;
  if (!lookupCode) {
    return errorResponse("Missing access code", 400, origin);
  }

  try {
    const raw = await redis.get(`billing:${lookupCode}`);
    const invoices: Invoice[] =
      typeof raw === "string" ? JSON.parse(raw) : (raw as Invoice[]) || [];
    return jsonResponse({ invoices }, 200, origin);
  } catch {
    return errorResponse("Failed to get invoices", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.BILLING, "client-billing");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const redis = await loadRedis();
  if (!redis) {
    return errorResponse("Redis not configured", 500, origin);
  }

  try {
    const body = await req.json();
    const { code, month, amount, adSpend, managementFee, dueDate, notes } =
      body || {};

    if (
      !code ||
      !month ||
      amount == null ||
      adSpend == null ||
      managementFee == null ||
      !dueDate
    ) {
      return errorResponse(
        "Missing required fields: code, month, amount, adSpend, managementFee, dueDate",
        400,
        origin
      );
    }

    const raw = await redis.get(`billing:${code}`);
    const invoices: Invoice[] =
      typeof raw === "string" ? JSON.parse(raw) : (raw as Invoice[]) || [];

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      month,
      amount: Number(amount),
      adSpend: Number(adSpend),
      managementFee: Number(managementFee),
      status: "draft",
      dueDate,
      paidDate: null,
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    invoices.unshift(invoice);
    if (invoices.length > 100) invoices.length = 100;

    await redis.set(`billing:${code}`, JSON.stringify(invoices));
    return jsonResponse({ success: true, invoice }, 200, origin);
  } catch {
    return errorResponse("Failed to create invoice", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const redis = await loadRedis();
  if (!redis) {
    return errorResponse("Redis not configured", 500, origin);
  }

  try {
    const body = await req.json();
    const { code, invoiceId, status, paidDate, notes } = body || {};

    if (!code || !invoiceId) {
      return errorResponse("Missing code or invoiceId", 400, origin);
    }

    const validStatuses = ["draft", "sent", "paid", "overdue"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400,
        origin
      );
    }

    const raw = await redis.get(`billing:${code}`);
    const invoices: Invoice[] =
      typeof raw === "string" ? JSON.parse(raw) : (raw as Invoice[]) || [];

    const idx = invoices.findIndex((inv) => inv.id === invoiceId);
    if (idx === -1) {
      return errorResponse("Invoice not found", 404, origin);
    }

    if (status !== undefined) invoices[idx].status = status;
    if (paidDate !== undefined) invoices[idx].paidDate = paidDate;
    if (notes !== undefined) invoices[idx].notes = notes;

    await redis.set(`billing:${code}`, JSON.stringify(invoices));
    return jsonResponse({ success: true, invoice: invoices[idx] }, 200, origin);
  } catch {
    return errorResponse("Failed to update invoice", 500, origin);
  }
}
