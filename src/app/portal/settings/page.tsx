"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Target,
  Calendar,
  LogOut,
  Loader2,
  Check,
  User,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import {
  fmtCurrency,
  clearPortalSession,
} from "@/lib/portal-helpers";

export default function SettingsPage() {
  const { session, client } = usePortal();
  const [goalValue, setGoalValue] = useState(String(client.monthlyGoal ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goalError, setGoalError] = useState("");

  const signedDate = client.signedAt
    ? new Date(client.signedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  async function handleSaveGoal() {
    const parsed = parseInt(goalValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      setGoalError("Please enter a valid number.");
      return;
    }
    setSaving(true);
    setGoalError("");
    try {
      const res = await fetch("/api/client-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.email,
          accessCode: session.accessCode,
          monthlyGoal: parsed,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setGoalError("Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearPortalSession();
    window.location.href = "/portal";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-dark)]">Account Settings</h2>
        <p className="text-sm text-[var(--color-mid-gray)]">Manage your facility info and preferences</p>
      </div>

      {/* Facility Info */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">Facility Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Facility Name</p>
              <p className="text-sm text-[var(--color-dark)]">{client.facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Location</p>
              <p className="text-sm text-[var(--color-dark)]">{client.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Email</p>
              <p className="text-sm text-[var(--color-dark)]">{client.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Occupancy Range</p>
              <p className="text-sm text-[var(--color-dark)]">{client.occupancyRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Total Units</p>
              <p className="text-sm text-[var(--color-dark)]">{client.totalUnits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">Monthly Goal</h3>
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[var(--color-mid-gray)]">
              Target move-ins per month
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={goalValue}
                onChange={(e) => {
                  setGoalValue(e.target.value);
                  setSaved(false);
                  setGoalError("");
                }}
                min={0}
                className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-gold)]/50 focus:ring-1 focus:ring-[var(--color-gold)]/25"
              />
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-xs font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </div>
            {goalError && (
              <p className="mt-1.5 text-xs text-red-400">{goalError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Manager */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">Your Account Manager</h3>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)]/10">
            <User className="h-5 w-5 text-[var(--color-gold)]" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-dark)]">Blake</p>
            <p className="text-xs text-[var(--color-mid-gray)]">Account Manager</p>
            <div className="flex flex-col gap-1 pt-1">
              <a
                href="mailto:blake@storageads.com"
                className="flex items-center gap-2 text-xs text-[var(--color-body-text)] transition-colors hover:text-[var(--color-gold)]"
              >
                <Mail className="h-3.5 w-3.5" />
                blake@storageads.com
              </a>
              <a
                href="tel:+12699298541"
                className="flex items-center gap-2 text-xs text-[var(--color-body-text)] transition-colors hover:text-[var(--color-gold)]"
              >
                <Phone className="h-3.5 w-3.5" />
                (269) 929-8541
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Client Since + Sign Out */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-mid-gray)]">Client Since</p>
              <p className="text-sm text-[var(--color-dark)]">{signedDate ?? "N/A"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
