"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { useFacility } from "@/lib/facility-context";
import { CampaignStatusBadge } from "@/components/admin/campaigns/campaign-status-badge";
import { CampaignFilters } from "@/components/admin/campaigns/campaign-filters";
import { FacilityBadge } from "@/components/admin/facility-badge";
import { PLATFORM_CONFIG } from "@/types/campaign";
import type { CampaignStatus, CampaignPlatform } from "@/types/campaign";

interface AdVariation {
  id: string;
  facility_id: string;
  platform: string;
  format: string;
  angle: string;
  content_json: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
  facilities?: { name: string; location: string } | null;
}

function mapStatus(status: string): CampaignStatus {
  if (status === "published") return "active";
  if (status === "draft" || status === "generated") return "draft";
  if (status === "paused") return "paused";
  if (status === "error") return "error";
  return "draft";
}

export default function CampaignsPage() {
  const { currentId } = useFacility();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<CampaignPlatform | "all">("all");

  const params: Record<string, string> = {};
  if (currentId !== "all") params.facilityId = currentId;

  const { data, loading, error, refetch } = useAdminFetch<{ variations: AdVariation[] }>(
    "/api/facility-creatives",
    params
  );

  const variations = data?.variations ?? [];

  // Apply filters
  const filtered = variations.filter((v) => {
    if (statusFilter !== "all" && mapStatus(v.status) !== statusFilter) return false;
    if (platformFilter !== "all" && v.platform !== platformFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
          >
            Campaigns
          </h1>
          <FacilityBadge />
        </div>
        <Link
          href="/admin/campaigns/create"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#fff",
            backgroundColor: "var(--color-gold)",
          }}
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      {/* Filters */}
      <CampaignFilters
        status={statusFilter}
        platform={platformFilter}
        onStatusChange={setStatusFilter}
        onPlatformChange={setPlatformFilter}
      />

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-4 animate-pulse"
              style={{ borderColor: "var(--color-light-gray)" }}
            >
              <div className="flex items-center gap-4">
                <div className="h-5 w-48 rounded" style={{ backgroundColor: "var(--color-light-gray)" }} />
                <div className="h-5 w-16 rounded-full" style={{ backgroundColor: "var(--color-light-gray)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="rounded-xl border p-6 text-center"
          style={{ borderColor: "rgba(176, 74, 58, 0.2)", backgroundColor: "rgba(176, 74, 58, 0.05)" }}
        >
          <p className="text-sm mb-3" style={{ fontFamily: "var(--font-body)", color: "var(--color-red)" }}>
            Failed to load campaigns: {error}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg px-4 py-2 text-xs font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", backgroundColor: "var(--color-gold-light)" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--color-light-gray)", backgroundColor: "var(--color-light)" }}
        >
          <Megaphone className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--color-mid-gray)" }} />
          <h3
            className="text-base font-medium mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
          >
            No campaigns yet
          </h3>
          <p
            className="text-sm mb-6"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}
          >
            Create your first campaign to start driving move-ins.
          </p>
          <Link
            href="/admin/campaigns/create"
            className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              fontFamily: "var(--font-heading)",
              color: "#fff",
              backgroundColor: "var(--color-gold)",
            }}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      )}

      {/* Campaign list */}
      {!loading && filtered.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-light-gray)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-light-gray)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
                >
                  Campaign
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
                >
                  Platform
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, idx) => {
                const content = v.content_json as Record<string, unknown> | null;
                const name = (content?.name as string) || v.angle || "Untitled";
                const platformKey = (v.platform || "meta") as CampaignPlatform;
                const platformCfg = PLATFORM_CONFIG[platformKey] ?? PLATFORM_CONFIG.meta;

                return (
                  <tr
                    key={v.id}
                    className="transition-colors cursor-pointer"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-light-gray)" : undefined,
                    }}
                    onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-gold-light)")}
                    onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                  >
                    <td className="px-4 py-3">
                      <div
                        className="font-medium"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)", fontSize: "13px" }}
                      >
                        {name}
                      </div>
                      {v.facilities?.name && (
                        <div
                          className="text-xs mt-0.5"
                          style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}
                        >
                          {v.facilities.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ fontFamily: "var(--font-heading)", color: platformCfg.color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: platformCfg.color }} />
                        {platformCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={mapStatus(v.status)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
                        {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
