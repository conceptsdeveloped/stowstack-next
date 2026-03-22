import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

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

/**
 * Verify portal client auth via access code + email.
 * Returns the client's access_code if valid, null otherwise.
 */
async function verifyClientAuth(
  code: string | null,
  email: string | null
): Promise<string | null> {
  if (!code || !email) return null;
  const sanitizedEmail = email.trim().toLowerCase();

  // Try 4-digit login code
  if (/^\d{4}$/.test(code)) {
    const loginCode = await db.portal_login_codes.findFirst({
      where: {
        email: { equals: sanitizedEmail, mode: "insensitive" },
        code,
        expires_at: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (loginCode) {
      const client = await db.clients.findFirst({
        where: { email: { equals: sanitizedEmail, mode: "insensitive" } },
        select: { access_code: true },
      });
      return client?.access_code ?? null;
    }
  }

  // Legacy access code
  const client = await db.clients.findUnique({
    where: { access_code: code },
    select: { access_code: true, email: true },
  });
  if (client && client.email.toLowerCase() === sanitizedEmail) {
    return client.access_code;
  }

  return null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const email = url.searchParams.get("email");
  const all = url.searchParams.get("all");

  // Admin path: requires admin key
  const isAdmin = !requireAdminKey(req);

  // Client path: verify portal auth
  const clientCode = !isAdmin
    ? await verifyClientAuth(code, email)
    : null;

  if (!isAdmin && !clientCode) {
    return errorResponse("Unauthorized", 401, origin);
  }

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

  // Get invoices for specific client
  const lookupCode = isAdmin ? code : clientCode;
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
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
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
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
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
