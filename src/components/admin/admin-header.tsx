"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Download,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useAdmin } from "@/lib/admin-context";
import { findRouteMeta } from "@/lib/admin-nav";
import { FacilitySwitcher } from "./facility-switcher";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();
  const route = findRouteMeta(pathname);
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
    color: 'var(--ink3)',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 120ms ease',
    padding: '10px',
    minWidth: '40px',
    minHeight: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <header
      className="safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 px-4 md:px-5"
      style={{ background: 'var(--bg)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
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

      {/* Breadcrumb: section › page. The section eyebrow tells you where in the
          spine you are without opening the sidebar. */}
      <nav className="flex min-w-0 items-center gap-2" aria-label="Breadcrumb">
        {route.group && (
          <>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: 'var(--font)',
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--ink3)',
                whiteSpace: 'nowrap',
              }}
            >
              {route.group}
            </span>
            <span className="hidden sm:inline" style={{ color: 'var(--ink3)', fontSize: '12px' }} aria-hidden>
              /
            </span>
          </>
        )}
        <h1 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          {route.title}
        </h1>
      </nav>

      {route.scoped ? (
        /* Scope-aware page: the active facility is part of the page's identity,
           so surface it as a breadcrumb-level switcher on every screen size.
           This is the persistent "which facility am I in" indicator and the
           fastest way to switch right where you're working. */
        <>
          <span style={{ color: 'var(--ink3)', fontSize: '12px' }} aria-hidden>
            ·
          </span>
          <span className="min-w-0">
            <FacilitySwitcher variant="compact" />
          </span>
        </>
      ) : (
        /* Portfolio/global page: the sidebar switcher governs scope, but it is
           behind a drawer on mobile — keep a compact control reachable there. */
        <span className="md:hidden">
          <FacilitySwitcher variant="compact" />
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("admin:open-palette"))}
          className="hidden items-center gap-2 lg:flex"
          style={{ fontFamily: 'var(--font)', fontSize: '12px', color: 'var(--ink3)', background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', width: '190px' }}
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          <span style={{ fontSize: '10px', fontWeight: 600, border: '1px solid var(--bdr-strong)', borderRadius: '4px', padding: '0 5px', color: 'var(--ink2)' }}>⌘K</span>
        </button>
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
                background: 'var(--ink)',
                color: 'var(--bg)',
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
