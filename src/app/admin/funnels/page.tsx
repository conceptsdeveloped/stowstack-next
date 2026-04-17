"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  GitBranch,
  Plus,
  ChevronRight,
  Users,
  MousePointerClick,
  Eye,
  TrendingUp,
  Loader2,
  Sparkles,
} from "lucide-react";

interface Funnel {
  id: string;
  facility_id: string;
  name: string;
  archetype: string | null;
  status: string;
  config: Record<string, unknown>;
  metrics: Record<string, unknown> | null;
  daily_budget: number | null;
  created_at: string;
  published_at: string | null;
  ad_variations: { id: string; status: string; platform: string; angle: string }[];
  landing_pages: { id: string; slug: string; status: string }[];
  _count: { partial_leads: number };
}

interface Facility {
  id: string;
  name: string;
  location: string;
}

const ARCHETYPE_LABELS: Record<string, string> = {
  social_proof: "Trusted Choice",
  convenience: "Easy Move",
  urgency: "Last Chance",
  lifestyle: "Fresh Start",
  custom: "Custom",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
  testing: "bg-blue-50 text-[var(--color-blue)]",
  live: "bg-green-50 text-[var(--color-green)]",
  paused: "bg-amber-50 text-amber-700",
  archived: "bg-gray-100 text-gray-500",
};

export default function FunnelsPage() {
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: facilitiesData } = useAdminFetch<{ facilities: Facility[] }>("/api/admin-facilities");
  const facilities = facilitiesData?.facilities;
  const { data: funnels, loading, refetch } = useAdminFetch<Funnel[]>(
    "/api/funnels",
    selectedFacility ? { facilityId: selectedFacility } : undefined
  );

  const handleGenerate = useCallback(
    async (archetype: string) => {
      if (!selectedFacility) return;
      setGenerating(true);
      try {
        await adminFetch("/api/funnels/generate", {
          method: "POST",
          body: JSON.stringify({
            facilityId: selectedFacility,
            archetype,
          }),
        });
        refetch();
        setShowCreateModal(false);
      } catch (err) {
        console.error("Failed to generate funnel:", err);
      } finally {
        setGenerating(false);
      }
    },
    [selectedFacility, refetch]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-dark)]" style={{ fontFamily: "var(--font-heading)" }}>
            Funnels
          </h1>
          <p className="text-sm text-[var(--color-body-text)] mt-1">
            Each funnel is a complete path from ad impression to move-in.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedFacility}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-dark)] text-[var(--color-light)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Plus size={16} />
          New Funnel
        </button>
      </div>

      {/* Facility selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[var(--color-body-text)]">Facility</label>
        <select
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-[var(--color-dark)] min-w-[280px]"
        >
          <option value="">Select a facility...</option>
          {facilities?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} — {f.location}
            </option>
          ))}
        </select>
      </div>

      {/* Funnel grid */}
      {!selectedFacility ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-12 text-center">
          <GitBranch size={40} className="mx-auto text-[var(--color-mid-gray)] mb-4" />
          <p className="text-[var(--color-body-text)]">Select a facility to view its funnels</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--color-mid-gray)]" />
        </div>
      ) : !funnels?.length ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-12 text-center">
          <GitBranch size={40} className="mx-auto text-[var(--color-mid-gray)] mb-4" />
          <p className="text-[var(--color-dark)] font-medium mb-2">No funnels yet</p>
          <p className="text-sm text-[var(--color-body-text)] mb-4">
            Create your first funnel to generate a complete ad-to-move-in path.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-dark)] text-[var(--color-light)] rounded-lg hover:opacity-90"
          >
            <Sparkles size={16} />
            Generate First Funnel
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {funnels.map((funnel) => (
            <Link
              key={funnel.id}
              href={`/admin/funnels/${funnel.id}`}
              className="group rounded-xl border border-black/[0.08] bg-white p-5 hover:border-black/[0.16] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--color-dark)] truncate">{funnel.name}</h3>
                  <p className="text-xs text-[var(--color-body-text)] mt-0.5">
                    {ARCHETYPE_LABELS[funnel.archetype || "custom"] || funnel.archetype}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[funnel.status] || STATUS_STYLES.draft}`}
                >
                  {funnel.status}
                </span>
              </div>

              {/* Mini funnel stages */}
              <div className="flex items-center gap-1 mb-4">
                {["Ad", "Page", "Convert", "Drip"].map((stage, i) => (
                  <div key={stage} className="flex items-center">
                    <div
                      className={`px-2 py-1 rounded text-[10px] font-medium ${
                        i === 0 && funnel.ad_variations.length > 0
                          ? "bg-[var(--color-dark)] text-[var(--color-light)]"
                          : i === 1 && funnel.landing_pages.length > 0
                            ? "bg-[var(--color-dark)] text-[var(--color-light)]"
                            : "bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                      }`}
                    >
                      {stage}
                    </div>
                    {i < 3 && <ChevronRight size={10} className="text-[var(--color-mid-gray)] mx-0.5" />}
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-black/[0.05]">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[var(--color-body-text)]">
                    <Eye size={12} />
                    <span className="text-xs">Ads</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {funnel.ad_variations.length}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[var(--color-body-text)]">
                    <MousePointerClick size={12} />
                    <span className="text-xs">Pages</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {funnel.landing_pages.length}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[var(--color-body-text)]">
                    <Users size={12} />
                    <span className="text-xs">Leads</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {funnel._count.partial_leads}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <span className="text-xs text-[var(--color-mid-gray)] group-hover:text-[var(--color-dark)] transition-colors flex items-center gap-1">
                  View funnel <ChevronRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-1">
              Generate New Funnel
            </h2>
            <p className="text-sm text-[var(--color-body-text)] mb-5">
              Choose an archetype. We&apos;ll generate the complete funnel — ad copy, landing page,
              drip sequence, and recovery flow — in one shot.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ARCHETYPE_LABELS)
                .filter(([k]) => k !== "custom")
                .map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleGenerate(key)}
                    disabled={generating}
                    className="rounded-xl border border-black/[0.08] p-4 text-left hover:border-black/[0.2] transition-colors disabled:opacity-50"
                  >
                    <p className="font-medium text-sm text-[var(--color-dark)]">{label}</p>
                    <p className="text-xs text-[var(--color-body-text)] mt-1">
                      {key === "social_proof" && "Lead with trust signals and reviews"}
                      {key === "convenience" && "Proximity, speed, and zero friction"}
                      {key === "urgency" && "Scarcity-backed inventory pressure"}
                      {key === "lifestyle" && "Emotional hook, nurture over 2 weeks"}
                    </p>
                  </button>
                ))}
            </div>

            {generating && (
              <div className="flex items-center justify-center gap-2 mt-4 py-3 rounded-lg bg-[var(--color-light)]">
                <Loader2 size={16} className="animate-spin text-[var(--color-dark)]" />
                <span className="text-sm text-[var(--color-dark)]">Generating complete funnel...</span>
              </div>
            )}

            <button
              onClick={() => setShowCreateModal(false)}
              disabled={generating}
              className="mt-4 w-full py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
