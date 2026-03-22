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
        <h2 className="text-lg font-semibold text-[#F5F5F7]">Account Settings</h2>
        <p className="text-sm text-[#6E6E73]">Manage your facility info and preferences</p>
      </div>

      {/* Facility Info */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#F5F5F7]">Facility Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Facility Name</p>
              <p className="text-sm text-[#F5F5F7]">{client.facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Location</p>
              <p className="text-sm text-[#F5F5F7]">{client.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Email</p>
              <p className="text-sm text-[#F5F5F7]">{client.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Occupancy Range</p>
              <p className="text-sm text-[#F5F5F7]">{client.occupancyRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Total Units</p>
              <p className="text-sm text-[#F5F5F7]">{client.totalUnits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#F5F5F7]">Monthly Goal</h3>
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 shrink-0 text-[#3B82F6]" />
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#6E6E73]">
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
                className="w-32 rounded-lg border border-white/[0.06] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F5F7] outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/25"
              />
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50"
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
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#F5F5F7]">Your Account Manager</h3>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/10">
            <User className="h-5 w-5 text-[#3B82F6]" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#F5F5F7]">Blake</p>
            <p className="text-xs text-[#6E6E73]">Account Manager</p>
            <div className="flex flex-col gap-1 pt-1">
              <a
                href="mailto:blake@storepawpaw.com"
                className="flex items-center gap-2 text-xs text-[#A1A1A6] transition-colors hover:text-[#3B82F6]"
              >
                <Mail className="h-3.5 w-3.5" />
                blake@storepawpaw.com
              </a>
              <a
                href="tel:+12699298541"
                className="flex items-center gap-2 text-xs text-[#A1A1A6] transition-colors hover:text-[#3B82F6]"
              >
                <Phone className="h-3.5 w-3.5" />
                (269) 929-8541
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Client Since + Sign Out */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[#3B82F6]" />
            <div>
              <p className="text-xs text-[#6E6E73]">Client Since</p>
              <p className="text-sm text-[#F5F5F7]">{signedDate ?? "N/A"}</p>
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
