"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  Code2,
  DollarSign,
  Key,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Settings,
  Users,
  Webhook,
} from "lucide-react";

const STORAGE_KEY = "stowstack_partner_session";

interface PartnerSession {
  token: string;
  user: { id: string; email: string; name: string; role: string };
  organization: { id: string; name: string; slug: string; plan: string };
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/partner", icon: LayoutDashboard },
  { label: "Facilities", href: "/partner/facilities", icon: Building2 },
  { label: "Team", href: "/partner/team", icon: Users },
  { label: "Revenue", href: "/partner/revenue", icon: DollarSign },
  { label: "API Keys", href: "/partner/api-keys", icon: Key },
  { label: "Webhooks", href: "/partner/webhooks", icon: Webhook },
  { label: "Settings", href: "/partner/settings", icon: Settings },
];

function ResetPasswordForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check URL for reset token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("reset");
    if (resetToken) {
      setToken(resetToken);
      setStep("reset");
      window.history.replaceState({}, "", "/partner");
      // Verify the token
      fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: resetToken }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError("This reset link has expired. Please request a new one.");
            setStep("request");
            setToken("");
          }
        })
        .catch(() => {
          setError("Failed to verify reset link.");
        });
    }
  }, []);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !orgSlug.trim()) return;
    setLoading(true);
    setError("");
    try {
      await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: email.trim(), orgSlug: orgSlug.trim() }),
      });
      setSuccess("If an account exists with that email, we've sent a password reset link. Check your inbox.");
    } catch {
      setError("Failed to send reset email. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setSuccess("Password reset successfully! You can now sign in.");
      setTimeout(() => onBack(), 2000);
    } catch {
      setError("Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505]">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6]">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-[#F5F5F7]">
            {step === "request" ? "Reset Password" : "Set New Password"}
          </h1>
          <p className="text-sm text-[#6E6E73]">
            {step === "request"
              ? "Enter your details to receive a reset link"
              : "Choose a new password for your account"}
          </p>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-500/10 p-4 text-center text-sm text-green-400">
            {success}
          </div>
        ) : step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#A1A1A6]">Organization</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="Organization slug"
                  required
                  className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#A1A1A6]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#A1A1A6]">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#A1A1A6]">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reset Password"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full text-center text-xs text-[#6E6E73] transition-colors hover:text-[#A1A1A6]"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}

function LoginGate({ onAuthenticated }: { onAuthenticated: (session: PartnerSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Check URL for reset token on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset")) setShowReset(true);
  }, []);

  if (showReset) {
    return <ResetPasswordForm onBack={() => setShowReset(false)} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !orgSlug.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: email.trim(),
          password: password.trim(),
          orgSlug: orgSlug.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      onAuthenticated(data);
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-8"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6]">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-[#F5F5F7]">Partner Portal</h1>
          <p className="text-sm text-[#6E6E73]">Sign in to your management dashboard</p>
        </div>

        <div className="mb-4">
          <label htmlFor="org-slug" className="mb-2 block text-sm font-medium text-[#A1A1A6]">
            Organization
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
            <input
              id="org-slug"
              type="text"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="Organization slug"
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#A1A1A6]">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="mb-2">
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#A1A1A6]">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none transition-colors focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="mb-6 text-right">
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="text-xs text-[#6E6E73] transition-colors hover:text-[#3B82F6]"
          >
            Forgot password?
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password.trim() || !orgSlug.trim()}
          className="w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}

function Sidebar({
  session,
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: {
  session: PartnerSession;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#F5F5F7]">
              {session.organization.name}
            </p>
            <p className="truncate text-[10px] text-[#6E6E73]">
              {session.user.name}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/partner"
                ? pathname === "/partner"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#3B82F6]/15 font-medium text-white"
                      : "text-[#A1A1A6] hover:bg-white/[0.04] hover:text-[#F5F5F7]"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-[#3B82F6]" : ""}`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden shrink-0 border-t border-white/[0.06] p-3 md:block">
        <button
          type="button"
          onClick={() => onCollapse(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[#6E6E73] transition-colors hover:bg-white/[0.04] hover:text-[#A1A1A6]"
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-[#0A0A0A] transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <aside
        className={`hidden shrink-0 border-r border-white/[0.06] bg-[#0A0A0A] transition-all duration-200 md:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function PartnerHeader({
  session,
  onToggleSidebar,
  onLogout,
}: {
  session: PartnerSession;
  onToggleSidebar: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const ROUTE_TITLES: Record<string, string> = {
    "/partner": "Overview",
    "/partner/facilities": "Facilities",
    "/partner/team": "Team",
    "/partner/revenue": "Revenue",
    "/partner/api-keys": "API Keys",
    "/partner/webhooks": "Webhooks",
    "/partner/settings": "Settings",
  };

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
        {ROUTE_TITLES[pathname] ?? "Partner Dashboard"}
      </h1>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-[#6E6E73] sm:inline">
          {session.user.email}
        </span>
        <span className="hidden rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1A6] sm:inline">
          {session.organization.plan}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#A1A1A6] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F7]"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PartnerSession;
        if (parsed.token) {
          setSession(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setChecked(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    router.replace("/partner");
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <LoginGate onAuthenticated={setSession} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      <Sidebar
        session={session}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PartnerHeader
          session={session}
          onToggleSidebar={() => setMobileOpen((v) => !v)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
