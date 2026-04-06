"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useCreativeStudio } from "./creative-studio/use-creative-studio";
import { GenerationPanel } from "./creative-studio/generation-panel";
import { FilterBar } from "./creative-studio/filter-bar";
import { VariationCard } from "./creative-studio/variation-card";
import { PLATFORM_ICONS, PLATFORM_LABELS } from "./creative-studio/types";

export default function CreativeStudio({
  facilityId,
  adminKey,
}: {
  facilityId: string;
  adminKey: string;
}) {
  const {
    variations,
    loading,
    generating,
    genPlatform,
    filterPlatform,
    setFilterPlatform,
    filterStatus,
    setFilterStatus,
    error,
    setError,
    generateCopy,
    handleUpdate,
    handleDelete,
    platforms,
    statuses,
    filtered,
    approved,
    total,
  } = useCreativeStudio(facilityId, adminKey);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className="font-semibold text-[var(--color-dark)]">Creative Studio</h3>
        {total > 0 && (
          <p className="text-sm text-[var(--color-mid-gray)] mt-1">
            {approved}/{total} approved across {platforms.length} platform
            {platforms.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Generation buttons + regen input */}
      <GenerationPanel
        generating={generating}
        genPlatform={genPlatform}
        hasVariations={total > 0}
        onGenerate={generateCopy}
      />

      {/* Filters: platform + status */}
      <FilterBar
        variations={variations}
        platforms={platforms}
        statuses={statuses}
        filterPlatform={filterPlatform}
        filterStatus={filterStatus}
        onFilterPlatform={setFilterPlatform}
        onFilterStatus={setFilterStatus}
      />

      {/* Empty state */}
      {total === 0 && !generating && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-[var(--border-subtle)]">
          <Sparkles size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
          <p className="font-medium text-[var(--color-dark)]">No creative content yet</p>
          <p className="text-sm text-[var(--color-mid-gray)] mt-1 max-w-md mx-auto">
            Choose a platform above to generate ad copy, landing page content, or email sequences using AI — enriched with your facility&apos;s real data.
          </p>
        </div>
      )}

      {/* Variation cards grouped by version */}
      {filtered.length > 0 &&
        (() => {
          const versions = [
            ...new Set(filtered.map((v) => v.version)),
          ].sort((a, b) => b - a);
          return versions.map((ver) => {
            const batch = filtered.filter((v) => v.version === ver);
            const batchPlatforms = [...new Set(batch.map((v) => v.platform))];

            return (
              <div key={ver} className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
                  Version {ver} &middot; {new Date(batch[0].created_at).toLocaleDateString()}
                </p>
                {batchPlatforms.map((plat) => {
                  const platBatch = batch.filter((v) => v.platform === plat);
                  const isMetaFeed = plat === "meta_feed";
                  return (
                    <div key={plat} className="space-y-3">
                      {batchPlatforms.length > 1 && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-mid-gray)] flex items-center gap-1.5">
                          {PLATFORM_ICONS[plat]} {PLATFORM_LABELS[plat] || plat}
                        </p>
                      )}
                      <div
                        className={
                          isMetaFeed
                            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
                            : "space-y-4"
                        }
                      >
                        {platBatch.map((v) => (
                          <VariationCard
                            key={v.id}
                            v={v}
                            adminKey={adminKey}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
    </div>
  );
}
