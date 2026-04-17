"use client";

import { useState } from "react";
import {
  ChevronLeft,
  UserPlus,
  Target,
  Zap,
  X,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ── types ── */

interface RetentionCampaign {
  id: string;
  name: string;
  trigger_risk_level?: string;
  sequence_steps: Array<{ day: number; channel: string; template: string }>;
  active?: boolean;
  enrolled_count?: number;
  retained_count?: number;
  created_at?: string;
}

interface RetentionResponse {
  campaigns: RetentionCampaign[];
}

/* ── loading skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-light-gray)]" />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
        ))}
      </div>
    </div>
  );
}

/* ── form field ── */

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 focus:outline-none"
      />
    </div>
  );
}

/* ── create campaign modal ── */

function CreateCampaignModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [triggerLevel, setTriggerLevel] = useState("high");
  const [steps, setSteps] = useState([
    { day: 1, channel: "email", template: "retention_check_in" },
    { day: 3, channel: "sms", template: "special_offer" },
    { day: 7, channel: "email", template: "personal_outreach" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    setSteps([...steps, { day: lastDay + 3, channel: "email", template: "follow_up" }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: string, value: string | number) => {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (steps.length === 0) { setError("At least one step is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({
          action: "create_campaign",
          facility_id: facilityId,
          name,
          trigger_risk_level: triggerLevel,
          sequence_steps: steps,
        }),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Retention Campaign</h3>
          <button onClick={onClose} aria-label="Close" className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        <div className="space-y-4">
          <Field label="Campaign Name" value={name} onChange={setName} placeholder="e.g. High Risk Personal Outreach" />

          <div>
            <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Trigger Risk Level</label>
            <select value={triggerLevel} onChange={e => setTriggerLevel(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-[var(--color-gold)]/50 focus:outline-none">
              <option value="critical">Critical (75+)</option>
              <option value="high">High (50+)</option>
              <option value="medium">Medium (25+)</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] text-[var(--color-mid-gray)]">Sequence Steps</label>
              <button onClick={addStep} className="text-[10px] text-[var(--color-gold)] hover:underline">+ Add Step</button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--color-light-gray)] p-2">
                  <div className="w-16">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Day</label>
                    <input
                      type="number"
                      value={step.day}
                      onChange={e => updateStep(i, "day", Number(e.target.value))}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Channel</label>
                    <select
                      value={step.channel}
                      onChange={e => updateStep(i, "channel", e.target.value)}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Template</label>
                    <select
                      value={step.template}
                      onChange={e => updateStep(i, "template", e.target.value)}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    >
                      <option value="retention_check_in">Check-In</option>
                      <option value="special_offer">Special Offer</option>
                      <option value="personal_outreach">Personal Outreach</option>
                      <option value="payment_reminder">Payment Reminder</option>
                      <option value="autopay_incentive">AutoPay Incentive</option>
                      <option value="renewal_offer">Renewal Offer</option>
                      <option value="follow_up">Follow Up</option>
                    </select>
                  </div>
                  <button onClick={() => removeStep(i)} aria-label="Remove step" className="mt-3 text-[var(--color-mid-gray)] hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
            {submitting ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main component ── */

export function RetentionDashboard({ facilityId, onBack }: { facilityId: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useAdminFetch<RetentionResponse>(
    "/api/churn-predictions",
    { facilityId, resource: "campaigns" }
  );
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const campaigns = data?.campaigns || [];

  const toggleCampaign = async (id: string, active: boolean) => {
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "PATCH",
        body: JSON.stringify({ id, action: "toggle_campaign", active: !active }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this retention campaign?")) return;
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const enrollCampaign = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({ action: "enroll_campaign", campaign_id: id }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 hover:bg-[var(--color-light-gray)]">
          <ChevronLeft className="h-4 w-4 text-[var(--color-body-text)]" />
        </button>
        <h2 className="flex-1 text-lg font-semibold">Retention Campaigns</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-gold-hover)]"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-16 text-center">
          <Target className="mx-auto h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="mt-3 text-sm text-[var(--color-mid-gray)]">No retention campaigns yet</p>
          <p className="mt-1 text-xs text-[var(--color-mid-gray)]">Create a campaign to automatically engage at-risk tenants</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.active ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}>
                      {c.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-mid-gray)]">
                    Trigger: {c.trigger_risk_level || "high"} risk {"\u2022"} {c.sequence_steps?.length || 0} steps
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enrollCampaign(c.id)}
                    disabled={actionLoading === c.id || !c.active}
                    className="flex items-center gap-1 rounded-lg bg-[var(--color-gold)]/20 px-3 py-1.5 text-[10px] font-medium text-[var(--color-gold)] hover:bg-[var(--color-gold)]/30 disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3" /> Enroll Tenants
                  </button>
                  <button
                    onClick={() => toggleCampaign(c.id, c.active || false)}
                    disabled={actionLoading === c.id}
                    className="rounded-lg bg-[var(--color-light-gray)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] disabled:opacity-50"
                  >
                    {c.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteCampaign(c.id)}
                    disabled={actionLoading === c.id}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-semibold">{c.enrolled_count || 0}</p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Enrolled</p>
                </div>
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-semibold text-emerald-400">{c.retained_count || 0}</p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Retained</p>
                </div>
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-semibold">
                    {(c.enrolled_count || 0) > 0 ? Math.round(((c.retained_count || 0) / c.enrolled_count!) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Retention Rate</p>
                </div>
              </div>
              {c.sequence_steps && c.sequence_steps.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {c.sequence_steps.map((step, i) => (
                    <div key={i} className="shrink-0 rounded-lg bg-[var(--color-light-gray)] px-3 py-1.5">
                      <p className="text-[10px] font-medium text-[var(--color-body-text)]">Day {step.day}</p>
                      <p className="text-[10px] capitalize text-[var(--color-mid-gray)]">{step.channel}: {step.template}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          facilityId={facilityId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); }}
        />
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}
