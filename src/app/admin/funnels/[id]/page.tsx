"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Play,
  Pause,
  Save,
  Smartphone,
  TrendingDown,
  Users,
  ExternalLink,
} from "lucide-react";

/* ── Types ── */

interface FunnelConfig {
  landingHero?: string;
  landingFeatures?: string[];
  postConversion?: { channel: string; message: string; timing: string }[];
  recovery?: { channel: string; message: string; timing: string }[];
  retargeting?: string;
}

interface AdVariation {
  id: string;
  platform: string;
  format: string;
  angle: string;
  content_json: {
    primaryText?: string;
    headline?: string;
    description?: string;
    cta?: string;
    angleLabel?: string;
    targetingNote?: string;
  };
  asset_urls: Record<string, string> | null;
  status: string;
  compliance_status: string | null;
  funnel_config: FunnelConfig | null;
}

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
}

interface DripTemplate {
  id: string;
  name: string;
  sequence_type: string;
  steps: Array<{
    delayDays?: number;
    delayHours?: number;
    templateId: string;
    label: string;
    channel?: string;
    customMessage?: string;
  }>;
}

interface StageMetric {
  id: string;
  period: string;
  stage: string;
  count: number;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  lead_status: string | null;
  converted: boolean | null;
  created_at: string;
}

interface FunnelDetail {
  id: string;
  facility_id: string;
  name: string;
  archetype: string | null;
  status: string;
  config: FunnelConfig;
  metrics: Record<string, unknown> | null;
  daily_budget: number | null;
  created_at: string;
  published_at: string | null;
  ad_variations: AdVariation[];
  landing_pages: LandingPage[];
  drip_sequence_templates: DripTemplate[];
  funnel_stage_metrics: StageMetric[];
  partial_leads: Lead[];
}

interface MetricsData {
  summary: {
    totalSpend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    totalLeads: number;
    convertedLeads: number;
    moveIns: number;
    costPerLead: number | null;
    costPerMoveIn: number | null;
  };
  stages: Array<{
    stage: string;
    count: number;
    label: string;
    rate?: number;
    dropOff?: number;
  }>;
}

