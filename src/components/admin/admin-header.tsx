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

  const iconBtnStyle = {
    color: '#A3A3A3',
    borderRadius: '4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 120ms ease',
    padding: '6px',
  };

  return (
    <header
      className="safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 px-4 md:px-5"
      style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        className="md:hidden shrink-0"
        style={iconBtnStyle}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      <h1 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 500, letterSpacing: '-0.01em', color: '#1A1A1A' }}>
        {getPageTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={handleRefresh}
          className="hidden sm:block"
          style={iconBtnStyle}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="hidden sm:block"
          style={iconBtnStyle}
          aria-label="Export CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="relative"
          style={iconBtnStyle}
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          {notificationCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5"
              style={{
                background: '#1A1A1A',
                color: '#FFFFFF',
                fontFamily: 'var(--font)',
                fontSize: '9px',
                fontWeight: 500,
              }}
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="ml-2 h-5 w-px" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {isSignedIn ? (
          <div className="ml-2">
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
            className="flex items-center gap-2 ml-2"
            style={iconBtnStyle}
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
