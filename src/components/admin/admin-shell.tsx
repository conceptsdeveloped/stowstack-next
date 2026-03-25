"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  CreditCard,
  FileText,
  Flame,
  Inbox,
  Kanban,
  Layout,
  Lock,
  Mail,
  Megaphone,
  Phone,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { AdminProvider, STORAGE_KEY } from "@/lib/admin-context";
import { AdminHeader } from "./admin-header";
import { useClerkRole } from "@/hooks/use-clerk-role";
import { VA_RESTRICTED_PATHS } from "@/lib/clerk-roles";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "LEADS",
    items: [
      { label: "Pipeline", href: "/admin", icon: Flame },
      { label: "Kanban", href: "/admin/kanban", icon: Kanban },
      { label: "Consumer Leads", href: "/admin/consumer-leads", icon: Inbox },
      { label: "Recovery", href: "/admin/recovery", icon: Search },
    ],
  },
  {
    title: "FACILITIES",
    items: [
      { label: "Facility Pipeline", href: "/admin/pipeline", icon: Target },
      { label: "Portfolio", href: "/admin/portfolio", icon: Building2 },
      { label: "Facility Manager", href: "/admin/facilities", icon: Layout },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Creative Library", href: "/admin/style-references", icon: Target },
      { label: "Sequences", href: "/admin/sequences", icon: Mail },
      { label: "Insights", href: "/admin/insights", icon: BarChart3 },
    ],
  },
  {
    title: "REVENUE",
    items: [
      { label: "Billing", href: "/admin/billing", icon: CreditCard },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Activity", href: "/admin/activity", icon: Activity },
      { label: "Calls", href: "/admin/calls", icon: Phone },
      { label: "Diagnostics", href: "/admin/audits", icon: ShieldCheck },
      { label: "Partners", href: "/admin/partners", icon: Users },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Changelog", href: "/admin/changelog", icon: BookOpen },
    ],
  },
];

function LoginGate({ onAuthenticated }: { onAuthenticated: (key: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"clerk" | "key">("clerk");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-settings", {
        headers: { "X-Admin-Key": password },
      });

      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, password);
        onAuthenticated(password);
      } else if (res.status === 401) {
        setError("Invalid admin key");
      } else {
        setError("Invalid admin key");
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center" style={{ background: "var(--admin-bg)", fontFamily: "var(--admin-font)" }}>
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: "var(--admin-card)" }}>
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-semibold" style={{ color: "var(--admin-text)" }}>StorageAds</h1>
          <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>Admin Dashboard</p>
        </div>

        {mode === "clerk" ? (
          <>
            <SignInButton mode="modal">
              <button
                type="button"
                className="mb-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "var(--admin-accent-amber)", color: "var(--admin-text)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--admin-accent-amber-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--admin-accent-amber)"}
              >
                Sign In with Clerk
              </button>
            </SignInButton>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid var(--admin-border)" }} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3" style={{ background: "var(--admin-card)", color: "var(--admin-text-muted)" }}>or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode("key")}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--admin-border)", color: "var(--admin-text-secondary)", background: "transparent" }}
            >
              Use Admin Key
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="admin-key" className="mb-2 block text-sm font-medium" style={{ color: "var(--admin-text-secondary)" }}>
                Admin Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--admin-text-muted)" }} />
                <input
                  id="admin-key"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin key"
                  autoFocus
                  className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-colors"
                  style={{ background: "var(--admin-input)", border: "1px solid var(--admin-border)", color: "var(--admin-text)" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--admin-accent-amber)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--admin-border)"}
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm" style={{ color: "#E07830" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="mb-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: "var(--admin-accent-amber)", color: "var(--admin-text)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--admin-accent-amber-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--admin-accent-amber)"}
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setMode("clerk")}
              className="w-full text-center text-xs transition-colors"
              style={{ color: "var(--admin-text-muted)" }}
            >
              ← Back to sign in options
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
  isVA,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isVA: boolean;
}) {
  const pathname = usePathname();

  // Filter nav items for VA role (no billing, settings, partners)
  const filteredGroups = isVA
    ? NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !VA_RESTRICTED_PATHS.includes(item.href)
        ),
      })).filter((group) => group.items.length > 0)
    : NAV_GROUPS;

  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ fontFamily: "var(--admin-font)" }}>
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4" style={{ borderBottom: "1px solid var(--admin-border-on-dark)" }}>
        <Link
          href="/"
          className={`text-sm font-semibold tracking-wide transition-opacity ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
          style={{ color: "var(--admin-text-on-dark)" }}
        >
          <span>storage</span><span style={{ color: "var(--admin-accent-amber)" }}>ads</span>
        </Link>
        {!collapsed && (
          <Link
            href="/"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ color: "var(--admin-accent-amber)" }}
          >
            <Zap className="h-4 w-4" />
          </Link>
        )}
        {collapsed && (
          <Link
            href="/"
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-md"
            style={{ color: "var(--admin-accent-amber)" }}
          >
            <Zap className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--admin-text-on-dark-muted)" }}>
                {group.title}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${collapsed ? "justify-center" : ""}`}
                      style={{
                        background: isActive ? "var(--admin-sidebar-active)" : "transparent",
                        color: isActive ? "var(--admin-text-on-dark)" : "var(--admin-text-on-dark-muted)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <span style={{ color: isActive ? "var(--admin-accent-amber)" : undefined }}>
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden shrink-0 p-2 md:block" style={{ borderTop: "1px solid var(--admin-border-on-dark)" }}>
        <button
          type="button"
          onClick={() => onCollapse(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-1.5 transition-colors"
          style={{ color: "var(--admin-text-on-dark-muted)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--admin-sidebar)" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 transition-all duration-200 md:block ${
          collapsed ? "w-14" : "w-60"
        }`}
        style={{ background: "var(--admin-sidebar)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Clerk auth state
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { isVA, canAccessAdmin } = useClerkRole();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAdminKey(stored);
    }
    setChecked(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminKey(null);
  }, []);

  // Wait for both localStorage check and Clerk to load
  if (!checked || !clerkLoaded) {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center" style={{ background: "var(--admin-bg)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--admin-accent-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Authenticated if: admin key is set OR Clerk user is signed in with admin/VA role
  const isAuthenticated = adminKey !== null || (isSignedIn && canAccessAdmin);

  // If Clerk user is signed in but has wrong role, show access denied
  if (isSignedIn && !canAccessAdmin && !adminKey) {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center" style={{ background: "var(--admin-bg)", fontFamily: "var(--admin-font)" }}>
        <div className="w-full max-w-sm rounded-xl p-8 text-center" style={{ background: "var(--admin-card)" }}>
          <ShieldCheck className="mx-auto mb-4 h-12 w-12" style={{ color: "var(--admin-accent-orange)" }} />
          <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--admin-text)" }}>Access Denied</h2>
          <p className="mb-6 text-sm" style={{ color: "var(--admin-text-secondary)" }}>
            Your account ({user?.primaryEmailAddress?.emailAddress}) does not have admin access.
            Contact your administrator to request the appropriate role.
          </p>
          <UserButton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate onAuthenticated={setAdminKey} />;
  }

  return (
    <AdminProvider initialKey={adminKey}>
      <div className="admin-theme flex h-screen overflow-hidden" style={{ background: "var(--admin-bg)", fontFamily: "var(--admin-font)" }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          isVA={isVA}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AdminHeader onToggleSidebar={() => setMobileOpen((v) => !v)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
