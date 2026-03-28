"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Users,
  Bell,
  Activity,
  Phone,
  Mail,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  Info,
  AlertTriangle,
  PhoneCall,
  Footprints,
  FileText,
  ClipboardCheck,
  Megaphone,
  Search,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import {
  type Alert,
  type ActivityItem,
  firstName,
  fmt,
  relativeTime,
  SectionSkeleton,
  ErrorState,
} from "@/lib/portal-helpers";

/* ─── types ─── */

interface OnboardingData {
  onboarding: {
    accessCode: string;
    updatedAt: string;
    completedAt: string | null;
    steps: Record<string, { completed: boolean; data: Record<string, unknown> }>;
  };
  completionPct: number;
}

/* ─── main page ─── */

export default function PortalDashboard() {
  const { session, client } = usePortal();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <div className="space-y-8">
        <WelcomeBanner />
        <OnboardingProgress />
        <CampaignGoalProgress />
        <CampaignAlerts />
        <RecentActivity />
        <ContactCard />
      </div>
    </div>
  );
}

/* ─── welcome banner ─── */

function WelcomeBanner() {
  const { session, client } = usePortal();
  const [stats, setStats] = useState<{ leads: number; moveIns: number } | null>(null);

  useEffect(() => {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    fetch(`/api/attribution?accessCode=${session.accessCode}&startDate=${start}&endDate=${end}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.totals) setStats({ leads: data.totals.leads, moveIns: data.totals.move_ins });
      })
      .catch(() => {});
  }, [session.accessCode]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--color-gold)]/[0.08] to-transparent p-5">
      <h1 className="text-xl font-bold tracking-tight">
        {greeting}, {firstName(client.name)}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-body-text)]">
        Here is what is happening at {client.facilityName}
      </p>
      {stats && (
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-2xl font-bold">{fmt(stats.leads)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">Total Leads (90d)</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{fmt(stats.moveIns)}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">Move-Ins (90d)</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── onboarding progress ─── */

function OnboardingProgress() {
  const { session } = usePortal();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/client-onboarding?code=${session.accessCode}&email=${encodeURIComponent(session.email)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [session.accessCode, session.email]);

  useEffect(() => { loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch

  if (loading) return <SectionSkeleton />;
  if (error) return <ErrorState message="Failed to load onboarding status" onRetry={loadData} />;
  if (!data || data.completionPct >= 100 || data.onboarding.completedAt) return null;

  const steps = data.onboarding.steps;
  const totalSteps = Object.keys(steps).length || 5;
  const completedSteps = Object.values(steps).filter((s) => s.completed).length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Onboarding</h2>
        </div>
        <span className="text-xs text-[var(--color-body-text)]">{completedSteps}/{totalSteps} steps</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
        <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${data.completionPct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-mid-gray)]">{data.completionPct}% complete</p>
        <a href="/portal/onboarding" className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300">
          Continue Setup <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

/* ─── campaign goal progress ─── */

function CampaignGoalProgress() {
  const { session, client } = usePortal();
  const [moveIns, setMoveIns] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const end = now.toISOString().split("T")[0];
    fetch(`/api/attribution?accessCode=${session.accessCode}&startDate=${start}&endDate=${end}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.totals) setMoveIns(data.totals.move_ins); })
      .catch(() => {});
  }, [session.accessCode]);

  if (!client.monthlyGoal || moveIns === null) return null;

  const pct = Math.min(100, Math.round((moveIns / client.monthlyGoal) * 100));
  const onTrack = pct >= 50;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-[var(--color-gold)]" />
        <h2 className="text-sm font-semibold">Monthly Goal</h2>
      </div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold">{moveIns}</span>
          <span className="text-lg text-[var(--color-mid-gray)]"> / {client.monthlyGoal}</span>
        </div>
        <span className={`text-xs font-medium ${onTrack ? "text-green-400" : "text-amber-400"}`}>{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
        <div className={`h-full rounded-full transition-all duration-700 ${onTrack ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-[var(--color-mid-gray)]">Move-ins this month toward your target</p>
    </div>
  );
}

/* ─── campaign alerts ─── */

function CampaignAlerts() {
  const { session } = usePortal();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/alert-history?accessCode=${session.accessCode}&email=${encodeURIComponent(session.email)}&limit=20`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setAlerts((d.data || []) as Alert[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [session.accessCode, session.email]);

  useEffect(() => { loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch

  if (loading) return <SectionSkeleton />;
  if (error) return <ErrorState message="Failed to load alerts" onRetry={loadData} />;
  if (alerts.length === 0) return null;

  const severityConfig = {
    critical: { bg: "bg-red-500/[0.06]", border: "border-red-500/20", text: "text-red-400", icon: <ShieldAlert className="h-4 w-4" /> },
    warning: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-400", icon: <AlertTriangle className="h-4 w-4" /> },
    info: { bg: "bg-[var(--color-gold)]/[0.06]", border: "border-[var(--color-gold)]/20", text: "text-[var(--color-gold)]", icon: <Info className="h-4 w-4" /> },
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-[var(--color-gold)]" />
        <h2 className="text-sm font-semibold">Campaign Alerts</h2>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const cfg = severityConfig[alert.severity] || severityConfig.info;
          return (
            <div key={alert.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${cfg.text}`}>{cfg.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-dark)]">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-body-text)]">{alert.message}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-mid-gray)]">{relativeTime(alert.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── recent activity ─── */

function RecentActivity() {
  const { session } = usePortal();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/client-activity?accessCode=${session.accessCode}&email=${encodeURIComponent(session.email)}&limit=20`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setItems((d.data || []) as ActivityItem[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [session.accessCode, session.email]);

  useEffect(() => { loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch

  if (loading) return <SectionSkeleton />;
  if (error) return <ErrorState message="Failed to load activity" onRetry={loadData} />;
  if (items.length === 0) return null;

  const typeIcons: Record<string, React.ReactNode> = {
    lead_created: <Users className="h-3.5 w-3.5" />,
    lead_captured: <Users className="h-3.5 w-3.5" />,
    call_received: <PhoneCall className="h-3.5 w-3.5" />,
    walkin_logged: <Footprints className="h-3.5 w-3.5" />,
    report_sent: <FileText className="h-3.5 w-3.5" />,
    onboarding_step: <CheckCircle2 className="h-3.5 w-3.5" />,
    campaign_added: <Megaphone className="h-3.5 w-3.5" />,
    audit_generated: <Search className="h-3.5 w-3.5" />,
    audit_approved: <ClipboardCheck className="h-3.5 w-3.5" />,
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--color-gold)]" />
        <h2 className="text-sm font-semibold">Recent Activity</h2>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-[var(--border-subtle)]" : ""}`}>
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
              {typeIcons[item.type] || <Activity className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-dark)]">{item.label}</p>
              {item.detail && <p className="mt-0.5 truncate text-xs text-[var(--color-mid-gray)]">{item.detail}</p>}
              {item.leadName && <p className="mt-0.5 text-xs text-[var(--color-body-text)]">{item.leadName}</p>}
            </div>
            <span className="shrink-0 text-[10px] text-[var(--color-mid-gray)]">{relativeTime(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── contact card ─── */

function ContactCard() {
  const { client } = usePortal();
  const signedDate = client.signedAt
    ? new Date(client.signedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Phone className="h-4 w-4 text-[var(--color-gold)]" />
        <h2 className="text-sm font-semibold">Your Team</h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 text-sm font-bold text-[var(--color-gold)]">B</div>
          <div>
            <p className="text-sm font-medium">Blake</p>
            <p className="text-xs text-[var(--color-mid-gray)]">Account Manager</p>
          </div>
        </div>
        <div className="space-y-2">
          <a href="mailto:blake@storageads.com" className="flex items-center gap-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
            <Mail className="h-3.5 w-3.5" /> blake@storageads.com
          </a>
          <a href="tel:+12699298541" className="flex items-center gap-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
            <Phone className="h-3.5 w-3.5" /> (269) 929-8541
          </a>
        </div>
      </div>
      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex items-center justify-between text-xs text-[var(--color-mid-gray)]">
          <span>{client.facilityName}</span>
          {client.occupancyRange && <span>Occupancy at sign: {client.occupancyRange}</span>}
        </div>
        {signedDate && <p className="mt-1 text-xs text-[var(--color-mid-gray)]">Client since {signedDate}</p>}
      </div>
    </div>
  );
}
