"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  DollarSign,
  Loader2,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface Referral {
  id: string;
  facility_name: string;
  status: string;
  commission: number;
  created_at: string;
}

interface PayoutEntry {
  id: string;
  amount: number;
  period: string;
  status: string;
  paid_at: string | null;
}

const PER_FACILITY_MRR = 99;

const REV_SHARE_TIERS = [
  { name: "Bronze", min: 1, max: 10, pct: 20, icon: Star, color: "#cd7f32", bgGradient: "from-amber-600 to-yellow-700" },
  { name: "Silver", min: 11, max: 25, pct: 25, icon: Award, color: "#94a3b8", bgGradient: "from-slate-400 to-slate-500" },
  { name: "Gold", min: 26, max: 50, pct: 30, icon: Crown, color: "#eab308", bgGradient: "from-yellow-500 to-amber-500" },
  { name: "Platinum", min: 51, max: Infinity, pct: 35, icon: Sparkles, color: "#8b5cf6", bgGradient: "from-violet-500 to-purple-600" },
] as const;

function getRevShareTier(facilityCount: number) {
  return REV_SHARE_TIERS.find((t) => facilityCount >= t.min && facilityCount <= t.max) || REV_SHARE_TIERS[0];
}

function getNextTier(facilityCount: number) {
  const currentIdx = REV_SHARE_TIERS.findIndex((t) => facilityCount >= t.min && facilityCount <= t.max);
  return currentIdx < REV_SHARE_TIERS.length - 1 ? REV_SHARE_TIERS[currentIdx + 1] : null;
}

export default function RevenuePage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [facilityCount, setFacilityCount] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const [facRes, refRes, payRes] = await Promise.allSettled([
        authFetch("/api/org-facilities"),
        authFetch("/api/referrals"),
        authFetch("/api/referrals?type=payouts"),
      ]);

      if (facRes.status === "fulfilled" && facRes.value.ok) {
        const data = await facRes.value.json();
        setFacilityCount((data.facilities || []).length);
      }

      if (refRes.status === "fulfilled" && refRes.value.ok) {
        const data = await refRes.value.json();
        setReferrals(data.referrals || []);
      }

      if (payRes.status === "fulfilled" && payRes.value.ok) {
        const data = await payRes.value.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  const currentTier = getRevShareTier(facilityCount);
  const nextTier = getNextTier(facilityCount);
  const TierIcon = currentTier.icon;

  const grossMrr = facilityCount * PER_FACILITY_MRR;
  const monthlyEarnings = grossMrr * (currentTier.pct / 100);
  const annualEarnings = monthlyEarnings * 12;
  const facilitiesToNext = nextTier ? nextTier.min - facilityCount : 0;
  const nextTierMonthly = nextTier
    ? nextTier.min * PER_FACILITY_MRR * (nextTier.pct / 100)
    : monthlyEarnings;

  return (
    <div className="space-y-6">
      {/* Hero Earnings Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <TierIcon className="h-5 w-5" />
                <span className="text-sm font-semibold opacity-90">
                  {currentTier.name} Partner
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                ${monthlyEarnings.toLocaleString()}
                <span className="text-lg font-medium opacity-75">/mo</span>
              </h2>
              <p className="mt-1 text-sm opacity-80">
                Current monthly revenue share earnings
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-3xl font-black">{currentTier.pct}%</div>
              <div className="text-xs opacity-75">rev share rate</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Active Facilities", value: facilityCount.toString() },
              { label: "Gross MRR", value: `$${grossMrr.toLocaleString()}` },
              { label: "Annual Earnings", value: `$${annualEarnings.toLocaleString()}` },
              { label: "Revenue Share", value: `${currentTier.pct}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/15 p-3 backdrop-blur-sm"
              >
                <div className="text-xl font-bold">{item.value}</div>
                <div className="text-[11px] opacity-75">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next Tier CTA */}
      {nextTier && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-400">
                Unlock {nextTier.name} — {nextTier.pct}% Revenue Share
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Add{" "}
                <span className="font-bold text-[#111827]">
                  {facilitiesToNext} more{" "}
                  {facilitiesToNext === 1 ? "facility" : "facilities"}
                </span>{" "}
                to reach {nextTier.name} tier and earn{" "}
                <span className="font-bold text-emerald-400">
                  ${nextTierMonthly.toLocaleString()}/mo
                </span>
              </p>
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span>
                    {facilityCount} / {nextTier.min} facilities
                  </span>
                  <span>
                    {Math.round((facilityCount / nextTier.min) * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.04]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, (facilityCount / nextTier.min) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Cards */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[#111827]">
            Revenue Share Tiers
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {REV_SHARE_TIERS.map((tier) => {
            const isActive = currentTier.name === tier.name;
            const TIcon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  isActive
                    ? "border-[#3B82F6] bg-[#3B82F6]/5"
                    : "border-black/[0.08] hover:border-black/[0.1]"
                }`}
              >
                <TIcon
                  className="mx-auto mb-2 h-6 w-6"
                  style={{ color: tier.color }}
                />
                <div
                  className="text-sm font-bold"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </div>
                <div
                  className={`mt-1 text-3xl font-black ${isActive ? "text-[#3B82F6]" : "text-[#111827]"}`}
                >
                  {tier.pct}%
                </div>
                <div className="mt-1 text-xs text-[#9CA3AF]">
                  {tier.max === Infinity
                    ? `${tier.min}+ facilities`
                    : `${tier.min}\u2013${tier.max} facilities`}
                </div>
                {isActive && (
                  <div className="mt-2 inline-block rounded-full bg-[#3B82F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#3B82F6]">
                    YOUR TIER
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral List */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#111827]">
          Referrals
        </h3>
        {referrals.length === 0 ? (
          <div className="py-8 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
            <p className="text-sm text-[#6B7280]">No referrals yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Referrals from your network will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.08]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[#9CA3AF]">
                    Facility
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[#9CA3AF]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[#9CA3AF]">
                    Commission
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[#9CA3AF]">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-black/[0.06] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-[#111827]">
                      {r.facility_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          r.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : r.status === "pending"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-black/[0.04] text-[#9CA3AF]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-400">
                      ${r.commission.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#9CA3AF]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#111827]">
          Payout History
        </h3>
        {payouts.length === 0 ? (
          <div className="py-8 text-center">
            <DollarSign className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
            <p className="text-sm text-[#6B7280]">No payouts yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Payouts are processed monthly within 15 days of billing cycle end
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.08]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[#9CA3AF]">
                    Period
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[#9CA3AF]">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[#9CA3AF]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[#9CA3AF]">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-black/[0.06] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-[#111827]">
                      {p.period}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-400">
                      ${p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          p.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.status === "processing"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#9CA3AF]">
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleDateString()
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold text-[#111827]">
          How It Works
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Recurring forever.",
              desc: "Your revenue share continues as long as each facility remains on StowStack. No sunset clause, no cap.",
            },
            {
              title: "Tier upgrades are instant.",
              desc: `The moment you add your ${nextTier ? `${nextTier.min}th` : "next"} facility, your rate increases across all facilities.`,
            },
            {
              title: "Paid monthly.",
              desc: "Earnings are calculated at the end of each billing cycle and paid out within 15 days.",
            },
            {
              title: "No clawbacks.",
              desc: "If a facility churns, you simply stop earning on that facility. No repayment of prior earnings, ever.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-xs text-[#6B7280]">
                <strong className="text-[#111827]">{item.title}</strong>{" "}
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
