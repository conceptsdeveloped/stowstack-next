"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  DollarSign,
  Loader2,
  Megaphone,
  Plus,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface OrgFacility {
  id: string;
  name: string;
  location: string;
  status: string;
  campaigns: { month: string; leads: number; spend: number }[] | null;
}

interface ActivityItem {
  id: string;
  type: string;
  detail: string;
  created_at: string;
}

export default function PartnerOverviewPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [facilities, setFacilities] = useState<OrgFacility[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const [facRes, actRes] = await Promise.allSettled([
        authFetch("/api/org-facilities"),
        authFetch("/api/org-activity?limit=10"),
      ]);

      if (facRes.status === "fulfilled" && facRes.value.ok) {
        const data = await facRes.value.json();
        setFacilities(data.facilities || []);
      }

      if (actRes.status === "fulfilled" && actRes.value.ok) {
        const data = await actRes.value.json();
        setActivity(data.activities || []);
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

  const totalLeads = facilities.reduce((sum, f) => {
    return sum + (f.campaigns || []).reduce((s, c) => s + (c.leads || 0), 0);
  }, 0);

  const totalSpend = facilities.reduce((sum, f) => {
    return sum + (f.campaigns || []).reduce((s, c) => s + (c.spend || 0), 0);
  }, 0);

  const activeCampaigns = facilities.filter(
    (f) => f.status === "live" || f.status === "reporting",
  ).length;

  const kpis = [
    {
      label: "Total Facilities",
      value: facilities.length.toString(),
      icon: Building2,
      color: "text-[#3B82F6]",
      bg: "bg-[#3B82F6]/10",
    },
    {
      label: "Active Campaigns",
      value: activeCampaigns.toString(),
      icon: Megaphone,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Total Spend",
      value: `$${totalSpend.toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-black/[0.08] bg-white p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}
                >
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#111827]">{kpi.value}</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#111827]">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/partner/facilities"
              className="flex items-center gap-3 rounded-lg bg-black/[0.03] px-4 py-3 text-sm text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
            >
              <Plus className="h-4 w-4 text-[#3B82F6]" />
              Add Facility
            </Link>
            <Link
              href="/partner/team"
              className="flex items-center gap-3 rounded-lg bg-black/[0.03] px-4 py-3 text-sm text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
            >
              <UserPlus className="h-4 w-4 text-purple-400" />
              Invite Team Member
            </Link>
            <Link
              href="/partner/revenue"
              className="flex items-center gap-3 rounded-lg bg-black/[0.03] px-4 py-3 text-sm text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
            >
              <Target className="h-4 w-4 text-emerald-400" />
              View Revenue Share
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-[#111827]">
            Recent Activity
          </h2>
          {activity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#9CA3AF]">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-b border-black/[0.06] pb-3 last:border-0"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#3B82F6]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#6B7280]">{item.detail}</p>
                    <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Facility Snapshot */}
      {facilities.length > 0 && (
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">
              Facilities ({facilities.length})
            </h2>
            <Link
              href="/partner/facilities"
              className="text-xs text-[#3B82F6] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {facilities.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg bg-black/[0.02] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {f.name}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">{f.location}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    f.status === "live"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : f.status === "reporting"
                        ? "bg-teal-500/10 text-teal-400"
                        : f.status === "review"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-black/[0.04] text-[#9CA3AF]"
                  }`}
                >
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