const ARCHETYPE_LABELS: Record<string, string> = {
  social_proof: "Trusted Choice",
  convenience: "Easy Move",
  urgency: "Last Chance",
  lifestyle: "Fresh Start",
  custom: "Custom",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string; icon: typeof Play }> = {
  draft: { label: "Start Testing", next: "testing", icon: Play },
  testing: { label: "Go Live", next: "live", icon: Play },
  live: { label: "Pause", next: "paused", icon: Pause },
  paused: { label: "Resume", next: "live", icon: Play },
};

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const { data: funnel, loading, refetch } = useAdminFetch<FunnelDetail>(
    "/api/funnels",
    { id: funnelId }
  );
  const { data: metricsData } = useAdminFetch<MetricsData>(
    "/api/funnel-metrics",
    { funnelId }
  );

  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setSaving(true);
      try {
        await adminFetch("/api/funnels", {
          method: "PATCH",
          body: JSON.stringify({ id: funnelId, status: newStatus }),
        });
        refetch();
      } catch (err) {
        console.error("Failed to update status:", err);
      } finally {
        setSaving(false);
      }
    },
    [funnelId, refetch]
  );

  const handleNameSave = useCallback(async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      await adminFetch("/api/funnels", {
        method: "PATCH",
        body: JSON.stringify({ id: funnelId, name: nameValue.trim() }),
      });
      setEditingName(false);
      refetch();
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setSaving(false);
    }
  }, [funnelId, nameValue, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-mid-gray)]" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-body-text)]">Funnel not found</p>
        <Link href="/admin/funnels" className="text-sm text-[var(--color-dark)] underline mt-2 inline-block">
          Back to funnels
        </Link>
      </div>
    );
  }

  const config = funnel.config || {};
  const statusAction = STATUS_ACTIONS[funnel.status];
  const metrics = metricsData?.summary;
  const stages = metricsData?.stages || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/funnels"
          className="p-1.5 rounded-lg hover:bg-[var(--color-light-gray)] transition-colors"
        >
          <ArrowLeft size={18} className="text-[var(--color-body-text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-xl font-semibold text-[var(--color-dark)] border-b-2 border-[var(--color-dark)] bg-transparent outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              />
              <button onClick={handleNameSave} disabled={saving} className="p-1">
                <Save size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameValue(funnel.name);
                setEditingName(true);
              }}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-xl font-semibold text-[var(--color-dark)]" style={{ fontFamily: "var(--font-heading)" }}>
                {funnel.name}
              </h1>
              <Pencil size={14} className="text-[var(--color-mid-gray)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <p className="text-sm text-[var(--color-body-text)]">
            {ARCHETYPE_LABELS[funnel.archetype || "custom"]} funnel
            {funnel.published_at && ` — live since ${new Date(funnel.published_at).toLocaleDateString()}`}
          </p>
        </div>
        {statusAction && (
          <button
            onClick={() => handleStatusChange(statusAction.next)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-dark)] text-[var(--color-light)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <statusAction.icon size={16} />
            {statusAction.label}
          </button>
        )}
      </div>

      {/* Funnel visualization — the heartbeat */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-6">
        <h2 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-4">
          Funnel Path
        </h2>
        <div className="flex items-stretch gap-0">
          {/* Stage: Ad */}
          <FunnelStage
            title="Ad Impression"
            icon={<Eye size={18} />}
            count={metrics?.impressions || 0}
            items={funnel.ad_variations.map((v) => ({
              label: `${v.content_json?.headline || v.angle || "Draft"} (${v.platform})`,
              status: v.status,
              detail: v.content_json?.primaryText?.slice(0, 80) || "",
            }))}
            isEmpty={funnel.ad_variations.length === 0}
            emptyLabel="No ad created"
          />
          <StageArrow rate={metrics?.ctr} />

          {/* Stage: Landing Page */}
          <FunnelStage
            title="Landing Page"
            icon={<FileText size={18} />}
            count={stages.find((s) => s.stage === "page_view")?.count || metrics?.clicks || 0}
            items={funnel.landing_pages.map((lp) => ({
              label: lp.title,
              status: lp.status,
              detail: `/lp/${lp.slug}`,
              href: `/lp/${lp.slug}`,
            }))}
            isEmpty={funnel.landing_pages.length === 0}
            emptyLabel="No landing page"
          />
          <StageArrow
            rate={
              (metrics?.clicks || 0) > 0
                ? (metrics?.totalLeads || 0) / (metrics?.clicks || 1)
                : undefined
            }
          />

          {/* Stage: Conversion */}
          <FunnelStage
            title="Conversion"
            icon={<MousePointerClick size={18} />}
            count={metrics?.convertedLeads || 0}
            items={
              funnel.partial_leads
                .filter((l) => l.converted)
                .slice(0, 3)
                .map((l) => ({
                  label: l.name || l.email || "Anonymous",
                  status: "converted",
                  detail: l.email || "",
                }))
            }
            isEmpty={(metrics?.convertedLeads || 0) === 0}
            emptyLabel="No conversions yet"
          />
          <StageArrow />

          {/* Stage: Drip Sequence */}
          <FunnelStage
            title="Post-Conversion"
            icon={<Mail size={18} />}
            count={funnel.drip_sequence_templates.filter((t) => t.sequence_type === "post_conversion").length}
            items={
              funnel.drip_sequence_templates
                .filter((t) => t.sequence_type === "post_conversion")
                .flatMap((t) =>
                  t.steps.map((step) => ({
                    label: step.label,
                    status: "active",
                    detail: step.customMessage?.slice(0, 60) || "",
                    icon: step.channel === "sms" ? <Smartphone size={12} /> : <Mail size={12} />,
                  }))
                )
            }
            isEmpty={funnel.drip_sequence_templates.length === 0}
            emptyLabel="No drip steps"
          />
          <StageArrow />

          {/* Stage: Move-in */}
          <FunnelStage
            title="Move-In"
            icon={<Users size={18} />}
            count={metrics?.moveIns || 0}
            items={[]}
            isEmpty={(metrics?.moveIns || 0) === 0}
            emptyLabel="Awaiting move-ins"
            isLast
          />
        </div>
      </div>

      {/* Metrics strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="Ad Spend" value={`$${metrics.totalSpend.toFixed(2)}`} />
          <MetricCard label="Impressions" value={metrics.impressions.toLocaleString()} />
          <MetricCard label="CTR" value={`${(metrics.ctr * 100).toFixed(2)}%`} />
          <MetricCard
            label="Cost / Lead"
            value={metrics.costPerLead ? `$${metrics.costPerLead.toFixed(2)}` : "—"}
          />
          <MetricCard
            label="Cost / Move-In"
            value={metrics.costPerMoveIn ? `$${metrics.costPerMoveIn.toFixed(2)}` : "—"}
          />
        </div>
      )}

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ad Creative */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide">
              Ad Creative
            </h3>
            <Link
              href={`/admin/facilities?tab=ad-studio`}
              className="text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)] flex items-center gap-1"
            >
              Open in Ad Studio <ExternalLink size={10} />
            </Link>
          </div>
          {funnel.ad_variations.length > 0 ? (
            funnel.ad_variations.map((v) => {
              const c = v.content_json;
              const heroImg = v.asset_urls?.hero || v.asset_urls?.image;
              return (
                <div key={v.id} className="space-y-3">
                  {/* Image preview */}
                  {heroImg && (
                    <div className="rounded-lg overflow-hidden border border-black/[0.06]">
                      <img
                        src={heroImg}
                        alt={c.headline || "Ad creative"}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  {!heroImg && (
                    <div className="rounded-lg border border-dashed border-black/[0.12] bg-[var(--color-light)] p-6 text-center">
                      <Eye size={20} className="mx-auto text-[var(--color-mid-gray)] mb-1" />
                      <p className="text-xs text-[var(--color-mid-gray)]">Image generating or not yet created</p>
                    </div>
                  )}

                  {/* Copy */}
                  <div>
                    <p className="font-medium text-[var(--color-dark)]">{c.headline}</p>
                    <p className="text-sm text-[var(--color-body-text)] mt-1">{c.primaryText}</p>
                    {c.description && (
                      <p className="text-xs text-[var(--color-mid-gray)] mt-1">{c.description}</p>
                    )}
                    {c.targetingNote && (
                      <p className="text-xs text-[var(--color-mid-gray)] mt-1 italic">Targeting: {c.targetingNote}</p>
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                      {v.platform}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                      {v.status}
                    </span>
                    {v.compliance_status && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          v.compliance_status === "passed"
                            ? "bg-green-50 text-[var(--color-green)]"
                            : v.compliance_status === "flagged"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {v.compliance_status}
                      </span>
                    )}
                    {c.cta && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-dark)] text-[var(--color-light)]">
                        {c.cta}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-[var(--color-mid-gray)]">No ad variation generated.</p>
          )}
        </div>

        {/* Landing Page */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-3">
            Landing Page
          </h3>
          {funnel.landing_pages.length > 0 ? (
            funnel.landing_pages.map((lp) => (
              <div key={lp.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--color-dark)]">{lp.title}</p>
                  <p className="text-sm text-[var(--color-body-text)]">/lp/{lp.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                    {lp.status}
                  </span>
                  <Link
                    href={`/lp/${lp.slug}?preview=1`}
                    target="_blank"
                    className="p-1.5 rounded hover:bg-[var(--color-light-gray)]"
                  >
                    <ExternalLink size={14} className="text-[var(--color-body-text)]" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-mid-gray)]">No landing page generated.</p>
          )}
        </div>

        {/* Drip Sequence */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-3">
            Post-Conversion Drip
          </h3>
          {funnel.drip_sequence_templates
            .filter((t) => t.sequence_type === "post_conversion")
            .map((t) => (
              <div key={t.id} className="space-y-2">
                {t.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-black/[0.04] last:border-0">
                    <div className="mt-0.5">
                      {step.channel === "sms" ? (
                        <Smartphone size={14} className="text-[var(--color-blue)]" />
                      ) : (
                        <Mail size={14} className="text-[var(--color-green)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-dark)]">{step.label}</p>
                      <p className="text-xs text-[var(--color-body-text)] truncate">
                        {step.customMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          {funnel.drip_sequence_templates.filter((t) => t.sequence_type === "post_conversion")
            .length === 0 && (
            <p className="text-sm text-[var(--color-mid-gray)]">No drip sequence configured.</p>
          )}
        </div>

        {/* Recovery Sequence */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-3">
            Recovery Sequence
          </h3>
          {funnel.drip_sequence_templates
            .filter((t) => t.sequence_type === "recovery")
            .map((t) => (
              <div key={t.id} className="space-y-2">
                {t.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-black/[0.04] last:border-0">
                    <div className="mt-0.5">
                      {step.channel === "sms" ? (
                        <MessageSquare size={14} className="text-[var(--color-blue)]" />
                      ) : (
                        <Mail size={14} className="text-[var(--color-green)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-dark)]">{step.label}</p>
                      <p className="text-xs text-[var(--color-body-text)] truncate">
                        {step.customMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          {funnel.drip_sequence_templates.filter((t) => t.sequence_type === "recovery").length ===
            0 && (
            <p className="text-sm text-[var(--color-mid-gray)]">No recovery sequence configured.</p>
          )}
        </div>
      </div>

      {/* Retargeting copy */}
      {config.retargeting && (
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-2">
            Retargeting Copy
          </h3>
          <p className="text-sm text-[var(--color-dark)] italic">&ldquo;{config.retargeting}&rdquo;</p>
        </div>
      )}

      {/* Recent leads */}
      {funnel.partial_leads.length > 0 && (
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-sm font-medium text-[var(--color-body-text)] uppercase tracking-wide mb-3">
            Recent Leads
          </h3>
          <div className="divide-y divide-black/[0.04]">
            {funnel.partial_leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {lead.name || "Anonymous"}
                  </p>
                  <p className="text-xs text-[var(--color-body-text)]">{lead.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      lead.converted
                        ? "bg-green-50 text-[var(--color-green)]"
                        : "bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                    }`}
                  >
                    {lead.lead_status || "partial"}
                  </span>
                  <span className="text-xs text-[var(--color-mid-gray)]">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function FunnelStage({
  title,
  icon,
  count,
  items,
  isEmpty,
  emptyLabel,
  isLast,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  items: Array<{
    label: string;
    status: string;
    detail: string;
    href?: string;
    icon?: React.ReactNode;
  }>;
  isEmpty: boolean;
  emptyLabel: string;
  isLast?: boolean;
}) {
  return (
    <div className={`flex-1 min-w-0 ${isLast ? "" : ""}`}>
      <div className="rounded-lg border border-black/[0.08] bg-[var(--color-light)] p-3 h-full">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[var(--color-dark)]">{icon}</div>
          <span className="text-xs font-medium text-[var(--color-body-text)] uppercase tracking-wide">
            {title}
          </span>
        </div>
        <p className="text-lg font-semibold text-[var(--color-dark)] mb-2">{count.toLocaleString()}</p>
        {isEmpty ? (
          <p className="text-xs text-[var(--color-mid-gray)]">{emptyLabel}</p>
        ) : (
          <div className="space-y-1">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center gap-1">
                  {item.icon}
                  <span className="text-[var(--color-dark)] truncate">{item.label}</span>
                </div>
                {item.detail && (
                  <p className="text-[var(--color-mid-gray)] truncate pl-4">{item.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StageArrow({ rate }: { rate?: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 min-w-[32px]">
      <ChevronRight size={16} className="text-[var(--color-mid-gray)]" />
      {rate !== undefined && rate > 0 && (
        <span className="text-[10px] text-[var(--color-body-text)] mt-0.5">
          {(rate * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4">
      <p className="text-xs text-[var(--color-body-text)] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-[var(--color-dark)] mt-1">{value}</p>
    </div>
  );
}
