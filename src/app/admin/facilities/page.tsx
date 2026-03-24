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
  Bot,
  Building2,
  ChevronRight,
  Film,
  FileText,
  Globe,
  Image as ImageIcon,
  Sparkles,
  LayoutDashboard,
  Link2,
  Mail,
  Map,
  Megaphone,
  MessageSquare,
  Music2,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Star,
  TrendingUp,
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
const CreativeStudio = lazy(
  () => import("@/components/admin/facility-tabs/creative-studio")
);
const AdStudio = lazy(
  () => import("@/components/admin/facility-tabs/ad-studio")
);
const AdPublisher = lazy(
  () => import("@/components/admin/facility-tabs/ad-publisher")
);
const MediaLibrary = lazy(
  () => import("@/components/admin/facility-tabs/media-library")
);
const GoogleAdsLab = lazy(
  () => import("@/components/admin/facility-tabs/google-ads-lab")
);
const TikTokCreator = lazy(
  () => import("@/components/admin/facility-tabs/tiktok-creator")
);
const VideoGenerator = lazy(
  () => import("@/components/admin/facility-tabs/video-generator")
);
// ImageGenerator merged into AdStudio
// StyleReferences moved to /admin/style-references (global page)
const LandingPageBuilder = lazy(
  () => import("@/components/admin/facility-tabs/landing-page-builder")
);
const UTMLinks = lazy(
  () => import("@/components/admin/facility-tabs/utm-links")
);
const GBPFull = lazy(
  () => import("@/components/admin/facility-tabs/gbp-full")
);
const SocialCommandCenter = lazy(
  () => import("@/components/admin/facility-tabs/social-command-center")
);
const LeadNurtureEngine = lazy(
  () => import("@/components/admin/facility-tabs/lead-nurture-engine")
);
const OccupancyIntelligence = lazy(
  () => import("@/components/admin/facility-tabs/occupancy-intelligence")
);
const MarketIntelligence = lazy(
  () => import("@/components/admin/facility-tabs/market-intelligence")
);
const RevenueAnalytics = lazy(
  () => import("@/components/admin/facility-tabs/revenue-analytics")
);
const TenantManagement = lazy(
  () => import("@/components/admin/facility-tabs/tenant-management")
);
const PmsDashboard = lazy(
  () => import("@/components/admin/facility-tabs/pms-dashboard")
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

/* ================================================================
   Tab Definitions — 19 tabs matching original app
   ================================================================ */

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "creative-studio", label: "Creative Studio", icon: Palette },
  { key: "ad-studio", label: "Ad Studio", icon: Sparkles },
  { key: "ad-publisher", label: "Publish Ads", icon: Send },
  { key: "media-library", label: "Media Library", icon: ImageIcon },
  { key: "google-ads", label: "Google Ads Lab", icon: Search },
  { key: "tiktok", label: "TikTok Creator", icon: Music2 },
  { key: "video", label: "Video Generator", icon: Film },
  { key: "landing-pages", label: "Landing Pages", icon: FileText },
  { key: "utm-links", label: "UTM Links", icon: Link2 },
  { key: "gbp", label: "Google Business", icon: Globe },
  { key: "social", label: "Social Media", icon: Share2 },
  { key: "lead-nurture", label: "Lead Nurture", icon: Mail },
  { key: "occupancy", label: "Occupancy Intel", icon: Building2 },
  { key: "market-intel", label: "Market Intel", icon: Map },
  { key: "revenue", label: "Revenue Analytics", icon: BarChart3 },
  { key: "tenants", label: "Tenant CRM", icon: Users },
  { key: "pms", label: "PMS Data", icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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
    completed: "bg-[#3B82F6]/20 text-[#3B82F6]",
    answered: "bg-emerald-500/20 text-emerald-400",
    missed: "bg-red-500/20 text-red-400",
    voicemail: "bg-yellow-500/20 text-yellow-400",
  };
  const cls = colors[s] || "bg-black/[0.04] text-[#6B7280]";
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
      className={`animate-pulse rounded bg-black/[0.04] ${className || "h-4 w-full"}`}
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
    <div className="rounded-xl border border-black/[0.08] bg-white py-12 text-center">
      <p className="text-sm text-[#9CA3AF]">{message}</p>
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
   Tab Content Renderer
   ================================================================ */

