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
  Receipt,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import { fmtCurrency } from "@/lib/portal-helpers";
import {
  PortalPage,
  Card,
  StatCard,
  Badge,
  EmptyState,
  Button,
  CardSkeleton,
  SectionSkeleton,
  ErrorState,
} from "@/components/portal/ui";

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

type BadgeTone = "neutral" | "success" | "warn" | "danger" | "info";

function statusBadge(status: string) {
  const cfg: Record<string, { tone: BadgeTone; icon: React.ReactNode; label: string }> = {
    paid: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "Paid" },
    sent: { tone: "info", icon: <FileText className="h-3 w-3" />, label: "Sent" },
    draft: { tone: "neutral", icon: <Clock className="h-3 w-3" />, label: "Draft" },
    overdue: { tone: "danger", icon: <AlertCircle className="h-3 w-3" />, label: "Overdue" },
  };

  const c = cfg[status] || cfg.draft;

  return (
    <Badge tone={c.tone}>
      {c.icon}
      {c.label}
    </Badge>
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
      const res = await fetch(
        `/api/create-billing-portal?accessCode=${encodeURIComponent(session.accessCode)}&email=${encodeURIComponent(session.email)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
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
    <PortalPage
      title="Billing"
      subtitle={`Invoices and payment history for ${client.facilityName}`}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={openBillingPortal}
          loading={portalLoading}
          icon={<ExternalLink className="h-3.5 w-3.5" />}
        >
          Manage Payment Method
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Error */}
        {error && <ErrorState message={error} onRetry={fetchInvoices} />}

        {/* Summary stats */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Paid" value={fmtCurrency(totalPaid)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Outstanding" value={fmtCurrency(totalOutstanding)} icon={<Clock className="h-4 w-4" />} />
            <StatCard label="Total Ad Spend" value={fmtCurrency(totalAdSpend)} icon={<DollarSign className="h-4 w-4" />} />
          </div>
        )}

        {/* Invoice list */}
        {loading ? (
          <SectionSkeleton />
        ) : invoices.length > 0 ? (
          <section className="overflow-hidden rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">Invoices</h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:w-40">
                    <Receipt className="h-4 w-4 shrink-0 text-[var(--color-mid-gray)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-dark)]">{inv.month}</p>
                      <p className="text-[10px] text-[var(--color-mid-gray)]">
                        Due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-wrap items-center gap-4 text-xs text-[var(--color-body-text)]">
                    <div className="min-w-[80px]">
                      <p className="text-[var(--color-mid-gray)]">Ad Spend</p>
                      <p className="text-sm text-[var(--color-dark)]">{fmtCurrency(inv.adSpend)}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[var(--color-mid-gray)]">Mgmt Fee</p>
                      <p className="text-sm text-[var(--color-dark)]">{fmtCurrency(inv.managementFee)}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[var(--color-mid-gray)]">Total</p>
                      <p className="text-sm font-semibold text-[var(--color-dark)]">{fmtCurrency(inv.amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {statusBadge(inv.status)}
                    {inv.paidDate && (
                      <span className="text-[10px] text-[var(--color-mid-gray)]">
                        Paid {formatDate(inv.paidDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : !error ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title="No invoices yet"
            message="Your billing history will appear here once your first invoice is generated."
          />
        ) : null}

        {/* Billing details */}
        <Card as="section">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-dark)]">Billing Details</h3>
          <div className="space-y-2 text-xs text-[var(--color-body-text)]">
            <p>
              Invoices are generated monthly and include your ad spend plus management fees.
              Payment is due within 15 days of invoice date.
            </p>
            <p>
              For billing questions, contact{" "}
              <a href="mailto:blake@storageads.com" className="text-[var(--color-dark)] hover:underline">
                blake@storageads.com
              </a>
            </p>
          </div>
        </Card>
      </div>
    </PortalPage>
  );
}
