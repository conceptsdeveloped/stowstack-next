"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Plug,
  Megaphone,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useFacility } from "@/lib/facility-context";

const SETUP_STEPS = [
  { key: "facility", label: "Facility", icon: Building2 },
  { key: "storedge", label: "storEDGE", icon: Plug },
  { key: "ad_accounts", label: "Ad Accounts", icon: Megaphone },
  { key: "review", label: "Review", icon: Check },
] as const;

function WelcomeView({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const { facilities } = useFacility();
  const facilityName = facilities[0]?.name ?? "your facility";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--color-gold-light)" }}
        >
          <Sparkles className="h-8 w-8" style={{ color: "var(--color-gold)" }} />
        </div>

        <h1
          className="text-3xl font-semibold mb-3"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
        >
          Welcome to StorageAds
        </h1>

        <p
          className="text-base mb-6"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}
        >
          Blake set up your account. Let's make sure everything is connected for{" "}
          <strong style={{ color: "var(--color-dark)" }}>{facilityName}</strong>.
        </p>

        <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
          {[
            "Confirm your facility details",
            "Connect your reservation system",
            "Link your ad accounts",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                style={{ backgroundColor: "var(--color-gold-light)" }}
              >
                <Check className="h-3 w-3" style={{ color: "var(--color-gold)" }} />
              </span>
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 mx-auto rounded-lg px-6 py-3 text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#fff",
            backgroundColor: "var(--color-gold)",
          }}
        >
          Let's get started
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="mt-4 block mx-auto text-xs"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}
        >
          Skip setup — go to dashboard
        </button>
      </div>
    </div>
  );
}

