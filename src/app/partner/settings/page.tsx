"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";
import { TwoFactorSetup } from "@/components/partner/two-factor-setup";
import { SessionManagement } from "@/components/partner/session-management";

// ---------- Types ----------

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  email: string;
  billing_email: string;
  plan: string;
  subscription_status: string;
  has_stripe: boolean;
  facility_limit: number;
  white_label: boolean;
  trial_ends_at: string | null;
}

interface EmailPreferences {
  payment_failed?: boolean;
  trial_ending?: boolean;
  ab_test_winner?: boolean;
  campaign_alert?: boolean;
  weekly_report?: boolean;
  team_changes?: boolean;
  product_updates?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  avatar_url: string | null;
  role: string;
  totp_enabled: boolean;
}

type SettingsTab =
  | "profile"
  | "organization"
  | "billing"
  | "security"
  | "notifications"
  | "danger";

const TABS: { id: SettingsTab; label: string; Icon: typeof User }[] = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "organization", label: "Organization", Icon: Building2 },
  { id: "billing", label: "Billing", Icon: CreditCard },
  { id: "security", label: "Security", Icon: Shield },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "danger", label: "Danger Zone", Icon: AlertTriangle },
];

const NOTIFICATION_LABELS: Record<string, { label: string; description: string }> = {
  payment_failed: {
    label: "Payment failures",
    description: "Get notified when a payment fails or requires action",
  },
  trial_ending: {
    label: "Trial expiring",
    description: "Receive a reminder before your trial period ends",
  },
  ab_test_winner: {
    label: "A/B test results",
    description: "Get notified when an A/B test finds a winner",
  },
  campaign_alert: {
    label: "Campaign alerts",
    description: "Receive alerts about campaign performance changes",
  },
  weekly_report: {
    label: "Weekly reports",
    description: "Receive a weekly summary of your performance",
  },
  team_changes: {
    label: "Team changes",
    description: "Get notified when team members are added or removed",
  },
  product_updates: {
    label: "Product updates",
    description: "Receive announcements about new features and improvements",
  },
};

// ---------- Component ----------

