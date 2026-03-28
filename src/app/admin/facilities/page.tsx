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
const CallTracking = lazy(
  () => import("@/components/admin/facility-tabs/call-tracking")
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
   Tab Definitions — Grouped
   ================================================================ */

interface TabDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TabGroup {
  title: string | null; // null = no header (overview)
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    title: null,
    tabs: [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    title: "AD STUDIO",
    tabs: [
      { key: "creative-studio", label: "Creative Studio", icon: Palette },
      { key: "ad-studio", label: "Ad Generator", icon: Sparkles },
      { key: "ad-publisher", label: "Publish Ads", icon: Send },
      { key: "google-ads", label: "Google Ads Lab", icon: Search },
      { key: "tiktok", label: "TikTok Creator", icon: Music2 },
      { key: "video", label: "Video Generator", icon: Film },
      { key: "media-library", label: "Media Library", icon: ImageIcon },
    ],
  },
  {
    title: "MARKETING",
    tabs: [
      { key: "landing-pages", label: "Landing Pages", icon: FileText },
      { key: "utm-links", label: "UTM Links", icon: Link2 },
      { key: "gbp", label: "Google Business", icon: Globe },
      { key: "social", label: "Social Media", icon: Share2 },
      { key: "lead-nurture", label: "Lead Nurture", icon: Mail },
    ],
  },
  {
    title: "INTELLIGENCE",
    tabs: [
      { key: "occupancy", label: "Occupancy Intel", icon: Building2 },
      { key: "market-intel", label: "Market Intel", icon: Map },
      { key: "revenue", label: "Revenue Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "OPERATIONS",
    tabs: [
      { key: "tenants", label: "Tenant CRM", icon: Users },
      { key: "pms", label: "PMS Data", icon: FileText },
      { key: "call-tracking", label: "Call Tracking", icon: Phone },
    ],
  },
];

// Flat list for lookup
const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs);
type TabKey = string;

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
    completed: "bg-[var(--color-gold)]/20 text-[var(--color-gold)]",
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
  const commonProps = { facilityId: facility.id, adminKey, facilityName: facility.name };

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
      {activeTab === "call-tracking" && <CallTracking {...commonProps} />}
    </Suspense>
  );
}

/* ================================================================
   Vertical Tab Sidebar — all tabs visible, grouped with labels

   Access methods (mobile/tablet < lg):
   1. Gold "Tools" button with count badge in header
   2. Tappable breadcrumb pill showing current group / tool
   3. Left-edge hover zone → gold peek tab → click to open
   4. Touch swipe right from left edge of content area
   5. Swipe left on open drawer to close
   6. Keyboard: [ to toggle
   7. Click overlay backdrop to close
   8. X button in drawer header to close
   9. Escape key to close
   ================================================================ */

const TOTAL_TOOLS = TAB_GROUPS.reduce((sum, g) => sum + g.tabs.length, 0);

