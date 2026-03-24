"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const SOURCES = [
  { value: "facebook_instagram_ad", label: "Facebook / Instagram ad" },
  { value: "google_search", label: "Google search" },
  { value: "drove_by_signage", label: "Drove by / signage" },
  { value: "friend_family_referral", label: "Friend / family referral" },
  { value: "repeat_customer", label: "Repeat customer" },
  { value: "other", label: "Other" },
];

export default function WalkInAttributionPage() {
  const { code } = useParams<{ code: string }>();
  const [source, setSource] = useState("");
  const [sawOnlineAd, setSawOnlineAd] = useState<boolean | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [unitRented, setUnitRented] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [loadingFacility, setLoadingFacility] = useState(true);
  const [invalidCode, setInvalidCode] = useState(false);

  // Validate access code and get facility name
  useEffect(() => {
    async function validateCode() {
      try {
        const res = await fetch(
          `/api/walkin-attribution?code=${encodeURIComponent(code)}`
        );
        if (!res.ok) {
          setInvalidCode(true);
          return;
        }
        const data = await res.json();
        if (data.facilityName) setFacilityName(data.facilityName);
      } catch {
        setInvalidCode(true);
      } finally {
        setLoadingFacility(false);
      }
    }
    validateCode();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) {
      setError("Please select how the tenant heard about you.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/walkin-attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode: code,
          source,
          sawOnlineAd,
          tenantName: tenantName.trim() || undefined,
          unitRented: unitRented.trim() || undefined,
          loggedBy: "facility_manager",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }

      setSubmitted(true);

      // Reset for next entry after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
        setSource("");
        setSawOnlineAd(null);
        setTenantName("");
        setUnitRented("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFacility) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (invalidCode) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[var(--text-tertiary)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Invalid Access Code
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            This walk-in attribution link is invalid or has expired. Contact your
            StowStack representative for a new link.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Visit StowStack
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center">
            <ClipboardList size={24} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Walk-In Attribution
          </h1>
          {facilityName && (
            <p className="text-sm text-[var(--accent)] font-medium mt-1">
              {facilityName}
            </p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Log how each walk-in tenant heard about you.
          </p>
        </div>

        {submitted ? (
          <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
              <Check
                size={28}
                className="text-[var(--color-success)]"
              />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
              Logged.
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Ready for the next walk-in.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                How did the tenant hear about us? *
              </label>
              <div className="space-y-2">
                {SOURCES.map((s) => (
                  <label
                    key={s.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      source === s.value
                        ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                        : "border-[var(--border-medium)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value={s.value}
                      checked={source === s.value}
                      onChange={() => setSource(s.value)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {s.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                Did they see any online ads before coming in?
              </label>
              <div className="flex gap-3">
                {[
                  { val: true, label: "Yes" },
                  { val: false, label: "No" },
                  { val: null, label: "Not sure" },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setSawOnlineAd(opt.val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      sawOnlineAd === opt.val
                        ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]"
                        : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Tenant name (optional)
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-transparent"
                placeholder="For matching to move-in data later"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Unit rented (optional)
              </label>
              <input
                type="text"
                value={unitRented}
                onChange={(e) => setUnitRented(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-transparent"
                placeholder="e.g., 10x10 Climate #204"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-[#111827] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Log Walk-In"}
            </button>
          </form>
        )}

        <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">
          Powered by{" "}
          <Link href="/" className="text-[var(--accent)] hover:underline">
            StowStack
          </Link>{" "}
          — data feeds into your attribution dashboard.
        </p>
      </div>
    </div>
  );
}