export default function SettingsPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Org
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // User profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Org form
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Billing portal
  const [billingLoading, setBillingLoading] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<EmailPreferences>({});
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState<string | null>(null);

  // Danger zone
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ---------- Fetchers ----------

  const fetchOrg = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        const o = data.organization || data;
        setOrg(o);
        setOrgName(o.name || "");
        setOrgEmail(o.email || "");
        setBillingEmail(o.billing_email || "");
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    // Use session data as profile baseline
    setProfile({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      email_verified: true, // Will be overridden if we get actual data
      avatar_url: null,
      role: session.user.role,
      totp_enabled: false,
    });
    setProfileName(session.user.name);
    setProfileEmail(session.user.email);
  }, [session]);

  const fetchNotificationPrefs = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/partner/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs(data.preferences || {});
      }
    } catch {
      // Non-critical
    }
    setNotifLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchOrg();
    fetchProfile();
    fetchNotificationPrefs();
  }, [fetchOrg, fetchProfile, fetchNotificationPrefs]);

  // ---------- Handlers ----------

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const res = await authFetch("/api/partner/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile");
        return;
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      if (data.user) {
        setProfile((prev) =>
          prev
            ? { ...prev, ...data.user }
            : prev
        );
      }
    } catch {
      setProfileError("Connection error");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/organizations", {
        method: "PATCH",
        body: JSON.stringify({
          name: orgName.trim(),
          email: orgEmail.trim(),
          billing_email: billingEmail.trim(),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        fetchOrg();
      }
    } catch {
      // handled by authFetch
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwMessage({
        type: "error",
        text: "Password must be at least 8 characters",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    setPwLoading(true);
    setPwMessage(null);
    try {
      const res = await authFetch("/api/organizations", {
        method: "POST",
        body: JSON.stringify({
          action: "change_password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPwMessage({
          type: "error",
          text: data.error || "Failed to change password",
        });
      } else {
        setPwMessage({
          type: "success",
          text: "Password updated successfully",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwMessage({ type: "error", text: "Connection error" });
    }
    setPwLoading(false);
  };

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const res = await authFetch("/api/create-billing-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // handled by authFetch
    }
    setBillingLoading(false);
  };

  const toggleNotifPref = async (key: string, value: boolean) => {
    setNotifSaving(key);
    const previous = { ...notifPrefs };
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await authFetch(
        "/api/partner/notifications/preferences",
        {
          method: "PATCH",
          body: JSON.stringify({ [key]: value }),
        }
      );
      if (!res.ok) {
        setNotifPrefs(previous);
      }
    } catch {
      setNotifPrefs(previous);
    }
    setNotifSaving(null);
  };

  const handleDeleteOrg = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await authFetch("/api/partner/organization", {
        method: "DELETE",
        body: JSON.stringify({ confirmName: deleteConfirmName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to schedule deletion");
        return;
      }
      setShowDeleteDialog(false);
      setDeleteConfirmName("");
      // Refetch org to show updated status
      fetchOrg();
    } catch {
      setDeleteError("Connection error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------- Status helpers ----------

  const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    trialing: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
    past_due: "bg-amber-500/10 text-amber-400",
    canceled: "bg-red-500/10 text-red-400",
    incomplete: "bg-[#6a9bcc]/10 text-[#6a9bcc]",
  };

  function getTrialDaysRemaining(): number | null {
    if (!org?.trial_ends_at) return null;
    if (org.subscription_status !== "trialing") return null;
    const diff =
      new Date(org.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  // ---------- Loading ----------

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-mid-gray)]" />
      </div>
    );
  }

  const trialDays = getTrialDaysRemaining();

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "border-transparent text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
              } ${id === "danger" ? "text-[var(--color-red)]" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Profile */}
      {activeTab === "profile" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
            <User className="h-4 w-4 text-[var(--color-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Profile
            </h3>
          </div>
          <form onSubmit={saveProfile} className="p-5 space-y-5">
            {/* Avatar area */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-gold)]/10 text-lg font-semibold text-[var(--color-gold)]">
                {getInitials(profileName || session?.user.name || "U")}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-dark)]">
                  {profileName || session?.user.name}
                </p>
                <p className="text-xs text-[var(--color-mid-gray)]">
                  Avatar upload coming soon
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                Email Address
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
              />
              {profileEmail.toLowerCase() !==
                (session?.user.email || "").toLowerCase() && (
                <p className="mt-1 text-xs text-amber-500">
                  Changing your email will require re-verification.
                </p>
              )}
            </div>

            {profileError && (
              <p className="text-sm text-[var(--color-red)]">{profileError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Profile
              </button>
              {profileSaved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Section 2: Organization */}
      {activeTab === "organization" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
            <Building2 className="h-4 w-4 text-[var(--color-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Organization Info
            </h3>
          </div>
          <form onSubmit={saveOrg} className="p-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]"
                />
              </div>
            </div>
            {org && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-[var(--color-light-gray)]/20 px-4 py-3 text-xs text-[var(--color-mid-gray)]">
                <span>
                  Slug:{" "}
                  <code className="rounded bg-[var(--color-light-gray)] px-1.5 py-0.5 text-[var(--color-body-text)]">
                    {org.slug}
                  </code>
                </span>
                <span>
                  White-Label:{" "}
                  <span
                    className={
                      org.white_label
                        ? "text-emerald-400"
                        : "text-[var(--color-mid-gray)]"
                    }
                  >
                    {org.white_label ? "Enabled" : "Disabled"}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Section 3: Subscription & Billing */}
      {activeTab === "billing" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
            <CreditCard className="h-4 w-4 text-[var(--color-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Subscription & Billing
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {trialDays !== null && trialDays > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[#6a9bcc]/10 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6a9bcc]/20">
                  <CreditCard className="h-4 w-4 text-[#6a9bcc]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    Trial period
                  </p>
                  <p className="text-xs text-[var(--color-body-text)]">
                    {trialDays} day{trialDays !== 1 ? "s" : ""} remaining in
                    your free trial
                  </p>
                </div>
              </div>
            )}

            {trialDays === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-amber-600">
                  Your trial has expired. Please subscribe to continue using all
                  features.
                </p>
              </div>
            )}

            {org && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold capitalize text-[var(--color-dark)]">
                      {org.plan}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_STYLES[org.subscription_status] ||
                        "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"
                      }`}
                    >
                      {org.subscription_status || "active"}
                    </span>
                  </div>
                  {org.facility_limit < 999 && (
                    <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
                      Facility limit: {org.facility_limit}
                    </p>
                  )}
                </div>
                {org.has_stripe && (
                  <button
                    onClick={openBillingPortal}
                    disabled={billingLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--color-light-gray)] px-4 py-2 text-sm font-medium text-[var(--color-body-text)] transition-colors hover:text-[var(--color-dark)] disabled:opacity-50"
                  >
                    {billingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Manage Billing
                  </button>
                )}
              </div>
            )}
            {!org?.has_stripe && (
              <p className="text-sm text-[var(--color-mid-gray)]">
                Stripe billing is not configured for this organization. Contact
                support to set up payments.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Security */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Password Change */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
              <Lock className="h-4 w-4 text-[var(--color-gold)]" />
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Change Password
              </h3>
            </div>
            <form
              onSubmit={handlePasswordChange}
              className="p-5 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                  Current Password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
                    Confirm Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] outline-none focus:border-[var(--color-gold)]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
              >
                {showPasswords ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {showPasswords ? "Hide" : "Show"} passwords
              </button>
              {pwMessage && (
                <p
                  className={`text-sm ${
                    pwMessage.type === "success"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {pwMessage.text}
                </p>
              )}
              <button
                type="submit"
                disabled={
                  pwLoading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="rounded-lg bg-[var(--color-light-gray)] px-4 py-2 text-sm font-medium text-[var(--color-body-text)] transition-colors hover:text-[var(--color-dark)] disabled:opacity-50"
              >
                {pwLoading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
              <Shield className="h-4 w-4 text-[var(--color-gold)]" />
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Two-Factor Authentication
              </h3>
            </div>
            <div className="p-5">
              <TwoFactorSetup enabled={profile?.totp_enabled ?? false} />
            </div>
          </div>

          {/* Active Sessions */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
              <Lock className="h-4 w-4 text-[var(--color-gold)]" />
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Active Sessions
              </h3>
            </div>
            <div className="p-5">
              <SessionManagement />
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Notification Preferences */}
      {activeTab === "notifications" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
            <Bell className="h-4 w-4 text-[var(--color-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Email Notifications
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {notifLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-mid-gray)]" />
              </div>
            ) : (
              Object.entries(NOTIFICATION_LABELS).map(
                ([key, { label, description }]) => {
                  const isEnabled =
                    (notifPrefs as Record<string, boolean | undefined>)[key] ??
                    true;
                  const isSaving = notifSaving === key;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-dark)]">
                          {label}
                        </p>
                        <p className="text-xs text-[var(--color-mid-gray)]">
                          {description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleNotifPref(key, !isEnabled)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          isEnabled
                            ? "bg-[var(--color-gold)]"
                            : "bg-[var(--color-light-gray)]"
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      )}

      {/* Section 6: Danger Zone */}
      {activeTab === "danger" && (
        <div className="space-y-6">
          {/* Cancel Subscription */}
          {org?.has_stripe && (
            <div className="rounded-xl border border-[var(--color-red)]/20 bg-[var(--bg-elevated)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-red)]/20 px-5 py-4">
                <CreditCard className="h-4 w-4 text-[var(--color-red)]" />
                <h3 className="text-sm font-semibold text-[var(--color-red)]">
                  Cancel Subscription
                </h3>
              </div>
              <div className="p-5">
                <p className="mb-4 text-sm text-[var(--color-body-text)]">
                  Canceling your subscription will downgrade your account at the
                  end of the current billing period. You can manage this through
                  the Stripe billing portal.
                </p>
                <button
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-red)]/20 px-4 py-2 text-sm font-medium text-[var(--color-red)] transition-colors hover:bg-[var(--color-red)]/5 disabled:opacity-50"
                >
                  {billingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}

          {/* Delete Organization */}
          <div className="rounded-xl border border-[var(--color-red)]/20 bg-[var(--bg-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--color-red)]/20 px-5 py-4">
              <Trash2 className="h-4 w-4 text-[var(--color-red)]" />
              <h3 className="text-sm font-semibold text-[var(--color-red)]">
                Delete Organization
              </h3>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-[var(--color-red)]/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-red)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-red)]">
                    This action cannot be easily undone
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-body-text)]">
                    Deleting your organization will schedule it for permanent
                    removal in 30 days. All facilities, campaigns, and data will
                    be permanently deleted. Contact support within 30 days to
                    cancel the deletion.
                  </p>
                </div>
              </div>

              {session?.user.role !== "org_admin" ? (
                <p className="text-sm text-[var(--color-mid-gray)]">
                  Only organization admins can delete the organization.
                </p>
              ) : (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-red)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-red)]/90"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Organization
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-red)]">
                Delete organization
              </h4>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmName("");
                  setDeleteError(null);
                }}
                className="rounded-lg p-1 text-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--color-body-text)]">
              To confirm, type the organization name:{" "}
              <strong className="text-[var(--color-dark)]">
                {org?.name}
              </strong>
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type organization name"
              className="mt-3 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-4 py-2.5 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-red)]"
            />
            {deleteError && (
              <p className="mt-2 text-sm text-[var(--color-red)]">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmName("");
                  setDeleteError(null);
                }}
                className="rounded-lg px-3 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrg}
                disabled={
                  deleteLoading || deleteConfirmName !== (org?.name || "")
                }
                className="rounded-lg bg-[var(--color-red)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-red)]/90 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Delete Organization"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
