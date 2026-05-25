export interface PortalSession {
  email: string;
  accessCode: string;
  loginAt: number;
}

export interface ClientData {
  facilityId: string;
  email: string;
  name: string;
  facilityName: string;
  location: string;
  occupancyRange: string;
  totalUnits: number;
  signedAt: string;
  accessCode: string;
  monthlyGoal: number;
}

export interface AttributionData {
  campaigns: Array<{
    campaign: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    move_ins: number;
    revenue: number;
    cpl: number;
    cost_per_move_in: number;
    roas: number;
  }>;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    move_ins: number;
    revenue: number;
    cpl: number;
    cost_per_move_in: number;
    roas: number;
  };
  monthlyTrend: Array<{
    month: string;
    spend: number;
    leads: number;
    move_ins: number;
    revenue: number;
    cpl: number;
    roas: number;
  }>;
  dateRange: { start: string; end: string };
  hasData: boolean;
}

export interface Message {
  id: string;
  from: "client" | "admin";
  text: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
}

export interface ActivityItem {
  id: string;
  type: string;
  label: string;
  detail: string;
  leadName: string | null;
  createdAt: string;
}

const SESSION_KEY = "storageads_portal_session";
const SESSION_TTL = 24 * 60 * 60 * 1000;

export function getPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: PortalSession = JSON.parse(raw);
    if (Date.now() - session.loginAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function savePortalSession(email: string, accessCode: string) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email, accessCode, loginAt: Date.now() })
  );
}

export function clearPortalSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function firstName(name: string): string {
  return name.split(/\s/)[0] || name;
}

export function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals > 0 ? 1 : 0)}k`;
  return n.toFixed(decimals);
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dateRangeParams(
  range: string
): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: string;

  switch (range) {
    case "7d":
      start = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
      break;
    case "ytd": {
      start = `${now.getFullYear()}-01-01`;
      break;
    }
    default:
      start = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  }

  return { start, end };
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-black/[0.03] ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-5">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-5">
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5 text-center">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs text-[#6B7280] underline transition-colors hover:text-[#111827]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
