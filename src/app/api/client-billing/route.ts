import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

/**
 * Invoices (M5). Single Postgres system of record (`client_invoices`) — replaces
 * the old ephemeral Redis `billing:<code>` blob. The portal wire contract is
 * unchanged: { invoices: [{ id, month, amount, adSpend, managementFee, status,
 * dueDate, paidDate, notes, createdAt }] }.
 *
 * GET  — client reads own invoices; admin reads any (?code) or all (?all=true).
 * POST — admin authors an invoice.
 * PATCH— admin updates status / paid date / notes (e.g. mark paid).
 */

interface InvoiceRow {
  id: string;
  amount: unknown;
  ad_spend: unknown;
  fee: unknown;
  status: string;
  period: string | null;
  description: string | null;
  due_at: Date | null;
  paid_at: Date | null;
  issued_at: Date;
  created_at: Date;
  stripe_invoice_id: string | null;
}

function dec(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toInvoice(row: InvoiceRow, code?: string) {
  return {
    id: row.id,
    month:
      row.period ||
      row.issued_at.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    amount: dec(row.amount),
    adSpend: dec(row.ad_spend),
    managementFee: dec(row.fee),
    status: row.status,
    dueDate: row.due_at ? row.due_at.toISOString() : "",
    paidDate: row.paid_at ? row.paid_at.toISOString() : null,
    notes: row.description ?? "",
    createdAt: row.created_at.toISOString(),
    stripeInvoiceId: row.stripe_invoice_id ?? null,
    ...(code ? { code } : {}),
  };
}

const INVOICE_SELECT = {
  id: true,
  amount: true,
  ad_spend: true,
  fee: true,
  status: true,
  period: true,
  description: true,
  due_at: true,
  paid_at: true,
  issued_at: true,
  created_at: true,
  stripe_invoice_id: true,
} as const;

const VALID_STATUSES = ["draft", "sent", "paid", "overdue", "void"];

/** Resolve an access code to a client id (admin paths address clients by code). */
async function clientIdForCode(code: string): Promise<string | null> {
  const client = await db.clients.findUnique({
    where: { access_code: code },
    select: { id: true },
  });
  return client?.id ?? null;
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

  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;

  try {
    // Admin: list every invoice, each tagged with its client's access code.
    if (scope.kind === "admin" && all === "true") {
      const rows = await db.client_invoices.findMany({
        orderBy: { issued_at: "desc" },
        take: 200,
        select: { ...INVOICE_SELECT, client_id: true },
      });
      const clientIds = [...new Set(rows.map((r) => r.client_id))];
      const clients = clientIds.length
        ? await db.clients.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, access_code: true },
          })
        : [];
      const codeById = new Map(clients.map((c) => [c.id, c.access_code]));
      const invoices = rows.map((r) =>
        toInvoice(r, codeById.get(r.client_id) ?? undefined),
      );
      return jsonResponse({ invoices }, 200, origin);
    }

    // Resolve the target client: own thread for a client, ?code for an admin.
    let clientId: string | null;
    if (scope.kind === "client") {
      clientId = scope.clientId;
    } else {
      if (!code) return errorResponse("Missing access code", 400, origin);
      clientId = await clientIdForCode(code);
    }
    if (!clientId) return errorResponse("Client not found", 404, origin);

    const rows = await db.client_invoices.findMany({
      where: { client_id: clientId },
      orderBy: { issued_at: "desc" },
      take: 100,
      select: INVOICE_SELECT,
    });
    return jsonResponse({ invoices: rows.map((r) => toInvoice(r)) }, 200, origin);
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

  try {
    const body = await req.json();
    const { code, month, amount, adSpend, managementFee, dueDate, notes, status, stripeInvoiceId } =
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
        origin,
      );
    }

    const clientId = await clientIdForCode(code);
    if (!clientId) return errorResponse("Client not found", 404, origin);

    const row = await db.client_invoices.create({
      data: {
        client_id: clientId,
        amount: Number(amount),
        ad_spend: Number(adSpend),
        fee: Number(managementFee),
        status: status && VALID_STATUSES.includes(status) ? status : "draft",
        period: month,
        description: notes || null,
        due_at: new Date(dueDate),
        ...(typeof stripeInvoiceId === "string" && stripeInvoiceId
          ? { stripe_invoice_id: stripeInvoiceId }
          : {}),
      },
      select: INVOICE_SELECT,
    });

    return jsonResponse({ success: true, invoice: toInvoice(row) }, 200, origin);
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

  try {
    const body = await req.json();
    const { invoiceId, status, paidDate, notes, stripeInvoiceId } = body || {};

    if (!invoiceId) {
      return errorResponse("Missing invoiceId", 400, origin);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
        origin,
      );
    }

    const existing = await db.client_invoices.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    if (!existing) return errorResponse("Invoice not found", 404, origin);

    // Marking paid stamps paid_at automatically unless an explicit date is given.
    const paid_at =
      paidDate !== undefined
        ? paidDate
          ? new Date(paidDate)
          : null
        : status === "paid"
          ? new Date()
          : undefined;

    const row = await db.client_invoices.update({
      where: { id: invoiceId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(paid_at !== undefined ? { paid_at } : {}),
        ...(notes !== undefined ? { description: notes } : {}),
        ...(stripeInvoiceId !== undefined
          ? { stripe_invoice_id: stripeInvoiceId || null }
          : {}),
      },
      select: INVOICE_SELECT,
    });

    return jsonResponse({ success: true, invoice: toInvoice(row) }, 200, origin);
  } catch {
    return errorResponse("Failed to update invoice", 500, origin);
  }
}
