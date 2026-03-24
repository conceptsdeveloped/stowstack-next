"use client";

import { useState } from "react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
  DollarSign,
} from "lucide-react";

interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FacilityAssignment {
  id: string;
  name: string;
  location: string;
}

interface Organization {
  id: string;
  name: string;
  plan_tier: string;
  facility_count: number;
  status: string;
  mrr: number;
  users: OrganizationUser[];
  facilities: FacilityAssignment[];
  revenue_share_tier: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", text: "#22C55E" },
  inactive: { bg: "rgba(107,114,128,0.1)", text: "#6B7280" },
  trial: { bg: "rgba(234,179,8,0.1)", text: "#EAB308" },
  churned: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
};

const TIER_STYLES: Record<string, string> = {
  starter: "#6B7280",
  growth: "#3B82F6",
  enterprise: "#8B5CF6",
};

function OrgSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 animate-pulse"
          style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-4">
            <div className="h-4 w-40 rounded bg-black/5" />
            <div className="h-4 w-16 rounded bg-black/5" />
            <div className="flex-1" />
            <div className="h-4 w-20 rounded bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PartnersPage() {
  const { data: rawOrgs, loading, error } = useAdminFetch<{ organizations: Organization[] }>("/api/organizations");
  const orgs = rawOrgs?.organizations ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalMrr = orgs?.reduce((sum, o) => sum + (o.mrr || 0), 0) ?? 0;
  const activeCount = orgs?.filter((o) => o.status === "active").length ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>Partners</h1>
        <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>
          Organization management and partner details
        </p>
      </div>

      {orgs && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} style={{ color: "#3B82F6" }} />
              <span className="text-xs font-medium" style={{ color: "#6E6E73" }}>Total Partners</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#111827" }}>{orgs.length}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} style={{ color: "#22C55E" }} />
              <span className="text-xs font-medium" style={{ color: "#6E6E73" }}>Active</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#111827" }}>{activeCount}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} style={{ color: "#EAB308" }} />
              <span className="text-xs font-medium" style={{ color: "#6E6E73" }}>Total MRR</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#111827" }}>${totalMrr.toLocaleString()}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)", color: "#EF4444" }}>
          Failed to load organizations: {error}
        </div>
      )}

      {loading ? (
        <OrgSkeleton />
      ) : orgs && orgs.length > 0 ? (
        <div className="space-y-2">
          {orgs.map((org) => {
            const isExpanded = expandedId === org.id;
            const statusStyle = STATUS_STYLES[org.status] || STATUS_STYLES.inactive;
            const tierColor = TIER_STYLES[org.plan_tier?.toLowerCase()] || "#6B7280";

            return (
              <div
                key={org.id}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : org.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "#111827" }}>{org.name}</span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {org.status}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: `${tierColor}15`, color: tierColor }}
                    >
                      {org.plan_tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs" style={{ color: "#6E6E73" }}>
                      {org.facility_count} {org.facility_count === 1 ? "facility" : "facilities"}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "#22C55E" }}>
                      ${org.mrr?.toLocaleString() || 0}/mo
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={16} style={{ color: "#6E6E73" }} />
                    ) : (
                      <ChevronRight size={16} style={{ color: "#6E6E73" }} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                    {org.revenue_share_tier && (
                      <div className="pt-3">
                        <span className="text-xs" style={{ color: "#6E6E73" }}>Revenue Share Tier: </span>
                        <span className="text-xs font-medium" style={{ color: "#3B82F6" }}>{org.revenue_share_tier}</span>
                      </div>
                    )}

                    {org.users && org.users.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium mb-2" style={{ color: "#6E6E73" }}>
                          <Users size={12} className="inline mr-1" />
                          Users
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {org.users.map((user) => (
                            <div
                              key={user.id}
                              className="rounded-lg p-2.5 text-xs"
                              style={{ backgroundColor: "#F9FAFB" }}
                            >
                              <p style={{ color: "#111827" }}>{user.name}</p>
                              <p style={{ color: "#6E6E73" }}>{user.email}</p>
                              <p className="capitalize mt-0.5" style={{ color: "#6B7280" }}>{user.role}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {org.facilities && org.facilities.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium mb-2" style={{ color: "#6E6E73" }}>
                          <MapPin size={12} className="inline mr-1" />
                          Facilities
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {org.facilities.map((fac) => (
                            <div
                              key={fac.id}
                              className="rounded-lg p-2.5 text-xs"
                              style={{ backgroundColor: "#F9FAFB" }}
                            >
                              <p style={{ color: "#111827" }}>{fac.name}</p>
                              <p style={{ color: "#6E6E73" }}>{fac.location}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Building2 size={32} className="mx-auto mb-3" style={{ color: "#6E6E73" }} />
          <p className="text-sm" style={{ color: "#6E6E73" }}>No partner organizations</p>
        </div>
      )}
    </div>
  );
}
