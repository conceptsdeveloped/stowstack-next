"use client";

import { useState } from "react";
import {
  ChevronLeft,
  AlertTriangle,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  XCircle,
  Shield,
  Target,
  MessageSquare,
} from "lucide-react";
import type { Tenant, ChurnPrediction } from "./tenant-management-types";

/* ── helper components ── */

function RiskBadge({ prediction }: { prediction?: ChurnPrediction }) {
  if (!prediction) return <span className="text-xs text-[var(--color-mid-gray)]">--</span>;
  const colors: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${colors[prediction.risk_level] || colors.low}`}>
      {prediction.risk_score} -- {prediction.risk_level}
    </span>
  );
}

function TenantStatusBadge({ tenant }: { tenant: Tenant }) {
  if (tenant.status === "moved_out") return <span className="inline-flex items-center rounded-full bg-[var(--color-light-gray)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-mid-gray)]">Moved Out</span>;
  if ((tenant.days_delinquent || 0) > 0) return <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">{tenant.days_delinquent}d late</span>;
  return <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Current</span>;
}

function EscalationStageBadge({ stage }: { stage: string }) {
  const stageColors: Record<string, string> = {
    late_notice: "bg-yellow-500/20 text-yellow-400",
    second_notice: "bg-orange-500/20 text-orange-400",
    final_notice: "bg-red-500/20 text-red-400",
    lien_filed: "bg-red-500/20 text-red-300",
    auction_scheduled: "bg-red-900/20 text-red-300",
    auction_complete: "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${stageColors[stage] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}>
      {stage.replace(/_/g, " ")}
    </span>
  );
}

/* ── main detail component ── */

export function TenantDetail({ tenant, onBack, onRecordPayment, onEscalate, onMoveOut, actionLoading }: {
  tenant: Tenant;
  onBack: () => void;
  onRecordPayment: (id: string, amount: number, method: string) => void;
  onEscalate: (id: string) => void;
  onMoveOut: (id: string, reason: string) => void;
  actionLoading: string | null;
  refetch: () => void;
  facilityId: string;
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMoveOutForm, setShowMoveOutForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(String(tenant.balance || ""));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [moveOutReason, setMoveOutReason] = useState("");

  const [tenure] = useState(() => Math.round((Date.now() - new Date(tenant.move_in_date).getTime()) / (86400000 * 30)));
  const prediction = tenant.churn_predictions;
  const escalations = tenant.delinquency_escalations || [];
  const upsells = tenant.upsell_opportunities || [];
  const comms = tenant.tenant_communications || [];
  const payments = tenant.tenant_payments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 hover:bg-[var(--color-light-gray)]">
          <ChevronLeft className="h-4 w-4 text-[var(--color-body-text)]" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">{tenant.name}</h2>
          <p className="text-xs text-[var(--color-mid-gray)]">Unit {tenant.unit_number}{tenant.unit_size ? ` \u2022 ${tenant.unit_size}` : ""}{tenant.unit_type ? ` \u2022 ${tenant.unit_type}` : ""}</p>
        </div>
        <TenantStatusBadge tenant={tenant} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Monthly Rate</p>
          <p className="mt-1 text-lg font-semibold">${Number(tenant.monthly_rate).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Balance Due</p>
          <p className={`mt-1 text-lg font-semibold ${(Number(tenant.balance) || 0) > 0 ? "text-red-400" : "text-emerald-400"}`}>
            ${Number(tenant.balance || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Tenure</p>
          <p className="mt-1 text-lg font-semibold">{tenure} mo</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">AutoPay</p>
          <p className={`mt-1 text-lg font-semibold ${tenant.autopay_enabled ? "text-emerald-400" : "text-amber-400"}`}>
            {tenant.autopay_enabled ? "On" : "Off"}
          </p>
        </div>
      </div>

      {/* Contact & Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Contact Info</h3>
          <div className="space-y-2 text-sm">
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-2 text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
                <Mail className="h-3.5 w-3.5" /> {tenant.email}
              </a>
            )}
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
                <Phone className="h-3.5 w-3.5" /> {tenant.phone}
              </a>
            )}
            <div className="flex items-center gap-2 text-[var(--color-mid-gray)]">
              <Calendar className="h-3.5 w-3.5" /> Move-in: {new Date(tenant.move_in_date).toLocaleDateString()}
            </div>
            {tenant.lease_end_date && (
              <div className="flex items-center gap-2 text-[var(--color-mid-gray)]">
                <Calendar className="h-3.5 w-3.5" /> Lease ends: {new Date(tenant.lease_end_date).toLocaleDateString()}
              </div>
            )}
            {tenant.has_insurance && (
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="h-3.5 w-3.5" /> Insurance: ${Number(tenant.insurance_monthly || 0)}/mo
              </div>
            )}
          </div>
        </div>

        {/* Churn Risk */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Churn Risk</h3>
          {prediction ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <RiskBadge prediction={prediction} />
                <span className="text-xs text-[var(--color-mid-gray)]">
                  Score: {prediction.risk_score}/100
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    prediction.risk_score >= 75 ? "bg-red-500" :
                    prediction.risk_score >= 50 ? "bg-orange-500" :
                    prediction.risk_score >= 25 ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${prediction.risk_score}%` }}
                />
              </div>
              {prediction.predicted_vacate && (
                <p className="text-xs text-red-400">
                  Predicted vacate: {new Date(prediction.predicted_vacate).toLocaleDateString()}
                </p>
              )}
              {prediction.factors && Object.keys(prediction.factors).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-[var(--color-mid-gray)]">Risk Factors</p>
                  {Object.entries(prediction.factors).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-[var(--color-body-text)]">{k.replace(/_/g, " ")}</span>
                      <span className="text-[var(--color-mid-gray)]">+{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-[var(--color-mid-gray)]">Recommended Actions</p>
                  {prediction.recommended_actions.map((a, i) => (
                    <p key={i} className="text-xs capitalize text-[var(--color-gold)]">{a.replace(/_/g, " ")}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-mid-gray)]">No churn score -- run scoring to generate</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {tenant.status !== "moved_out" && (
          <>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              <DollarSign className="h-3.5 w-3.5" /> Record Payment
            </button>
            <button
              onClick={() => onEscalate(tenant.id)}
              disabled={actionLoading === tenant.id}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Escalate
            </button>
            <button
              onClick={() => setShowMoveOutForm(!showMoveOutForm)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/30"
            >
              <XCircle className="h-3.5 w-3.5" /> Move Out
            </button>
          </>
        )}
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <h4 className="mb-3 text-sm font-semibold text-emerald-400">Record Payment</h4>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Amount</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="ach">ACH</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  onRecordPayment(tenant.id, Number(paymentAmount), paymentMethod);
                  setShowPaymentForm(false);
                }}
                disabled={!paymentAmount || actionLoading === tenant.id}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Out Form */}
      {showMoveOutForm && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <h4 className="mb-3 text-sm font-semibold text-red-400">Move Out Tenant</h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Reason</label>
              <select
                value={moveOutReason}
                onChange={e => setMoveOutReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-red-500/50 focus:outline-none"
              >
                <option value="">Select reason...</option>
                <option value="voluntary">Voluntary</option>
                <option value="non_payment">Non-Payment</option>
                <option value="lease_end">Lease End</option>
                <option value="relocation">Relocation</option>
                <option value="downsizing">Downsizing</option>
                <option value="upsizing">Upsizing</option>
                <option value="auction">Auction/Lien</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  onMoveOut(tenant.id, moveOutReason);
                  setShowMoveOutForm(false);
                }}
                disabled={!moveOutReason || actionLoading === tenant.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Confirm Move-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation History */}
      {escalations.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Escalation History</h3>
          <div className="space-y-2">
            {escalations.map(esc => (
              <div key={esc.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <EscalationStageBadge stage={esc.stage} />
                  {esc.notes && <span className="text-xs text-[var(--color-mid-gray)]">{esc.notes}</span>}
                </div>
                <span className="text-[10px] text-[var(--color-mid-gray)]">
                  {new Date(esc.stage_entered_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell Opportunities */}
      {upsells.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-[var(--color-gold)]" /> Upsell Opportunities
          </h3>
          <div className="space-y-2">
            {upsells.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">{u.title}</p>
                  {u.description && <p className="text-xs text-[var(--color-mid-gray)]">{u.description}</p>}
                </div>
                <div className="text-right">
                  {u.monthly_uplift && (
                    <p className="text-sm font-medium text-emerald-400">+${Number(u.monthly_uplift)}/mo</p>
                  )}
                  <span className={`text-[10px] capitalize ${
                    u.status === "accepted" ? "text-emerald-400" :
                    u.status === "sent" ? "text-[var(--color-gold)]" :
                    u.status === "declined" ? "text-red-400" :
                    "text-[var(--color-mid-gray)]"
                  }`}>
                    {u.status || "identified"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Payment History</h3>
          <div className="space-y-1">
            {payments.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-[var(--color-mid-gray)]" />
                  <span className="font-medium text-emerald-400">${Number(p.amount).toLocaleString()}</span>
                  {p.method && <span className="text-[10px] capitalize text-[var(--color-mid-gray)]">{p.method}</span>}
                </div>
                <span className="text-xs text-[var(--color-mid-gray)]">{new Date(p.payment_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication Log */}
      {comms.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-[var(--color-gold)]" /> Communications
          </h3>
          <div className="space-y-2">
            {comms.slice(0, 10).map(c => (
              <div key={c.id} className="rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium uppercase ${
                      c.channel === "email" ? "text-[var(--color-gold)]" :
                      c.channel === "sms" ? "text-emerald-400" :
                      "text-[var(--color-body-text)]"
                    }`}>
                      {c.channel}
                    </span>
                    <span className="text-[10px] capitalize text-[var(--color-mid-gray)]">{c.direction}</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-mid-gray)]">
                    {new Date(c.sent_at || c.created_at || "").toLocaleDateString()}
                  </span>
                </div>
                {c.subject && <p className="mt-1 text-xs font-medium text-[var(--color-dark)]">{c.subject}</p>}
                {c.body && <p className="mt-0.5 text-xs text-[var(--color-body-text)] line-clamp-2">{c.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
