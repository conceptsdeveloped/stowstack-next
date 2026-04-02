"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Loader2,
  PartyPopper,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

const DISMISS_KEY = "storageads_onboarding_dismissed";

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
}

interface OnboardingData {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
}

const CTA_LABELS: Record<string, string> = {
  profile: "Edit Profile",
  facility: "Add Facility",
  pms: "Upload PMS Data",
  landing_page: "Create Page",
  ad_account: "Connect Account",
  campaign: "Launch Campaign",
};

function ConfettiStars() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <Star
          key={i}
          className="absolute animate-[confetti_2s_ease-out_forwards] text-[var(--color-gold)]"
          style={{
            width: `${10 + (i % 4) * 4}px`,
            height: `${10 + (i % 4) * 4}px`,
            left: `${8 + (i * 7.5) % 85}%`,
            top: `${10 + ((i * 13) % 60)}%`,
            animationDelay: `${i * 0.15}s`,
            opacity: 0,
          }}
          fill="currentColor"
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { opacity: 0; transform: scale(0) rotate(0deg) translateY(20px); }
          40% { opacity: 1; transform: scale(1.2) rotate(180deg) translateY(-10px); }
          70% { opacity: 0.8; transform: scale(1) rotate(270deg) translateY(-5px); }
          100% { opacity: 0; transform: scale(0.6) rotate(360deg) translateY(10px); }
        }
      `}</style>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--color-light-gray)]" />
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-light-gray)]" />
      </div>
      <div className="mb-5 h-2 w-full animate-pulse rounded-full bg-[var(--color-light-gray)]" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-light-gray)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 animate-pulse rounded bg-[var(--color-light-gray)]" />
              <div className="h-3 w-56 animate-pulse rounded bg-[var(--color-light-gray)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OnboardingChecklist() {
  const { session, authFetch } = usePartnerAuth();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(DISMISS_KEY) === "true";
  });

  const fetchOnboarding = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/partner/onboarding");
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as OnboardingData;
      setData(json);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    if (!dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOnboarding();
    }
  }, [fetchOnboarding, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-red)]/20 bg-[var(--color-red)]/5 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-red)]">
            Unable to load onboarding progress. Please try refreshing the page.
          </p>
          <button
            onClick={handleDismiss}
            className="ml-3 shrink-0 text-[var(--color-mid-gray)] transition-colors hover:text-[var(--color-dark)]"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { steps, completedCount, totalCount, allComplete } = data;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  // All complete celebration
  if (allComplete) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[var(--color-green)]/30 bg-[var(--color-green)]/5 p-6">
        <ConfettiStars />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-green)]/15">
            <PartyPopper className="h-7 w-7 text-[var(--color-green)]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-dark)]">
              You&apos;re all set!
            </h3>
            <p className="mt-1 text-sm text-[var(--color-body-text)]">
              You&apos;ve completed all onboarding steps. Your campaigns are live
              and leads are on the way.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/partner"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-gold)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)]"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm text-[var(--color-body-text)] transition-colors hover:text-[var(--color-dark)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
          <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold text-[var(--color-dark)]">
            Get Started
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-[var(--color-mid-gray)] transition-colors hover:text-[var(--color-body-text)]"
        >
          Skip for now
        </button>
      </div>
      <p className="mb-3 text-xs text-[var(--color-mid-gray)]">
        {completedCount} of {totalCount} complete
      </p>

      {/* Progress bar */}
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-light-gray)]">
        <div
          className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div key={step.key}>
            {step.completed ? (
              /* Completed step - collapsed */
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-green)]/15">
                  <Check className="h-3.5 w-3.5 text-[var(--color-green)]" />
                </div>
                <span className="text-sm text-[var(--color-mid-gray)] line-through decoration-[var(--color-mid-gray)]/40">
                  {step.title}
                </span>
              </div>
            ) : (
              /* Incomplete step - expanded */
              <div className="rounded-lg bg-[var(--color-light-gray)]/30 px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-mid-gray)]/40 text-xs font-medium text-[var(--color-body-text)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-dark)]">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-body-text)]">
                      {step.description}
                    </p>
                    <Link
                      href={step.link}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-gold)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-gold-hover)]"
                    >
                      {CTA_LABELS[step.key] ?? "Get Started"}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
