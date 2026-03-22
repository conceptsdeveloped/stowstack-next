"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Download,
  LogOut,
  Menu,
  RefreshCw,
  User,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useAdmin } from "@/lib/admin-context";

const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/pipeline": "Pipeline",
  "/admin/kanban": "Kanban",
  "/admin/inbound-leads": "Inbound Leads",
  "/admin/campaign-alerts": "Campaign Alerts",
  "/admin/portfolio": "Portfolio",
  "/admin/facility-manager": "Facility Manager",
  "/admin/facilities": "Facilities",
  "/admin/spend-optimizer": "Spend Optimizer",
  "/admin/email-sequences": "Email Sequences",
  "/admin/attribution": "Attribution",
  "/admin/recovery": "Recovery",
  "/admin/insights": "Insights",
  "/admin/billing": "Billing",
  "/admin/upsell": "Upsell",
  "/admin/activity-log": "Activity Log",
  "/admin/call-tracking": "Call Tracking",
  "/admin/audits": "Audits",
  "/admin/partners": "Partners",
  "/admin/settings": "Settings",
  "/admin/changelog": "Changelog",
};

function getPageTitle(pathname: string): string {
  return ROUTE_TITLES[pathname] ?? "Dashboard";
}

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();
  const { adminKey, logout, refreshData } = useAdmin();
  const { isSignedIn } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!adminKey) return;

    let cancelled = false;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "X-Admin-Key": adminKey! },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setNotificationCount(
              Array.isArray(data) ? data.filter((n: { read?: boolean }) => !n.read).length : 0,
            );
          }
        }
      } catch {
        // Notifications endpoint may not exist yet
      }
    }

    fetchNotifications();
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  function handleRefresh() {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  }

  function handleExport() {
    const segment = pathname.replace("/admin", "").replace(/^\//, "") || "dashboard";
    const blob = new Blob([""], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stowstack-${segment}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0A0A0A]/80 px-4 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7] md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-[#F5F5F7]">
        {getPageTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg p-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7]"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg p-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7]"
          aria-label="Export CSV"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="relative rounded-lg p-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="ml-2 h-6 w-px bg-white/[0.06]" />

        {isSignedIn ? (
          <div className="ml-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7]"
            aria-label="Logout"
          >
            <User className="h-4 w-4" />
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
