"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronRight,
  Film,
  FileText,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Sparkles,
  LayoutDashboard,
  Link2,
  Mail,
  Map,
  Menu,
  Music2,
  Palette,
  Phone,
  RefreshCw,
  Search,
  Send,
  Share2,
  Star,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

/* ================================================================
   Lazy-loaded facility tab components
   ================================================================ */

const FacilityOverview = lazy(
  () => import("@/components/admin/facility-tabs/facility-overview")
);

/* ================================================================
   Types
   ================================================================ */

interface Facility {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  googleRating?: number;
  reviewCount?: number;
  occupancy?: number;
  totalUnits?: number;
  phone?: string;
  email?: string;
  website?: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
  photos?: string[];
}

type TabKey = string;

// Old in-page tab keys -> new scope-aware routes (Phase 3 collapse). Selecting a
// tool now forwards to its standalone route, which reads the facility from the
// shared FacilityProvider via ?facility=. Overview stays in this page.
const TAB_REDIRECTS: Record<string, string> = {
  "creative-studio": "/admin/studio/creative",
  "ad-studio": "/admin/studio/ad-generator",
  "ad-publisher": "/admin/studio/publisher",
  "google-ads": "/admin/studio/google-ads",
  "tiktok": "/admin/studio/tiktok",
  "video": "/admin/studio/video",
  "media-library": "/admin/studio/media",
  "funnels": "/admin/channels/funnels",
  "landing-pages": "/admin/channels/landing-pages",
  "utm-links": "/admin/channels/utm",
  "gbp": "/admin/channels/gbp",
  "social": "/admin/channels/social",
  "lead-nurture": "/admin/channels/automations",
  "occupancy": "/admin/intelligence/occupancy",
  "market-intel": "/admin/intelligence/market",
  "revenue": "/admin/intelligence/revenue",
  "tenants": "/admin/facilities/tenants",
  "pms": "/admin/facilities/pms",
  "call-tracking": "/admin/facilities/call-tracking",
};

/* ================================================================
   Shared UI helpers
   ================================================================ */

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "unknown").toLowerCase();
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    signed: "bg-emerald-500/20 text-emerald-400",
    live: "bg-emerald-500/20 text-emerald-400",
    published: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    draft: "bg-yellow-500/20 text-yellow-400",
    paused: "bg-orange-500/20 text-orange-400",
    inactive: "bg-red-500/20 text-red-400",
    completed: "bg-[var(--burgundy)]/20 text-[var(--burgundy)]",
    answered: "bg-emerald-500/20 text-emerald-400",
    missed: "bg-red-500/20 text-red-400",
    voicemail: "bg-yellow-500/20 text-yellow-400",
  };
  const cls = colors[s] || "bg-[var(--color-light-gray)] text-[var(--color-body-text)]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--color-light-gray)] ${className || "h-4 w-full"}`}
    />
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
      <XCircle className="h-5 w-5 shrink-0 text-red-400" />
      <p className="flex-1 text-sm text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-12 text-center">
      <p className="text-sm text-[var(--color-mid-gray)]">{message}</p>
    </div>
  );
}

function TabLoadingFallback() {
  return (
    <div className="space-y-4 p-2">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    </div>
  );
}

/* ================================================================
   Facility Detail Panel — vertical sidebar layout
   ================================================================ */

function FacilityDetail({
  facility,
  onClose,
  onUpdate,
}: {
  facility: Facility;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [adminKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("storageads_admin_key") || "";
  });

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
      {/* Top header bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5 sm:px-5 sm:py-3 gap-2">
        {/* Left: back + facility name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)] shrink-0"
            aria-label="Back to facilities"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--color-dark)] truncate">
              {facility.name}
            </h2>
            {(facility.city || facility.state || facility.totalUnits) && (
              <p className="text-[11px] text-[var(--color-mid-gray)] truncate">
                {[facility.city, facility.state].filter(Boolean).join(", ")}
                {facility.totalUnits ? ` · ${facility.totalUnits} units` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Right: status + tools + close */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {facility.status && <StatusBadge status={facility.status} />}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
            aria-label="Close facility detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Facility overview. Every tool now lives as a scope-aware route reached
          from the sidebar and command palette, scoped to the selected facility. */}
      <div
        className="overflow-y-auto overflow-x-hidden p-3 sm:p-5"
        style={{ minHeight: "calc(100vh - 16rem)" }}
      >
        <Suspense fallback={<TabLoadingFallback />}>
          <FacilityOverview facility={facility} adminKey={adminKey} onUpdate={onUpdate} />
        </Suspense>
      </div>
    </div>
  );
}

