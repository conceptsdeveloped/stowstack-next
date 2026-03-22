"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  Shield,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

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
}

export default function SettingsPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

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
      setPwMessage({ type: "error", text: "Password must be at least 8 characters" });
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
        setPwMessage({ type: "success", text: "Password updated successfully" });
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6E6E73]" />
      </div>
    );
  }

  const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    trialing: "bg-blue-500/10 text-blue-400",
    past_due: "bg-amber-500/10 text-amber-400",
    canceled: "bg-red-500/10 text-red-400",
    incomplete: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
          <Building2 className="h-4 w-4 text-[#3B82F6]" />
          <h3 className="text-sm font-semibold text-[#F5F5F7]">
            Organization Info
          </h3>
        </div>
        <form onSubmit={saveOrg} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6E6E73]">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#6E6E73]">
                Contact Email
              </label>
              <input
                type="email"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6E6E73]">
                Billing Email
              </label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
          {org && (
            <div className="flex items-center gap-4 rounded-lg bg-white/[0.02] px-4 py-3 text-xs text-[#6E6E73]">
              <span>
                Slug:{" "}
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[#A1A1A6]">
                  {org.slug}
                </code>
              </span>
              <span>
                White-Label:{" "}
                <span
                  className={
                    org.white_label ? "text-emerald-400" : "text-[#6E6E73]"
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
              className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
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

      {/* Subscription & Billing */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
          <Shield className="h-4 w-4 text-[#3B82F6]" />
          <h3 className="text-sm font-semibold text-[#F5F5F7]">
            Subscription & Billing
          </h3>
        </div>
        <div className="p-5">
          {org && (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold capitalize text-[#F5F5F7]">
                    {org.plan}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      STATUS_STYLES[org.subscription_status] ||
                      "bg-white/[0.06] text-[#6E6E73]"
                    }`}
                  >
                    {org.subscription_status || "active"}
                  </span>
                </div>
                {org.facility_limit < 999 && (
                  <p className="mt-1 text-xs text-[#6E6E73]">
                    Facility limit: {org.facility_limit}
                  </p>
                )}
              </div>
              {org.has_stripe && (
                <button
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#A1A1A6] transition-colors hover:bg-white/[0.1] hover:text-[#F5F5F7] disabled:opacity-50"
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
            <p className="text-sm text-[#6E6E73]">
              Stripe billing is not configured for this organization. Contact
              support to set up payments.
            </p>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
          <Lock className="h-4 w-4 text-[#3B82F6]" />
          <h3 className="text-sm font-semibold text-[#F5F5F7]">Security</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6E6E73]">
              Current Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#6E6E73]">
                New Password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6E6E73]">
                Confirm Password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-1 text-xs text-[#6E6E73] hover:text-[#A1A1A6]"
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
                pwMessage.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {pwMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#A1A1A6] transition-colors hover:bg-white/[0.1] hover:text-[#F5F5F7] disabled:opacity-50"
          >
            {pwLoading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
