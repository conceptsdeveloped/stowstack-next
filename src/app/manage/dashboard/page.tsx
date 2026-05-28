"use client";

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LayoutDashboard,
  Palette,
  Sparkles,
  Send,
  Search,
  Music2,
  Film,
  Image as ImageIcon,
  GitBranch,
  FileText,
  Link2,
  Globe,
  Share2,
  Mail,
  Building2,
  Map,
  BarChart3,
  Users,
  Phone,
} from "lucide-react";
import type { FacilityProp } from "@/components/admin/facility-tabs/facility-overview/types";
import { getManageToken, clearManageToken } from "@/lib/facility-auth";

/* Reuse the exact same tool components the admin facility manager uses. They
   accept an `adminKey` prop and fetch via authHeaders(); passing "" makes them
   send the owner's manage token instead of an admin key. */
const FacilityOverview = lazy(() => import("@/components/admin/facility-tabs/facility-overview"));
const CreativeStudio = lazy(() => import("@/components/admin/facility-tabs/creative-studio"));
const AdStudio = lazy(() => import("@/components/admin/facility-tabs/ad-studio"));
const AdPublisher = lazy(() => import("@/components/admin/facility-tabs/ad-publisher"));
const MediaLibrary = lazy(() => import("@/components/admin/facility-tabs/media-library"));
const GoogleAdsLab = lazy(() => import("@/components/admin/facility-tabs/google-ads-lab"));
const TikTokCreator = lazy(() => import("@/components/admin/facility-tabs/tiktok-creator"));
const VideoGenerator = lazy(() => import("@/components/admin/facility-tabs/video-generator"));
const LandingPageBuilder = lazy(() => import("@/components/admin/facility-tabs/landing-page-builder"));
const UTMLinks = lazy(() => import("@/components/admin/facility-tabs/utm-links"));
const GBPFull = lazy(() => import("@/components/admin/facility-tabs/gbp-full"));
const SocialCommandCenter = lazy(() => import("@/components/admin/facility-tabs/social-command-center"));
const LeadNurtureEngine = lazy(() => import("@/components/admin/facility-tabs/lead-nurture-engine"));
const OccupancyIntelligence = lazy(() => import("@/components/admin/facility-tabs/occupancy-intelligence"));
const MarketIntelligence = lazy(() => import("@/components/admin/facility-tabs/market-intelligence"));
const RevenueAnalytics = lazy(() => import("@/components/admin/facility-tabs/revenue-analytics"));
const TenantManagement = lazy(() => import("@/components/admin/facility-tabs/tenant-management"));
const PmsDashboard = lazy(() => import("@/components/admin/facility-tabs/pms-dashboard"));
const CallTracking = lazy(() => import("@/components/admin/facility-tabs/call-tracking"));
const FacilityFunnels = lazy(() => import("@/components/admin/facility-tabs/facility-funnels"));

type TabKey = string;
type Tab = { key: TabKey; label: string; icon: ComponentType<{ className?: string }> };
type TabGroup = { title: string | null; tabs: Tab[] };

const TAB_GROUPS: TabGroup[] = [
  { title: null, tabs: [{ key: "overview", label: "Overview", icon: LayoutDashboard }] },
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
      { key: "funnels", label: "Funnels", icon: GitBranch },
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

function TabContent({
  activeTab,
  facility,
  onUpdate,
}: {
  activeTab: TabKey;
  facility: FacilityProp;
  onUpdate: () => void;
}) {
  // adminKey="" → owner context; components fall back to the manage token.
  const adminKey = "";
  const commonProps = { facilityId: facility.id, adminKey, facilityName: facility.name };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-[var(--color-body-text,#6a6560)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tool…
        </div>
      }
    >
      {activeTab === "overview" && (
        <FacilityOverview facility={facility} adminKey={adminKey} onUpdate={onUpdate} />
      )}
      {activeTab === "creative-studio" && <CreativeStudio {...commonProps} />}
      {activeTab === "ad-studio" && <AdStudio {...commonProps} />}
      {activeTab === "ad-publisher" && <AdPublisher {...commonProps} />}
      {activeTab === "media-library" && <MediaLibrary {...commonProps} />}
      {activeTab === "google-ads" && <GoogleAdsLab {...commonProps} />}
      {activeTab === "tiktok" && <TikTokCreator {...commonProps} />}
      {activeTab === "video" && <VideoGenerator {...commonProps} />}
      {activeTab === "funnels" && <FacilityFunnels {...commonProps} />}
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

export default function ManageDashboardPage() {
  const router = useRouter();
  const [facility, setFacility] = useState<FacilityProp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const loadSession = useCallback(async () => {
    const token = getManageToken();
    if (!token) {
      router.replace("/manage");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manage/session", {
        headers: { "x-manage-token": token },
      });
      if (res.status === 401) {
        clearManageToken();
        router.replace("/manage");
        return;
      }
      const data = await res.json();
      const first = data?.facilities?.[0] as FacilityProp | undefined;
      if (!first) {
        setError("We couldn't load your facility. Try signing in again.");
        return;
      }
      setFacility(first);
    } catch {
      setError("Failed to load your workspace.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function exit() {
    clearManageToken();
    router.replace("/manage");
  }

  return (
    <div
      style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}
      className="min-h-screen bg-[var(--color-light,#faf9f5)] text-[var(--color-dark,#141413)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-light-gray,#e8e6dc)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold lowercase tracking-tight">
            storageads
          </div>
          {facility && (
            <>
              <span className="text-[var(--color-mid-gray,#b0aea5)]">/</span>
              <span className="text-sm font-medium">{facility.name}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={exit}
          className="text-sm font-medium text-[var(--color-body-text,#6a6560)] hover:text-[var(--color-dark,#141413)]"
        >
          Exit
        </button>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-24 text-[var(--color-body-text,#6a6560)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your facility…
        </div>
      )}

      {!loading && error && (
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-md border border-[var(--color-red,#B04A3A)] bg-[var(--color-red,#B04A3A)]/10 px-4 py-3 text-sm text-[var(--color-red,#B04A3A)]">
            {error}
          </div>
        </div>
      )}

      {!loading && !error && facility && (
        <div className="flex">
          {/* Tab sidebar */}
          <nav className="w-56 shrink-0 border-r border-[var(--color-light-gray,#e8e6dc)] px-3 py-5 overflow-y-auto">
            {TAB_GROUPS.map((group, gi) => (
              <div key={gi} className="mb-5">
                {group.title && (
                  <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-[var(--color-mid-gray,#b0aea5)]">
                    {group.title}
                  </div>
                )}
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                        active
                          ? "bg-[var(--color-dark,#141413)] text-[var(--color-light,#faf9f5)] font-semibold"
                          : "text-[var(--color-body-text,#6a6560)] hover:bg-[var(--color-light-gray,#e8e6dc)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Tool content */}
          <main className="min-w-0 flex-1 px-6 py-6">
            <TabContent activeTab={activeTab} facility={facility} onUpdate={loadSession} />
          </main>
        </div>
      )}
    </div>
  );
}