/* ================================================================
   Facility Card
   ================================================================ */

function FacilityCard({
  facility,
  onClick,
}: {
  facility: Facility;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 text-left transition-all hover:border-[var(--border-medium)] hover:bg-[var(--color-light-gray)]"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--color-dark)]">
            {facility.name}
          </h3>
          <p className="truncate text-xs text-[var(--color-mid-gray)]">
            {[facility.city, facility.state].filter(Boolean).join(", ") ||
              facility.address ||
              "No location"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-mid-gray)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-body-text)]" />
      </div>

      <div className="mb-3 flex items-center gap-3">
        {facility.status && <StatusBadge status={facility.status} />}
        {facility.googleRating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-[var(--color-body-text)]">
              {facility.googleRating?.toFixed(1)}
            </span>
            {facility.reviewCount !== undefined && (
              <span className="text-xs text-[var(--color-mid-gray)]">
                ({facility.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {facility.occupancy !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-mid-gray)]">Occupancy</span>
            <span className="font-medium text-[var(--color-body-text)]">
              {facility.occupancy}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-light-gray)]">
            <div
              className={`h-full rounded-full transition-all ${
                facility.occupancy >= 90
                  ? "bg-emerald-500"
                  : facility.occupancy >= 70
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(facility.occupancy, 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

/* ================================================================
   Main Facilities Page (inner component using searchParams)
   ================================================================ */

function FacilitiesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("facility");
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";
  const searchQuery = searchParams.get("q") || "";

  const {
    data: rawData,
    loading,
    error,
    refetch,
  } = useAdminFetch<{ facilities: Facility[] }>("/api/admin-facilities");

  const facilities = rawData?.facilities ?? null;

  const [localSearch, setLocalSearch] = useState(searchQuery);

  /* update URL params */
  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      router.push(pathname + "?" + params.toString(), { scroll: false });
    },
    [router, pathname, searchParams],
  );

  /* debounce search */
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setParam({ q: localSearch || null, facility: null });
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localSearch, searchQuery, setParam]);

  /* filtered facilities */
  const filtered = useMemo(() => {
    if (!facilities) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q) ||
        f.state?.toLowerCase().includes(q) ||
        f.status?.toLowerCase().includes(q),
    );
  }, [facilities, searchQuery]);

  const selectedFacility = useMemo(
    () => facilities?.find((f) => f.id === selectedId) || null,
    [facilities, selectedId],
  );

  // Forward legacy ?tab= deep links (and tab-rail clicks) to the new routes.
  useEffect(() => {
    if (selectedId && activeTab !== "overview" && TAB_REDIRECTS[activeTab]) {
      router.replace(`${TAB_REDIRECTS[activeTab]}?facility=${selectedId}`);
    }
  }, [selectedId, activeTab, router]);

  function handleSelectFacility(id: string) {
    setParam({ facility: id, tab: "overview" });
  }

  function handleCloseDetail() {
    setParam({ facility: null, tab: null });
  }

  /* legacy tool tab → forwarding to its new route; show a spinner meanwhile */
  if (selectedFacility && activeTab !== "overview" && TAB_REDIRECTS[activeTab]) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-4 w-4 animate-spin rounded-full"
          style={{ border: "1.5px solid var(--color-dark)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  /* if facility selected, show detail (overview) */
  if (selectedFacility) {
    return (
      <FacilityDetail
        facility={selectedFacility}
        onClose={handleCloseDetail}
        onUpdate={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* search/filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-mid-gray)]" />
          <input
            type="text"
            placeholder="Search facilities..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--burgundy)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--burgundy)]/50"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-[var(--color-mid-gray)]">
          {loading
            ? "Loading..."
            : `${filtered.length} facilit${filtered.length === 1 ? "y" : "ies"}`}
        </div>
      </div>

      {/* error */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* facility grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
            >
              <SkeletonBlock className="mb-3 h-5 w-3/4" />
              <SkeletonBlock className="mb-4 h-3 w-1/2" />
              <SkeletonBlock className="mb-2 h-5 w-16" />
              <SkeletonBlock className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            searchQuery
              ? `No facilities matching "${searchQuery}".`
              : "No facilities found. Add facilities to get started."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              onClick={() => handleSelectFacility(facility.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Page export with Suspense boundary for useSearchParams
   ================================================================ */

export default function FacilitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-[var(--color-light-gray)]" />
                <div className="mb-4 h-3 w-1/2 animate-pulse rounded bg-[var(--color-light-gray)]" />
                <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-light-gray)]" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <FacilitiesContent />
    </Suspense>
  );
}
