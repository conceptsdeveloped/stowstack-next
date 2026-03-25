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
    <header
      className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 px-4 md:px-5"
      style={{ background: "var(--admin-chrome)", fontFamily: "var(--admin-font)" }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-1.5 transition-colors md:hidden"
        style={{ color: "var(--admin-text-on-dark-muted)" }}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-sm font-medium" style={{ color: "var(--admin-text-on-dark)" }}>
        {getPageTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-md p-1.5 transition-colors"
          style={{ color: "var(--admin-text-on-dark-muted)" }}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="rounded-md p-1.5 transition-colors"
          style={{ color: "var(--admin-text-on-dark-muted)" }}
          aria-label="Export CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="relative rounded-md p-1.5 transition-colors"
          style={{ color: "var(--admin-text-on-dark-muted)" }}
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          {notificationCount > 0 && (
            <span
              className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: "var(--admin-accent-amber)", color: "var(--admin-text)" }}
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <ThemeToggle />

        <div className="ml-1.5 h-5 w-px" style={{ background: "var(--admin-border-on-dark)" }} />

        {isSignedIn ? (
          <div className="ml-1.5">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7",
                },
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors"
            style={{ color: "var(--admin-text-on-dark-muted)" }}
            aria-label="Logout"
          >
            <User className="h-3.5 w-3.5" />
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
