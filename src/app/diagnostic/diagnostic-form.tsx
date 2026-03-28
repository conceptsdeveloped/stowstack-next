"use client";

import { useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  "Facility Info",
  "Occupancy",
  "Marketing",
  "Digital Presence",
  "Priorities",
];

const OCCUPANCY_OPTIONS = [
  "Under 50%",
  "50–59%",
  "60–69%",
  "70–79%",
  "80–84%",
  "85–89%",
  "90–94%",
  "95%+",
];

const LEASING_MOMENTUM = [
  "Gaining — trending up",
  "Stable — holding steady",
  "Losing — trending down",
  "Seasonal dip",
  "Not sure",
];

const TOTAL_UNITS = [
  "Under 100",
  "100–199",
  "200–349",
  "350–499",
  "500–749",
  "750–999",
  "1,000+",
];

const MARKETING_CHANNELS = [
  "Google Ads (PPC)",
  "Facebook / Instagram Ads",
  "SEO / Organic search",
  "Google Business Profile",
  "SpareFoot / Storable marketplace",
  "Print / Direct mail",
  "Signage / Drive-by traffic",
  "Referrals",
  "None / No active marketing",
];

const MONTHLY_AD_SPEND = [
  "$0 — no paid ads",
  "Under $500/mo",
  "$500–$1,000/mo",
  "$1,000–$2,500/mo",
  "$2,500–$5,000/mo",
  "$5,000+/mo",
  "Not sure",
];

const GOOGLE_ADS_PERFORMANCE = [
  "Great — strong ROI",
  "Okay — decent but could improve",
  "Poor — feels like wasted money",
  "Not sure / don't track",
  "Not running Google Ads",
];

const WHO_MANAGES_MARKETING = [
  "I manage it myself",
  "In-house team / corporate",
  "A general marketing agency",
  "A storage-specific agency",
  "Nobody — it's not actively managed",
];

const GOOGLE_REVIEW_COUNT = [
  "Under 10",
  "10–25",
  "25–50",
  "50–100",
  "100–200",
  "200+",
];

const GOOGLE_RATING = [
  "Under 3.0",
  "3.0–3.4",
  "3.5–3.9",
  "4.0–4.2",
  "4.3–4.5",
  "4.6–4.8",
  "4.9–5.0",
  "Not sure",
];

const GBP_STATUS = [
  "Yes — claimed and actively managed",
  "Yes — claimed but rarely updated",
  "Not sure",
  "No — not claimed",
];

const WEBSITE_LAST_UPDATED = [
  "Within the last 6 months",
  "6–12 months ago",
  "1–2 years ago",
  "3+ years ago",
  "Not sure",
];

const PMS_OPTIONS = [
  "SiteLink (Storable)",
  "storEDGE (Storable)",
  "Facility Manager (Storable)",
  "Hummingbird (Tenant Inc.)",
  "DoorSwap",
  "Easy Storage Solutions",
  "Storage Commander",
  "Yardi Breeze",
  "Other",
  "None / Spreadsheet",
];

const BIGGEST_ISSUE = [
  "Not enough leads coming in",
  "Plenty of leads, not enough are converting to move-ins",
  "Both — not enough leads AND they're not converting",
  "Revenue per unit is too low",
  "Operations are stretched thin",
  "Not sure where to start",
];

const AGGRESSIVENESS = [
  "Very aggressive — do whatever it takes",
  "Moderately aggressive — open to change but measured",
  "Conservative — small changes only",
  "Just want information right now",
];

const URGENCY = [
  "Immediately — need help now",
  "Within 30 days",
  "Within 90 days",
  "Just exploring — no rush",
];

/* ------------------------------------------------------------------ */
/*  Form field components                                              */
/* ------------------------------------------------------------------ */