function TabContent({
  activeTab,
  facility,
  adminKey,
  onUpdate,
}: {
  activeTab: TabKey;
  facility: Facility;
  adminKey: string;
  onUpdate: () => void;
}) {
  const commonProps = { facilityId: facility.id, adminKey };

  return (
    <Suspense fallback={<TabLoadingFallback />}>
      {activeTab === "overview" && (
        <FacilityOverview
          facility={facility}
          adminKey={adminKey}
          onUpdate={onUpdate}
        />
      )}
      {activeTab === "creative-studio" && <CreativeStudio {...commonProps} />}
      {activeTab === "ad-studio" && <AdStudio {...commonProps} />}
      {activeTab === "ad-publisher" && <AdPublisher {...commonProps} />}
      {activeTab === "media-library" && <MediaLibrary {...commonProps} />}
      {activeTab === "google-ads" && <GoogleAdsLab {...commonProps} />}
      {activeTab === "tiktok" && <TikTokCreator {...commonProps} />}
      {activeTab === "video" && <VideoGenerator {...commonProps} />}
      {/* StyleReferences is now a global admin page at /admin/style-references */}
      {activeTab === "landing-pages" && <LandingPageBuilder {...commonProps} />}
      {activeTab === "utm-links" && <UTMLinks {...commonProps} />}
      {activeTab === "gbp" && <GBPFull {...commonProps} />}
      {activeTab === "social" && <SocialCommandCenter {...commonProps} />}
      {activeTab === "lead-nurture" && <LeadNurtureEngine {...commonProps} />}
      {activeTab === "occupancy" && <OccupancyIntelligence {...commonProps} />}
      {activeTab === "market-intel" && <MarketIntelligence {...commonProps} />}
      {activeTab === "revenue" && <RevenueAnalytics {...commonProps} />}
      {activeTab === "tenants" && <TenantManagement {...commonProps} />}
      {activeTab === "pms" && <PmsDashboard {...commonProps} />}
    </Suspense>
  );
}

/* ================================================================
   Facility Detail Panel
   ================================================================ */

function FacilityDetail({
  facility,
  activeTab,
  onTabChange,
  onClose,
  onUpdate,
}: {
  facility: Facility;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    setAdminKey(localStorage.getItem("stowstack_admin_key") || "");
  }, []);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!tabScrollRef.current) return;
    const activeBtn = tabScrollRef.current.querySelector(
      `[data-tab="${activeTab}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between border-b border-black/[0.08] px-3 py-3 sm:px-5 sm:py-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-[#111827] truncate">
              {facility.name}
            </h2>
            <p className="text-xs text-[#9CA3AF] truncate">
              {[facility.city, facility.state].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {facility.status && <StatusBadge status={facility.status} />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* sub-tab navigation — horizontally scrollable */}
      <div
        ref={tabScrollRef}
        className="flex gap-0.5 overflow-x-auto border-b border-black/[0.08] px-2 sm:px-3 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              data-tab={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex shrink-0 items-center gap-1 sm:gap-1.5 border-b-2 px-2 sm:px-2.5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium transition-colors ${
                isActive
                  ? "border-[#3B82F6] text-[#3B82F6]"
                  : "border-transparent text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* tab content */}
      <div className="p-3 sm:p-5 overflow-x-hidden">
        <TabContent
          activeTab={activeTab}
          facility={facility}
          adminKey={adminKey}
          onUpdate={onUpdate}
        />
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
      className="group w-full rounded-xl border border-black/[0.08] bg-white p-4 text-left transition-all hover:border-black/[0.12] hover:bg-[#F3F4F6]"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#111827]">
            {facility.name}
          </h3>
          <p className="truncate text-xs text-[#9CA3AF]">
            {[facility.city, facility.state].filter(Boolean).join(", ") ||
              facility.address ||
              "No location"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6B7280]" />
      </div>

      <div className="mb-3 flex items-center gap-3">
        {facility.status && <StatusBadge status={facility.status} />}
        {facility.googleRating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-[#6B7280]">
              {facility.googleRating?.toFixed(1)}
            </span>
            {facility.reviewCount !== undefined && (
              <span className="text-xs text-[#9CA3AF]">
                ({facility.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {facility.occupancy !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">Occupancy</span>
            <span className="font-medium text-[#6B7280]">
              {facility.occupancy}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.04]">
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

  function handleSelectFacility(id: string) {
    setParam({ facility: id, tab: "overview" });
  }

  function handleCloseDetail() {
    setParam({ facility: null, tab: null });
  }

  function handleTabChange(tab: TabKey) {
    setParam({ tab });
  }

  /* if facility selected, show detail */
  if (selectedFacility) {
    return (
      <div className="p-4 md:p-6">
        <FacilityDetail
          facility={selectedFacility}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onClose={handleCloseDetail}
          onUpdate={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* search/filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search facilities..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-lg border border-black/[0.08] bg-white py-2 pl-9 pr-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-[#3B82F6]/50 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/50"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-[#9CA3AF]">
          {loading
            ? "Loading..."
            : `${filtered.length} facilit${filtered.length === 1 ? "y" : "ies"}`}
        </div>
      </div>

      {/* error */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* facility grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-black/[0.08] bg-white p-4"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="space-y-6 p-4 md:p-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-black/[0.04]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/[0.08] bg-white p-4"
              >
                <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-black/[0.04]" />
                <div className="mb-4 h-3 w-1/2 animate-pulse rounded bg-black/[0.04]" />
                <div className="h-5 w-16 animate-pulse rounded bg-black/[0.04]" />
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
