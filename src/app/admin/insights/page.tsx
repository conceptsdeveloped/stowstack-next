"use client";

import { useState } from "react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import {
  TrendingUp,
  Clock,
  Timer,
  TrendingDown,
  Activity,
  UserPlus,
  FileText,
  Phone,
  Award,
  MessageSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsResponse {
  totalLeads: number;
  funnel: Record<string, number>;
  conversionRate: string;
  avg_days_to_sign: number;
  avg_days_in_pipeline: number;
  lost_rate: number;
  velocity: WeeklyVelocity[];
}

interface Analytics {
  conversion_rate: number;
  avg_days_to_sign: number;
  avg_days_in_pipeline: number;
  lost_rate: number;
  funnel: FunnelStep[];
  velocity: WeeklyVelocity[];
}

interface FunnelStep {
  stage: string;
  count: number;
  label: string;
}

interface WeeklyVelocity {
  week: string;
  count: number;
}

interface ActivityEvent {
  id: string;
  type: "lead_created" | "status_change" | "note_added" | "client_signed";
  description: string;
  lead_name: string;
  facility: string;
  timestamp: string;
}

const FUNNEL_STAGES = [
  "submitted",
  "form_sent",
  "form_completed",
  "audit_generated",
  "call_scheduled",
  "client_signed",
];

const FUNNEL_COLORS: Record<number, string> = {
  0: "#6E6E73",
  1: "#525258",
  2: "#4B5EA6",
  3: "#3B6FD0",
  4: "#3B7EE6",
  5: "#3B82F6",
};

const EVENT_CONFIG: Record<
  string,
  { color: string; icon: typeof Activity }
> = {
  lead_created: { color: "#22C55E", icon: UserPlus },
  status_change: { color: "#3B82F6", icon: Activity },
  note_added: { color: "#6E6E73", icon: MessageSquare },
  client_signed: { color: "#EAB308", icon: Award },
};

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 animate-pulse"
          style={{
            backgroundColor: "#111111",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="h-3 w-24 rounded bg-white/5 mb-3" />
          <div className="h-8 w-16 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg p-3 animate-pulse"
          style={{ backgroundColor: "#111111" }}
        >
          <div className="h-8 w-8 rounded-full bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-white/5" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const {
    data: rawAnalytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAdminFetch<AnalyticsResponse>("/api/lead-analytics");

  // Transform API response to the shape the component expects
  const analytics: Analytics | null = rawAnalytics
    ? {
        conversion_rate: parseFloat(rawAnalytics.conversionRate) || 0,
        avg_days_to_sign: rawAnalytics.avg_days_to_sign ?? 0,
        avg_days_in_pipeline: rawAnalytics.avg_days_in_pipeline ?? 0,
        lost_rate: rawAnalytics.lost_rate ?? 0,
        funnel: rawAnalytics.funnel
          ? FUNNEL_STAGES.map((stage) => ({
              stage,
              count: (rawAnalytics.funnel as Record<string, number>)[stage] ?? 0,
              label: stage.replace(/_/g, " "),
            }))
          : [],
        velocity: rawAnalytics.velocity ?? [],
      }
    : null;

  const {
    data: rawActivity,
    loading: activityLoading,
    error: activityError,
  } = useAdminFetch<{ logs: ActivityEvent[] }>("/api/activity-log", { limit: "50" });
  const activityData = rawActivity?.logs ?? [];

  const [activityFilter] = useState<string>("all");

  const kpis = analytics
    ? [
        {
          label: "Conversion Rate",
          value: `${analytics.conversion_rate.toFixed(1)}%`,
          icon: TrendingUp,
          color: "#22C55E",
        },
        {
          label: "Avg Days to Sign",
          value: `${analytics.avg_days_to_sign.toFixed(1)}`,
          icon: Clock,
          color: "#3B82F6",
        },
        {
          label: "Avg Days in Pipeline",
          value: `${analytics.avg_days_in_pipeline.toFixed(1)}`,
          icon: Timer,
          color: "#EAB308",
        },
        {
          label: "Lost Rate",
          value: `${analytics.lost_rate.toFixed(1)}%`,
          icon: TrendingDown,
          color: "#EF4444",
        },
      ]
    : [];

  const maxFunnelCount =
    analytics?.funnel?.length ? Math.max(...analytics.funnel.map((s) => s.count)) : 0;

  const filteredActivity =
    activityFilter === "all"
      ? activityData
      : activityData?.filter((e) => e.type === activityFilter);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#F5F5F7" }}>
          Performance Insights
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>
          Lead analytics and conversion metrics
        </p>
      </div>

      {analyticsError && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.2)",
            color: "#EF4444",
          }}
        >
          Failed to load analytics: {analyticsError}
        </div>
      )}

      {analyticsLoading ? (
        <KpiSkeleton />
      ) : analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: "#111111",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: kpi.color }} />
                  <span className="text-xs font-medium" style={{ color: "#6E6E73" }}>
                    {kpi.label}
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "#F5F5F7" }}>
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {analytics?.funnel && analytics.funnel.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "#111111",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#F5F5F7" }}>
            Conversion Funnel
          </h2>
          <div className="space-y-3">
            {analytics.funnel.map((step, idx) => {
              const widthPct =
                maxFunnelCount > 0 ? Math.max((step.count / maxFunnelCount) * 100, 4) : 4;
              const nextStep = analytics.funnel[idx + 1];
              const conversionPct =
                nextStep && step.count > 0
                  ? ((nextStep.count / step.count) * 100).toFixed(1)
                  : null;

              return (
                <div key={step.stage}>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs w-32 shrink-0 text-right"
                      style={{ color: "#A1A1A6" }}
                    >
                      {step.label || step.stage.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 relative">
                      <div
                        className="h-8 rounded-md flex items-center px-3 transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor:
                            FUNNEL_COLORS[idx] || "#3B82F6",
                          minWidth: "40px",
                        }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#F5F5F7" }}
                        >
                          {step.count}
                        </span>
                      </div>
                    </div>
                    {conversionPct && (
                      <span
                        className="text-xs shrink-0 w-14 text-right"
                        style={{ color: "#6E6E73" }}
                      >
                        {conversionPct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analytics?.velocity && analytics.velocity.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "#111111",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#F5F5F7" }}>
            Weekly Lead Velocity
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#6E6E73", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                <YAxis
                  tick={{ fill: "#6E6E73", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#F5F5F7",
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "#111111",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#F5F5F7" }}>
          Activity Feed
        </h2>

        {activityError && (
          <p className="text-sm" style={{ color: "#EF4444" }}>
            Failed to load activity: {activityError}
          </p>
        )}

        {activityLoading ? (
          <FeedSkeleton />
        ) : filteredActivity && filteredActivity.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {filteredActivity.map((event) => {
              const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.note_added;
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <Icon size={14} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#F5F5F7" }}>
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "#6E6E73" }}>
                      {event.lead_name && <span>{event.lead_name}</span>}
                      {event.facility && (
                        <>
                          <span>&#183;</span>
                          <span>{event.facility}</span>
                        </>
                      )}
                      <span>&#183;</span>
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity size={32} className="mx-auto mb-3" style={{ color: "#6E6E73" }} />
            <p className="text-sm" style={{ color: "#6E6E73" }}>
              No recent activity
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