function SetupStep1Facility({
  onNext,
}: {
  onNext: () => void;
}) {
  const { facilities } = useFacility();
  const facility = facilities[0];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2
        className="text-xl font-medium"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
      >
        Confirm Your Facility
      </h2>
      <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
        Review the details Blake entered for your facility. You can edit these later in Settings.
      </p>

      {facility ? (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: "var(--color-light-gray)" }}
        >
          {[
            { label: "Name", value: facility.name },
            { label: "Location", value: facility.location },
            { label: "Total Units", value: facility.totalUnits || "—" },
            { label: "Google Rating", value: facility.googleRating ? `${facility.googleRating}★` : "—" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between">
              <span className="text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)", fontSize: "13px" }}>
                {row.label}
              </span>
              <span className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)", fontSize: "13px" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border p-5 text-center"
          style={{ borderColor: "var(--color-light-gray)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-mid-gray)" }}>No facility data yet.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
      >
        Confirm and continue
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SetupStep2StorEdge({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
        Connect storEDGE
      </h2>
      <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
        Your storEDGE API key connects your reservation system to StorageAds. This is how we track move-ins.
      </p>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-light-gray)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Plug className="h-5 w-5" style={{ color: "var(--color-mid-gray)" }} />
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
            storEDGE Connection
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "var(--color-light-gray)", color: "var(--color-mid-gray)" }}
          >
            Not connected
          </span>
        </div>
        <p className="text-xs mb-3" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
          Enter your storEDGE API key, or ask Blake to set this up for you.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="storEDGE API Key"
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
            style={{ backgroundColor: "var(--color-light)", borderColor: "var(--color-light-gray)", color: "var(--color-dark)" }}
          />
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
          >
            Test & Save
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNext}
          className="text-xs"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}
        >
          Blake is handling this — skip for now
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SetupStep3AdAccounts({ onNext }: { onNext: () => void }) {
  const [blakeManages, setBlakeManages] = useState(false);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
        Connect Ad Accounts
      </h2>
      <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
        These connections let StorageAds run and optimize your ads directly.
      </p>

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={blakeManages}
          onChange={(e) => setBlakeManages(e.target.checked)}
          className="accent-[var(--color-gold)]"
        />
        <span className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}>
          Blake manages my ad accounts
        </span>
      </label>

      {!blakeManages && (
        <div className="space-y-3">
          {[
            { name: "Meta Business Manager", desc: "Facebook & Instagram ads" },
            { name: "Google Ads", desc: "Google Search & Display ads" },
          ].map((platform) => (
            <div
              key={platform.name}
              className="flex items-center justify-between rounded-xl border p-4"
              style={{ borderColor: "var(--color-light-gray)" }}
            >
              <div>
                <span className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
                  {platform.name}
                </span>
                <p className="text-xs" style={{ color: "var(--color-mid-gray)" }}>{platform.desc}</p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SetupStep4Review({ onComplete }: { onComplete: () => void }) {
  const { state } = useOnboarding();

  const items = [
    { label: "Account created", done: true },
    { label: "Facility confirmed", done: state.facilityConfirmed },
    { label: "storEDGE connected", done: state.storedgeConnected },
    { label: "Ad accounts connected", done: state.metaConnected || state.googleConnected },
  ];

  const allDone = items.every((i) => i.done);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
        {allDone ? "Everything looks good!" : "Almost there"}
      </h2>
      <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
        {allDone
          ? "All connections are active. You're ready to go."
          : "Some connections are pending. Blake will finish setting these up for you."}
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--color-light-gray)" }}>
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
              style={{
                backgroundColor: item.done ? "var(--color-gold)" : "transparent",
                border: item.done ? "none" : "1.5px solid var(--color-light-gray)",
              }}
            >
              {item.done && <Check className="h-3 w-3 text-white" />}
            </span>
            <span className="text-sm" style={{ fontFamily: "var(--font-heading)", color: item.done ? "var(--color-dark)" : "var(--color-mid-gray)" }}>
              {item.label}
            </span>
            <span
              className="ml-auto text-[10px] font-medium rounded-full px-2 py-0.5"
              style={{
                backgroundColor: item.done ? "rgba(120,140,93,0.15)" : "var(--color-gold-light)",
                color: item.done ? "var(--color-green)" : "var(--color-gold)",
              }}
            >
              {item.done ? "Connected" : "Pending"}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
        Questions? Reach Blake at blake@storageads.com
      </p>

      <button
        type="button"
        onClick={onComplete}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
      >
        Go to your dashboard
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeStep, skipOnboarding } = useOnboarding();

  const stepParam = searchParams.get("step") || "welcome";
  const [currentView, setCurrentView] = useState(stepParam);

  const stepIndex = SETUP_STEPS.findIndex((s) => s.key === currentView);

  const handleSkip = () => {
    skipOnboarding();
    router.push("/admin");
  };

  const handleComplete = () => {
    completeStep("complete");
    router.push("/admin");
  };

  return (
    <div className="space-y-6">
      {/* Step indicator (hidden on welcome) */}
      {currentView !== "welcome" && (
        <div className="flex items-center justify-center gap-2 mb-4">
          {SETUP_STEPS.map((step, i) => {
            const isActive = step.key === currentView;
            const isPast = i < stepIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-1.5">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    fontFamily: "var(--font-heading)",
                    backgroundColor: isActive ? "var(--color-gold)" : isPast ? "var(--color-gold-light)" : "var(--color-light-gray)",
                    color: isActive ? "#fff" : isPast ? "var(--color-gold)" : "var(--color-mid-gray)",
                  }}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span
                  className="text-xs font-medium hidden sm:inline"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: isActive ? "var(--color-dark)" : "var(--color-mid-gray)",
                  }}
                >
                  {step.label}
                </span>
                {i < SETUP_STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 mx-1" style={{ color: "var(--color-light-gray)" }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Views */}
      {currentView === "welcome" && (
        <WelcomeView
          onStart={() => { setCurrentView("facility"); }}
          onSkip={handleSkip}
        />
      )}
      {currentView === "facility" && (
        <SetupStep1Facility
          onNext={() => { completeStep("facility"); setCurrentView("storedge"); }}
        />
      )}
      {currentView === "storedge" && (
        <SetupStep2StorEdge
          onNext={() => { setCurrentView("ad_accounts"); }}
        />
      )}
      {currentView === "ad_accounts" && (
        <SetupStep3AdAccounts
          onNext={() => { setCurrentView("review"); }}
        />
      )}
      {currentView === "review" && (
        <SetupStep4Review onComplete={handleComplete} />
      )}
    </div>
  );
}