function VerticalTabSidebar({
  activeTab,
  onTabChange,
  mobileOpen,
  onMobileClose,
  onMobileOpen,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [edgeHover, setEdgeHover] = useState(false);

  // Scroll active tab into view on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
    }
  }, []);

  // Scroll active tab into view when drawer opens
  useEffect(() => {
    if (activeRef.current && mobileOpen) {
      const timer = setTimeout(() => {
        activeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [mobileOpen]);

  // Focus trap: when drawer opens, trap Tab focus inside it
  useEffect(() => {
    if (!mobileOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Focus the first button on open
    first.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    drawer.addEventListener("keydown", handleTab);
    return () => drawer.removeEventListener("keydown", handleTab);
  }, [mobileOpen]);

  // Keyboard: [ to toggle, Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "Escape" && mobileOpen) {
        e.preventDefault();
        onMobileClose();
        return;
      }

      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        // Only toggle on viewports where the drawer is used (< lg = 1024px)
        if (window.innerWidth >= 1024) return;
        e.preventDefault();
        if (mobileOpen) onMobileClose();
        else onMobileOpen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose, onMobileOpen]);

  // Touch: swipe right from left 40px of the content area to open,
  // swipe left on the open drawer to close
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let direction: "open" | "close" | null = null;

    function handleTouchStart(e: TouchEvent) {
      // Skip on desktop where sidebar is permanent
      if (window.innerWidth >= 1024) return;
      const touch = e.touches[0];
      if (!mobileOpen && touch.clientX < 40) {
        // Near left edge — track for open swipe
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
        direction = "open";
      } else if (mobileOpen && touch.clientX < 240) {
        // Inside open drawer — track for close swipe
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
        direction = "close";
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!tracking || !direction) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      if (direction === "open" && dx > 50 && dy < 40) {
        tracking = false;
        onMobileOpen();
      } else if (direction === "close" && dx < -50 && dy < 40) {
        tracking = false;
        onMobileClose();
      }
    }

    function handleTouchEnd() {
      tracking = false;
      direction = null;
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mobileOpen, onMobileOpen, onMobileClose]);

  const sidebarContent = (
    <nav
      className="flex h-full flex-col overflow-y-auto py-2"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-light-gray) transparent" }}
    >
      {TAB_GROUPS.map((group) => (
        <div key={group.title ?? "overview"} className="mb-1">
          {group.title && (
            <p className="mb-0.5 mt-4 px-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-mid-gray)]">
              {group.title}
            </p>
          )}
          <ul className="space-y-px px-2">
            {group.tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <li key={tab.key}>
                  <button
                    ref={isActive ? activeRef : undefined}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.key);
                      onMobileClose();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)] shadow-sm shadow-[var(--color-gold)]/5"
                        : "text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        isActive ? "text-[var(--color-gold)]" : "text-[var(--color-mid-gray)]"
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-gold)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Keyboard shortcut hint — desktop only */}
      <div className="mt-auto hidden border-t border-[var(--border-subtle)] px-4 py-3 lg:block">
        <p className="text-[10px] text-[var(--color-mid-gray)]">
          Press <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-1 py-0.5 font-mono text-[10px]">[</kbd> to toggle
        </p>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile/tablet overlay — fades in */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Mobile/tablet slide-out drawer */}
      <aside
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Facility tools navigation"
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-dark)]">
              Tools
            </span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-gold)]/15 px-1 text-[10px] font-semibold text-[var(--color-gold)]">
              {TOTAL_TOOLS}
            </span>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-[var(--color-mid-gray)] transition-colors hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
            aria-label="Close tools menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Left-edge peek zone — positioned relative to the sidebar slot, not fixed to viewport.
           Uses absolute positioning within the flex layout so it doesn't overlap the admin sidebar. */}
      {!mobileOpen && (
        <div
          className="absolute left-0 top-0 bottom-0 z-30 w-4 cursor-pointer lg:hidden"
          onMouseEnter={() => setEdgeHover(true)}
          onMouseLeave={() => setEdgeHover(false)}
          onClick={onMobileOpen}
          aria-hidden="true"
        >
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out ${
              edgeHover ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-1 scale-95"
            }`}
          >
            <div className="flex h-20 w-7 items-center justify-center rounded-r-xl bg-[var(--color-gold)] shadow-lg">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — always visible, permanent */}
      <div className="hidden w-52 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--color-light-gray)]/30 lg:block">
        {sidebarContent}
      </div>
    </>
  );
}

/* ================================================================
   Facility Detail Panel — vertical sidebar layout
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
  const [adminKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("storageads_admin_key") || "";
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [mobileNavOpen]);

  const activeTabDef = ALL_TABS.find((t) => t.key === activeTab);
  const activeGroupTitle = TAB_GROUPS.find((g) =>
    g.tabs.some((t) => t.key === activeTab)
  )?.title;

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
          {/* Status badge — hide below 480px to save header space, shown in breadcrumb instead */}
          <div className="hidden min-[480px]:block">
            {facility.status && <StatusBadge status={facility.status} />}
          </div>

          {/* Gold "Tools" button with count — mobile/tablet only */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-gold)] transition-all hover:bg-[var(--color-gold)]/20 active:scale-95 lg:hidden"
            aria-label="Open tools menu"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Tools</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-gold)]/20 px-1 text-[10px] font-semibold">
              {TOTAL_TOOLS}
            </span>
          </button>

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

      {/* Mobile/tablet: current tool breadcrumb — tappable, opens tools menu */}
      <div className="flex items-center border-b border-[var(--border-subtle)] bg-[var(--color-light-gray)]/30 px-4 py-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--color-gold)]/10"
        >
          {activeTabDef && (
            <activeTabDef.icon className="h-3.5 w-3.5 text-[var(--color-gold)]" />
          )}
          {activeGroupTitle ? (
            <>
              <span className="text-[11px] font-medium text-[var(--color-mid-gray)]">
                {activeGroupTitle}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-mid-gray)]" />
              <span className="text-[13px] font-semibold text-[var(--color-dark)]">
                {activeTabDef?.label}
              </span>
            </>
          ) : (
            <span className="text-[13px] font-semibold text-[var(--color-dark)]">
              {activeTabDef?.label ?? "Overview"}
            </span>
          )}
          <ChevronRight className="ml-0.5 h-3 w-3 text-[var(--color-mid-gray)] opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </button>

        {/* Status badge on small screens — shows here instead of header */}
        <div className="ml-auto min-[480px]:hidden">
          {facility.status && <StatusBadge status={facility.status} />}
        </div>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="relative flex" style={{ minHeight: "calc(100vh - 16rem)" }}>
        <VerticalTabSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          onMobileOpen={() => setMobileNavOpen(true)}
        />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5">
          <TabContent
            activeTab={activeTab}
            facility={facility}
            adminKey={adminKey}
            onUpdate={onUpdate}
          />
        </div>
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
      <FacilityDetail
        facility={selectedFacility}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/50"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
