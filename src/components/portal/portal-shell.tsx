"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  BarChart3,
  Settings,
  LogIn,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  Menu,
  X,
  ClipboardCheck,
  CreditCard,
  MapPin,
} from "lucide-react";
import {
  type PortalSession,
  type ClientData,
  getPortalSession,
  savePortalSession,
  clearPortalSession,
  firstName,
} from "@/lib/portal-helpers";

/* ─── context ─── */

interface PortalContext {
  session: PortalSession;
  client: ClientData;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const PortalCtx = createContext<PortalContext | null>(null);

export function usePortal() {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error("usePortal must be used within PortalShell");
  return ctx;
}

/* ─── nav items ─── */

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Campaigns", href: "/portal/campaigns", icon: Megaphone },
  { label: "GBP", href: "/portal/gbp", icon: MapPin },
  { label: "Reports", href: "/portal/reports", icon: BarChart3 },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare },
  { label: "Billing", href: "/portal/billing", icon: CreditCard },
  { label: "Onboarding", href: "/portal/onboarding", icon: ClipboardCheck },
  { label: "Settings", href: "/portal/settings", icon: Settings },
];

/* ─── login form ─── */

function LoginForm({ onSuccess }: { onSuccess: (client: ClientData) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    const urlEmail = params.get("email");
    if (urlEmail && urlCode && /^\d{4}$/.test(urlCode)) {
      setEmail(urlEmail);
      setCode(urlCode.split(""));
      setStep("code");
      autoSubmitRef.current = true;
      window.history.replaceState({}, "", "/portal");
    }
  }, []);

  useEffect(() => {
    if (autoSubmitRef.current && email && code.every((d) => d)) {
      autoSubmitRef.current = false;
      attemptLogin(email, code.join(""));
    }
  }, [email, code]);

  async function attemptLogin(loginEmail: string, loginCode: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), accessCode: loginCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid or expired code. Request a new one.");
        return;
      }
      savePortalSession(loginEmail.trim(), loginCode);
      onSuccess(json.client);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setResending(true);
    setError("");
    try {
      await fetch("/api/resend-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStep("code");
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function handleCodeInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 3) codeRefs.current[index + 1]?.focus();
    if (digit && index === 3 && newCode.every((d) => d)) {
      attemptLogin(email, newCode.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setCode(pasted.split(""));
      codeRefs.current[3]?.focus();
      attemptLogin(email, pasted);
    }
  }

  async function handleResendCode() {
    setResending(true);
    setError("");
    try {
      await fetch("/api/resend-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setResent(true);
      setCode(["", "", "", ""]);
      setTimeout(() => {
        setResent(false);
        codeRefs.current[0]?.focus();
      }, 3000);
    } catch {
      setError("Failed to resend code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-light)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-gold)]/10">
            <Building2 className="h-7 w-7 text-[var(--color-gold)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-dark)]">Client Portal</h1>
          <p className="mt-2 text-sm text-[var(--color-mid-gray)]">
            {step === "email"
              ? "Enter your email to receive a login code"
              : `Enter the 4-digit code sent to ${email}`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-body-text)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-mid-gray)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@facility.com"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-3 pl-10 pr-4 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none transition-colors focus:border-[var(--color-gold)]/50 focus:ring-1 focus:ring-[var(--color-gold)]/25"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/[0.08] p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={resending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-gold)] py-3 text-sm font-semibold text-[var(--color-light)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {resending ? "Sending Code..." : "Send Login Code"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[i]}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={handleCodePaste}
                  autoFocus={i === 0}
                  className="h-14 w-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-center text-2xl font-bold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold)]/25"
                />
              ))}
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-body-text)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/[0.08] p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex flex-col items-center gap-2 pt-2">
              <button type="button" onClick={handleResendCode} disabled={resending || resent} className="text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]">
                {resending ? "Sending..." : resent ? "New code sent!" : "Didn't get a code? Resend"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setCode(["","","",""]); setError(""); }} className="text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]">
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── sidebar ─── */

function Sidebar({ client, mobileOpen, onClose }: { client: ClientData; mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-gold)]/10 text-sm font-bold text-[var(--color-gold)]">
          {firstName(client.name).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-dark)]">{client.facilityName}</p>
          <p className="truncate text-[10px] text-[var(--color-mid-gray)]">{client.location}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--color-gold)]/15 font-medium text-[var(--color-dark)]"
                      : "text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--color-gold)]" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--border-subtle)] bg-[var(--color-light)] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {content}
      </aside>
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--color-light)] md:block">
        {content}
      </aside>
    </>
  );
}

/* ─── header ─── */

function PortalHeader({ client, onToggle, onLogout }: { client: ClientData; onToggle: () => void; onLogout: () => void }) {
  const pathname = usePathname();
  const titles: Record<string, string> = {
    "/portal": "Dashboard",
    "/portal/campaigns": "Campaigns",
    "/portal/reports": "Reports",
    "/portal/messages": "Messages",
    "/portal/billing": "Billing",
    "/portal/onboarding": "Onboarding",
    "/portal/settings": "Settings",
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--color-light)]/80 px-4 backdrop-blur-xl md:px-6">
      <button type="button" onClick={onToggle} className="rounded-lg p-2 text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold text-[var(--color-dark)]">{titles[pathname] ?? "Portal"}</h1>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-[var(--color-mid-gray)] sm:inline">{client.email}</span>
        <button type="button" onClick={onLogout} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
          Sign Out
        </button>
      </div>
    </header>
  );
}

/* ─── main shell ─── */

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(() => getPortalSession());
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- sync init
      return;
    }
    fetch("/api/client-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.email, accessCode: session.accessCode }),
    })
      .then((r) => { if (!r.ok) throw new Error("auth"); return r.json(); })
      .then((json) => setClient(json.client))
      .catch(() => { clearPortalSession(); setSession(null); setAuthError(true); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = useCallback((clientData: ClientData) => {
    setClient(clientData);
    setSession(getPortalSession());
    setAuthError(false);
  }, []);

  const handleLogout = useCallback(() => {
    clearPortalSession();
    setSession(null);
    setClient(null);
  }, []);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const s = getPortalSession();
    if (!s) throw new Error("Not authenticated");
    const separator = url.includes("?") ? "&" : "?";
    return fetch(`${url}${separator}code=${s.accessCode}&email=${encodeURIComponent(s.email)}`, init);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-light)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-gold)]" />
      </div>
    );
  }

  if (!session || !client) {
    return (
      <div className="min-h-screen bg-[var(--color-light)]">
        {authError && (
          <div className="mx-auto max-w-sm px-4 pt-6">
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/[0.08] p-3 text-sm text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Session expired. Please sign in again.
            </div>
          </div>
        )}
        <LoginForm onSuccess={handleLogin} />
      </div>
    );
  }

  return (
    <PortalCtx.Provider value={{ session, client, authFetch }}>
      <div className="flex h-screen overflow-hidden bg-[var(--color-light)]">
        <Sidebar client={client} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PortalHeader client={client} onToggle={() => setMobileOpen((v) => !v)} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </PortalCtx.Provider>
  );
}
