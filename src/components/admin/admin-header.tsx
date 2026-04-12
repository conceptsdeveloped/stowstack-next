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
import ThemeToggle from "@/components/theme-toggle";

const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/pipeline": "Pipeline",
  "/admin/kanban": "Kanban",
  "/admin/consumer-leads": "Consumer Leads",
  "/admin/recovery": "Recovery",
  "/admin/portfolio": "Portfolio",
  "/admin/facilities": "Facility Manager",
  "/admin/style-references": "Creative Library",
  "/admin/sequences": "Sequences",
  "/admin/insights": "Insights",
  "/admin/billing": "Billing",
  "/admin/activity": "Activity",
  "/admin/calls": "Call Tracking",
  "/admin/audits": "Diagnostics",
  "/admin/partners": "Partners",
  "/admin/settings": "Settings",
  "/admin/changelog": "Changelog",
  "/admin/campaigns": "Campaigns",
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
    a.download = `storageads-${segment}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 md:h-16 shrink-0 items-center gap-2 md:gap-3 border-b border-black/[0.08] bg-[#F9FAFB]/80 px-3 md:px-6 backdrop-blur-xl">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827] md:hidden shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-base md:text-lg font-semibold text-[#111827] truncate min-w-0">
        {getPageTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-0.5 md:gap-1 shrink-0">
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg p-1.5 md:p-2 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="hidden sm:block rounded-lg p-1.5 md:p-2 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
          aria-label="Export CSV"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="relative rounded-lg p-1.5 md:p-2 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] font-semibold text-[#111827]">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <span className="hidden sm:inline-block"><ThemeToggle /></span>

        <div className="ml-1 md:ml-2 h-6 w-px bg-black/[0.04]" />

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
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
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