function Input({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--color-dark)]/10 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-colors text-sm"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required = false,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--color-dark)]/10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-colors text-sm"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkboxes({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
              selected.includes(opt)
                ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--text-primary)]"
                : "border-[var(--color-dark)]/10 bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                selected.includes(opt)
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--color-dark)]/20"
              }`}
            >
              {selected.includes(opt) && (
                <svg
                  viewBox="0 0 12 12"
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function Textarea({
  label,
  name,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--color-dark)]/10 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-colors text-sm resize-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Form Component                                                */
/* ------------------------------------------------------------------ */

export function DiagnosticForm() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Facility Info
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Step 2: Occupancy
  const [occupancy, setOccupancy] = useState("");
  const [leasingMomentum, setLeasingMomentum] = useState("");
  const [moveIns, setMoveIns] = useState("");
  const [moveOuts, setMoveOuts] = useState("");
  const [totalUnits, setTotalUnits] = useState("");

  // Step 3: Marketing
  const [currentMarketing, setCurrentMarketing] = useState<string[]>([]);
  const [monthlyAdSpend, setMonthlyAdSpend] = useState("");
  const [googleAdsPerformance, setGoogleAdsPerformance] = useState("");
  const [whoManagesMarketing, setWhoManagesMarketing] = useState("");

  // Step 4: Digital Presence
  const [googleReviewCount, setGoogleReviewCount] = useState("");
  const [googleRating, setGoogleRating] = useState("");
  const [gbpStatus, setGbpStatus] = useState("");
  const [lastWebsiteUpdate, setLastWebsiteUpdate] = useState("");
  const [pms, setPms] = useState("");

  // Step 5: Priorities
  const [biggestIssue, setBiggestIssue] = useState("");
  const [fixOneThingFirst, setFixOneThingFirst] = useState("");
  const [aggressiveness, setAggressiveness] = useState("");
  const [urgency, setUrgency] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const canAdvance = () => {
    if (step === 0) return !!(facilityName && contactEmail);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const responses: Record<string, string | string[]> = {
        "About where is your facility sitting today (overall occupancy)?":
          occupancy,
        "How would you describe the facility's leasing momentum right now?":
          leasingMomentum,
        "Roughly how many move-ins have you had in the last 30 days?": moveIns,
        "Roughly how many move-outs in the last 30 days?": moveOuts,
        "What is your total unit count (approximately)?": totalUnits,
        "What marketing / advertising are you currently running? (select all)":
          currentMarketing.join(", "),
        "What is your approximate total monthly marketing / ad spend?":
          monthlyAdSpend,
        "If you run Google Ads, how would you describe the performance?":
          googleAdsPerformance,
        "Who manages your marketing / ads?": whoManagesMarketing,
        "Approximately how many Google reviews does your facility have?":
          googleReviewCount,
        "What is your approximate Google review rating?": googleRating,
        "Is your Google Business Profile (GBP) claimed and actively managed?":
          gbpStatus,
        "When was the last time your website was meaningfully updated?":
          lastWebsiteUpdate,
        "Which PMS / management software do you use?": pms,
        "What feels like the bigger issue right now?": biggestIssue,
        "If this diagnostic could fix only ONE thing, what should it fix first?":
          fixOneThingFirst,
        "How aggressive are you willing to be if the audit shows changes are needed?":
          aggressiveness,
        "How soon are you looking to take action?": urgency,
        "Anything else you want us to know before we review your facility?":
          additionalNotes,
      };

      const res = await fetch("/api/diagnostic-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityName,
          facilityAddress,
          contactName,
          contactEmail,
          contactPhone,
          websiteUrl,
          responses,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
            Your Diagnostic is Being Generated
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
            Our AI is analyzing your facility data right now. You&apos;ll receive
            your full diagnostic report at{" "}
            <strong className="text-[var(--text-primary)]">
              {contactEmail}
            </strong>{" "}
            — typically within minutes.
          </p>
          <p className="text-sm text-[var(--text-secondary)]/70 mb-8">
            Your report will include scores across 8 categories, industry
            benchmarks, a 90-day action plan, and estimated revenue
            opportunities.
          </p>
          <Link
            href="/"
            className="inline-flex px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Back to StorageAds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
      {/* Header / Branding */}
      <div className="text-center mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold text-sm mb-6 hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          StorageAds
        </Link>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-3">
          Free Facility Diagnostic
        </h1>
        <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
          Get a comprehensive AI-powered analysis of your self-storage
          facility across 8 key categories. Takes about 5 minutes.
        </p>
      </div>

      {/* What You Get */}
      <div className="rounded-xl border border-[var(--color-dark)]/10 bg-[var(--bg-elevated)] p-5 mb-8">
        <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
          Your diagnostic includes
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
          {[
            "Overall facility score",
            "8-category breakdown",
            "Industry benchmarks",
            "Revenue opportunity analysis",
            "90-day action plan",
            "Cost of inaction estimate",
            "Competitive positioning",
            "Priority recommendations",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-sm text-[var(--text-secondary)]/70">
            {STEPS[step]}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Steps */}
      <div className="rounded-2xl border border-[var(--color-dark)]/10 bg-[var(--bg-elevated)] p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Facility Information
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Tell us about your facility and how to reach you.
            </p>
            <Input
              label="Facility Name"
              name="facilityName"
              required
              placeholder="e.g. Sunset Self Storage"
              value={facilityName}
              onChange={setFacilityName}
            />
            <Input
              label="Facility Address (City, State, ZIP)"
              name="facilityAddress"
              placeholder="e.g. 123 Main St, Austin, TX 78701"
              value={facilityAddress}
              onChange={setFacilityAddress}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Your Name"
                name="contactName"
                placeholder="e.g. Jane Smith"
                value={contactName}
                onChange={setContactName}
              />
              <Input
                label="Email Address"
                name="contactEmail"
                type="email"
                required
                placeholder="you@email.com"
                value={contactEmail}
                onChange={setContactEmail}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Phone Number"
                name="contactPhone"
                type="tel"
                placeholder="(555) 123-4567"
                value={contactPhone}
                onChange={setContactPhone}
              />
              <Input
                label="Website URL"
                name="websiteUrl"
                placeholder="https://..."
                value={websiteUrl}
                onChange={setWebsiteUrl}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Occupancy Snapshot
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Help us understand where your facility stands today.
            </p>
            <Select
              label="Current Overall Occupancy"
              name="occupancy"
              options={OCCUPANCY_OPTIONS}
              value={occupancy}
              onChange={setOccupancy}
            />
            <Select
              label="Leasing Momentum"
              name="leasingMomentum"
              options={LEASING_MOMENTUM}
              value={leasingMomentum}
              onChange={setLeasingMomentum}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Move-ins (last 30 days)"
                name="moveIns"
                placeholder="e.g. 12"
                value={moveIns}
                onChange={setMoveIns}
              />
              <Input
                label="Move-outs (last 30 days)"
                name="moveOuts"
                placeholder="e.g. 8"
                value={moveOuts}
                onChange={setMoveOuts}
              />
            </div>
            <Select
              label="Total Unit Count (approximate)"
              name="totalUnits"
              options={TOTAL_UNITS}
              value={totalUnits}
              onChange={setTotalUnits}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Marketing & Advertising
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Tell us about your current marketing efforts.
            </p>
            <Checkboxes
              label="Current marketing channels (select all that apply)"
              options={MARKETING_CHANNELS}
              selected={currentMarketing}
              onChange={setCurrentMarketing}
            />
            <Select
              label="Monthly Ad Spend"
              name="monthlyAdSpend"
              options={MONTHLY_AD_SPEND}
              value={monthlyAdSpend}
              onChange={setMonthlyAdSpend}
            />
            <Select
              label="Google Ads Performance"
              name="googleAdsPerformance"
              options={GOOGLE_ADS_PERFORMANCE}
              value={googleAdsPerformance}
              onChange={setGoogleAdsPerformance}
            />
            <Select
              label="Who Manages Marketing"
              name="whoManagesMarketing"
              options={WHO_MANAGES_MARKETING}
              value={whoManagesMarketing}
              onChange={setWhoManagesMarketing}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Digital Presence
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Help us evaluate your online footprint.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Google Review Count"
                name="googleReviewCount"
                options={GOOGLE_REVIEW_COUNT}
                value={googleReviewCount}
                onChange={setGoogleReviewCount}
              />
              <Select
                label="Google Rating"
                name="googleRating"
                options={GOOGLE_RATING}
                value={googleRating}
                onChange={setGoogleRating}
              />
            </div>
            <Select
              label="Google Business Profile Status"
              name="gbpStatus"
              options={GBP_STATUS}
              value={gbpStatus}
              onChange={setGbpStatus}
            />
            <Select
              label="Website Last Updated"
              name="lastWebsiteUpdate"
              options={WEBSITE_LAST_UPDATED}
              value={lastWebsiteUpdate}
              onChange={setLastWebsiteUpdate}
            />
            <Select
              label="PMS / Management Software"
              name="pms"
              options={PMS_OPTIONS}
              value={pms}
              onChange={setPms}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Priorities & Goals
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Tell us what matters most so we can tailor your diagnostic.
            </p>
            <Select
              label="What feels like the bigger issue right now?"
              name="biggestIssue"
              options={BIGGEST_ISSUE}
              value={biggestIssue}
              onChange={setBiggestIssue}
            />
            <Input
              label="If this diagnostic could fix ONE thing, what should it fix?"
              name="fixOneThingFirst"
              placeholder="e.g. We need more move-ins from online channels"
              value={fixOneThingFirst}
              onChange={setFixOneThingFirst}
            />
            <Select
              label="How aggressive are you willing to be?"
              name="aggressiveness"
              options={AGGRESSIVENESS}
              value={aggressiveness}
              onChange={setAggressiveness}
            />
            <Select
              label="How soon are you looking to take action?"
              name="urgency"
              options={URGENCY}
              value={urgency}
              onChange={setUrgency}
            />
            <Textarea
              label="Anything else we should know?"
              name="additionalNotes"
              placeholder="Any unusual circumstances, specific goals, or context that would help us..."
              value={additionalNotes}
              onChange={setAdditionalNotes}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-dark)]/5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Diagnostic"}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[var(--text-secondary)]/50">
          Your information is kept confidential and is only used to generate
          your facility diagnostic.
        </p>
        <p className="text-xs text-[var(--text-secondary)]/50 mt-1">
          Powered by{" "}
          <Link href="/" className="text-[var(--accent)] hover:underline">
            StorageAds
          </Link>{" "}
          by StorageAds.com
        </p>
      </div>

      {/* Sample Link */}
      <div className="mt-6 text-center">
        <Link
          href="/audit/sample"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          See a sample diagnostic report
        </Link>
      </div>
    </div>
  );
}
