import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const PLAN_PRICES: Record<string, number> = {
  launch: 499,
  growth: 999,
  portfolio: 1499,
};

function generateInvoiceNumber(facilityName: string, date: Date): string {
  const prefix = (facilityName || "INV")
    .replace(/[^A-Z]/gi, "")
    .slice(0, 3)
    .toUpperCase();
  const month = date.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SS-${prefix}-${month}-${rand}`;
}

function esc(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LineItem {
  description: string;
  amount: number;
}

function renderInvoiceHTML(invoice: {
  invoiceNumber: string;
  facilityName: string;
  clientName: string;
  clientEmail: string;
  period: string;
  dueDate: string;
  lineItems: LineItem[];
  total: number;
}): string {
  const {
    invoiceNumber,
    facilityName,
    clientName,
    clientEmail,
    period,
    dueDate,
    lineItems,
    total,
  } = invoice;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:700px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="padding:24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;">
      <div>
        <h1 style="margin:0;font-size:20px;color:#0f172a;">Invoice</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">${esc(invoiceNumber)}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">StorageAds by StorageAds.com</p>
        <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">blake@storageads.com</p>
      </div>
    </div>
    <div style="padding:24px;border-bottom:1px solid #f1f5f9;">
      <div style="display:flex;justify-content:space-between;">
        <div>
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Bill To</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(clientName)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${esc(facilityName)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${esc(clientEmail)}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Period</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(period)}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Due Date</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(dueDate)}</p>
        </div>
      </div>
    </div>
    <div style="padding:0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px 24px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
            <th style="padding:12px 24px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems
            .map(
              (item) => `
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:12px 24px;font-size:13px;color:#0f172a;">${esc(item.description)}</td>
            <td style="padding:12px 24px;font-size:13px;color:#0f172a;text-align:right;font-weight:500;">$${Number(item.amount).toLocaleString()}</td>
          </tr>`
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #e2e8f0;background:#f8fafc;">
            <td style="padding:16px 24px;font-size:14px;font-weight:700;color:#0f172a;">Total</td>
            <td style="padding:16px 24px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">$${Number(total).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div style="padding:20px 24px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
      <p style="margin:0;">Payment is processed automatically via Stripe. If you have questions about this invoice, reply to this email or contact blake@storageads.com.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.BILLING, "client-invoices");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { clientId, adSpend, additionalItems } = body || {};

    if (!clientId) {
      return errorResponse("Missing clientId", 400, origin);
    }

    const client = await db.$queryRaw<
      Array<{
        id: string;
        name: string;
        email: string;
        facility_id: string;
        facility_name: string | null;
        fac_name: string;
        plan: string | null;
      }>
    >`
      SELECT c.*, f.name AS fac_name, o.plan
      FROM clients c
      JOIN facilities f ON c.facility_id = f.id
      LEFT JOIN organizations o ON f.organization_id = o.id
      WHERE c.id = ${clientId}
    `;

    if (!client.length) {
      return errorResponse("Client not found", 404, origin);
    }

    const row = client[0];
    const plan = row.plan || "launch";
    const planPrice = PLAN_PRICES[plan] || 499;

    const now = new Date();
    const period = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const dueDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const lineItems: LineItem[] = [
      {
        description: `StorageAds ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${row.fac_name || row.facility_name}`,
        amount: planPrice,
      },
    ];

    if (adSpend && adSpend > 0) {
      lineItems.push({
        description: "Ad Spend (Meta + Google) — pass-through",
        amount: adSpend,
      });
    }

    if (additionalItems && Array.isArray(additionalItems)) {
      for (const item of additionalItems) {
        if (item.description && item.amount) {
          lineItems.push({
            description: item.description,
            amount: Number(item.amount),
          });
        }
      }
    }

    const total = lineItems.reduce((s, i) => s + Number(i.amount), 0);
    const invoiceNumber = generateInvoiceNumber(
      row.fac_name || row.facility_name || "",
      now
    );

    const invoiceData = {
      invoiceNumber,
      facilityName: row.fac_name || row.facility_name || "",
      clientName: row.name,
      clientEmail: row.email,
      period,
      plan,
      planPrice,
      adSpend: adSpend || 0,
      lineItems,
      total,
      dueDate,
    };

    const html = renderInvoiceHTML(invoiceData);

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "StorageAds Billing <billing@storageads.com>",
          to: row.email,
          cc: process.env.ADMIN_EMAIL || "blake@storageads.com",
          subject: `Invoice ${invoiceNumber} — ${row.fac_name || row.facility_name} — ${period}`,
          html,
        }),
      });
    }

    // Log activity (fire-and-forget)
    db.activity_log
      .create({
        data: {
          type: "invoice_sent",
          facility_id: row.facility_id,
          facility_name: row.fac_name,
          detail: `Invoice ${invoiceNumber} for $${total.toLocaleString()} sent to ${row.email}`,
        },
      })
      .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    return jsonResponse(
      { success: true, invoiceNumber, total, sentTo: row.email },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-invoices");
  if (limited) return limited;
  const origin = getOrigin(req);
  const isAdmin = isAdminRequest(req);

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const accessCode = url.searchParams.get("accessCode");
    const email = url.searchParams.get("email");

    let facilityId: string | null = null;

    if (clientId && isAdmin) {
      const client = await db.clients.findUnique({
        where: { id: clientId },
        select: { facility_id: true },
      });
      if (client) {
        facilityId = client.facility_id;
      }
    } else if (accessCode && email) {
      const client = await db.clients.findFirst({
        where: {
          access_code: accessCode,
          email: { equals: email.trim(), mode: "insensitive" },
        },
        select: { facility_id: true },
      });
      if (client) {
        facilityId = client.facility_id;
      }
    }

    const invoices = await db.activity_log.findMany({
      where: {
        type: "invoice_sent",
        ...(facilityId ? { facility_id: facilityId } : {}),
      },
      orderBy: { created_at: "desc" },
      take: 24,
    });

    return jsonResponse({ success: true, data: invoices }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
