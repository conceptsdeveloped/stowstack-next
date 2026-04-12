"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  CreditCard,
  Flame,
  Inbox,
  Kanban,
  Layout,
  Lock,
  Mail,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Zap,
  FileUp,
} from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { AdminProvider, STORAGE_KEY } from "@/lib/admin-context";
import { AdminHeader } from "./admin-header";
import { ColorCycler } from "./color-cycler";
import { useClerkRole } from "@/hooks/use-clerk-role";
import { VA_RESTRICTED_PATHS } from "@/lib/clerk-roles";
import { haptic } from "@/lib/haptics";

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
      { label: "PMS Queue", href: "/admin/pms-queue", icon: FileUp },
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
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-[#F9FAFB] p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-semibold text-[#111827]">
            <span className="text-[var(--color-dark)]">storage</span>
            <span className="text-[var(--color-gold)]">ads</span>
          </h1>
          <p className="text-sm text-[#9CA3AF]">Admin Dashboard</p>
        </div>

        {mode === "clerk" ? (
          <>
            <SignInButton mode="modal">
              <button
                type="button"
                className="mb-4 w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#E5E7EB]"
              >
                Sign In with Clerk
              </button>
            </SignInButton>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#F9FAFB] px-3 text-[#9CA3AF]">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode("key")}
              className="w-full rounded-lg border border-black/[0.08] px-4 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
            >
              Use Admin Key
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="admin-key" className="mb-2 block text-sm font-medium text-[#6B7280]">
                Admin Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="admin-key"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin key"
                  autoFocus
                  className="w-full rounded-lg border border-black/[0.08] bg-[#F3F4F6] py-2.5 pl-10 pr-4 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="mb-3 w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#E5E7EB] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setMode("clerk")}
              className="w-full text-center text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
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
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/[0.08] px-4">
        <Link
          href="/"
          className={`text-lg font-semibold transition-opacity ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
        >
          <span className="text-white">storage</span>
          <span className="text-white/70">ads</span>
        </Link>
        {!collapsed && (
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#3B82F6]"
          >
            <Zap className="h-5 w-5" />
          </Link>
        )}
        {collapsed && (
          <Link
            href="/"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[#3B82F6]"
          >
            <Zap className="h-5 w-5" />
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-6">
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-white/40"}`}
                      />
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
      <div className="hidden shrink-0 border-t border-black/[0.08] p-3 md:block">
        <button
          type="button"
          onClick={() => onCollapse(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-black/[0.03] hover:text-[#6B7280]"
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
        className={`safe-left fixed inset-y-0 left-0 z-50 w-64 border-r border-black/[0.08] bg-[#F9FAFB] transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-black/[0.08] bg-[#F9FAFB] transition-all duration-200 md:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [checked] = useState(() => typeof window !== "undefined");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Clerk auth state
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { isVA, canAccessAdmin } = useClerkRole();

  const _handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminKey(null);
  }, []);

  // Wait for both localStorage check and Clerk to load
  if (!checked || !clerkLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  // Authenticated if: admin key is set OR Clerk user is signed in with admin/VA role
  const isAuthenticated = adminKey !== null || (isSignedIn && canAccessAdmin);

  // If Clerk user is signed in but has wrong role, show access denied
  if (isSignedIn && !canAccessAdmin && !adminKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-[#F9FAFB] p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-[#111827]">Access Denied</h2>
          <p className="mb-6 text-sm text-[#6B7280]">
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
      <div className="admin-theme flex h-screen overflow-hidden" style={{ background: "var(--bg)", fontFamily: "var(--font)" }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          isVA={isVA}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AdminHeader onToggleSidebar={() => { haptic("light"); setMobileOpen((v) => !v); }} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6">
            <ColorCycler />
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
