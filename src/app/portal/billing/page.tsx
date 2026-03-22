"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  Receipt,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import {
  fmtCurrency,
  SectionSkeleton,
  ErrorState,
} from "@/lib/portal-helpers";

/* ─── types ─── */

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
}

/* ─── helpers ─── */

function statusBadge(status: string) {
  const cfg: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    paid: {
      bg: "bg-emerald-500/[0.08]",
      text: "text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Paid",
    },
    sent: {
      bg: "bg-[#3B82F6]/[0.08]",
      text: "text-[#3B82F6]",
      icon: <FileText className="h-3 w-3" />,
      label: "Sent",
    },
    draft: {
      bg: "bg-white/[0.04]",
      text: "text-[#6E6E73]",
      icon: <Clock className="h-3 w-3" />,
      label: "Draft",
    },
    overdue: {
      bg: "bg-red-500/[0.08]",
      text: "text-red-400",
      icon: <AlertCircle className="h-3 w-3" />,
      label: "Overdue",
    },
  };

  const c = cfg[status] || cfg.draft;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ─── page ─── */

export default function BillingPage() {
  const { session, client } = usePortal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/client-billing?code=${session.accessCode}&email=${encodeURIComponent(session.email)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setInvoices(json.invoices || []);
    } catch {
      setError("Unable to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [session.accessCode, session.email]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.email }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.open(url, "_blank");
          return;
        }
      }
    } catch {
      // Stripe portal might not be configured
    } finally {
      setPortalLoading(false);
    }
  }

  /* ─── summary stats ─── */

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalAdSpend = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.adSpend, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F7]">Billing</h2>
          <p className="text-sm text-[#6E6E73]">
            Invoices and payment history for {client.facilityName}
          </p>
        </div>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={portalLoading}
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#111111] px-4 py-2 text-xs font-medium text-[#A1A1A6] transition-colors hover:text-[#F5F5F7]"
        >
          {portalLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          Manage Payment Method
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchInvoices} />}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-[#111111]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-[#6E6E73]">Total Paid</span>
            </div>
            <p className="text-xl font-bold text-[#F5F5F7]">{fmtCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-[#6E6E73]">Outstanding</span>
            </div>
            <p className="text-xl font-bold text-[#F5F5F7]">{fmtCurrency(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-xs text-[#6E6E73]">Total Ad Spend</span>
            </div>
            <p className="text-xl font-bold text-[#F5F5F7]">{fmtCurrency(totalAdSpend)}</p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {loading ? (
        <SectionSkeleton />
      ) : invoices.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111111]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#F5F5F7]">Invoices</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3 sm:w-40">
                  <Receipt className="h-4 w-4 shrink-0 text-[#6E6E73]" />
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F7]">{inv.month}</p>
                    <p className="text-[10px] text-[#6E6E73]">
                      Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-4 text-xs text-[#A1A1A6]">
                  <div className="min-w-[80px]">
                    <p className="text-[#6E6E73]">Ad Spend</p>
                    <p className="text-sm text-[#F5F5F7]">{fmtCurrency(inv.adSpend)}</p>
                  </div>
                  <div className="min-w-[80px]">
                    <p className="text-[#6E6E73]">Mgmt Fee</p>
                    <p className="text-sm text-[#F5F5F7]">{fmtCurrency(inv.managementFee)}</p>
                  </div>
                  <div className="min-w-[80px]">
                    <p className="text-[#6E6E73]">Total</p>
                    <p className="text-sm font-semibold text-[#F5F5F7]">{fmtCurrency(inv.amount)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusBadge(inv.status)}
                  {inv.paidDate && (
                    <span className="text-[10px] text-[#6E6E73]">
                      Paid {formatDate(inv.paidDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !error ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-8 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-[#6E6E73]" />
          <p className="text-sm text-[#A1A1A6]">No invoices yet.</p>
          <p className="mt-1 text-xs text-[#6E6E73]">
            Your billing history will appear here once your first invoice is generated.
          </p>
        </div>
      ) : null}

      {/* Billing Info */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F5F7]">Billing Details</h3>
        <div className="space-y-2 text-xs text-[#A1A1A6]">
          <p>
            Invoices are generated monthly and include your ad spend plus management fees.
            Payment is due within 15 days of invoice date.
          </p>
          <p>
            For billing questions, contact{" "}
            <a href="mailto:blake@storepawpaw.com" className="text-[#3B82F6] hover:underline">
              blake@storepawpaw.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
