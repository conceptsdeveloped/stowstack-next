"use client";

import { Filter } from "lucide-react";
import type { AdVariation } from "./types";
import { PLATFORM_ICONS, PLATFORM_LABELS } from "./types";

export function FilterBar({
  variations,
  platforms,
  statuses,
  filterPlatform,
  filterStatus,
  onFilterPlatform,
  onFilterStatus,
}: {
  variations: AdVariation[];
  platforms: string[];
  statuses: string[];
  filterPlatform: string;
  filterStatus: string;
  onFilterPlatform: (p: string) => void;
  onFilterStatus: (s: string) => void;
}) {
  const total = variations.length;

  if (platforms.length <= 1 && statuses.length <= 1) return null;

  return (
    <div className="flex gap-4 flex-wrap items-center border-t border-[var(--border-subtle)] pt-6">
      {platforms.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter size={12} className="text-[var(--color-mid-gray)] mr-1" />
          <button
            onClick={() => onFilterPlatform("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterPlatform === "all"
                ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
            }`}
          >
            All ({total})
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => onFilterPlatform(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterPlatform === p
                  ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                  : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {PLATFORM_ICONS[p] || "📝"} {PLATFORM_LABELS[p] || p} ({variations.filter((v) => v.platform === p).length})
            </button>
          ))}
        </div>
      )}
      {statuses.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mid-gray)] mr-1">Status:</span>
          <button
            onClick={() => onFilterStatus("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === "all"
                ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
            }`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => onFilterStatus(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                  : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {s} ({variations.filter((v) => v.status === s).length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
