"use client";

import { useState, useCallback } from "react";
import { adminFetch } from "@/hooks/use-admin-fetch";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Search,
} from "lucide-react";

interface QuickResult {
  success: boolean;
  slug: string;
  auditUrl: string;
  overallScore: number;
  overallGrade: string;
}

interface LookupResult {
  found: boolean;
  name?: string;
  address?: string;
  website?: string;
  rating?: number | null;
  reviewCount?: number;
  message?: string;
}

/**
 * Quick Diagnostic — generate a shareable /audit/[slug] link from public data
 * alone (no 40-field intake). Look up a facility by name + city to autofill the
 * Google signals (the same lookup the public audit tool uses), then generate.
 */
export default function QuickAuditPage() {
  // Lookup step
  const [lookupName, setLookupName] = useState("");
  const [lookupLocation, setLookupLocation] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);

  // Diagnostic inputs (autofilled by lookup, still editable)
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleRating, setGoogleRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Generation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [copied, setCopied] = useState(false);

  const canLookup = lookupName.trim() && lookupLocation.trim() && !lookupLoading;
  const canSubmit = facilityName.trim() && facilityAddress.trim() && !loading;

  const lookup = useCallback(async () => {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const data = await adminFetch<LookupResult>("/api/facility-lookup", {
        method: "POST",
        body: JSON.stringify({
          facilityName: lookupName.trim(),
          location: lookupLocation.trim(),
        }),
      });
      if (!data.found) {
        setLookupError(data.message || "No matching facility found on Google.");
        return;
      }
      setFacilityName(data.name || lookupName.trim());
      setFacilityAddress(data.address || "");
      setWebsiteUrl(data.website || "");
      setGoogleRating(data.rating != null ? String(data.rating) : "");
      setReviewCount(data.reviewCount != null ? String(data.reviewCount) : "");
      setLookedUp(true);
      setResult(null);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupName, lookupLocation]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await adminFetch<QuickResult>("/api/audit-quick-diagnostic", {
        method: "POST",
        body: JSON.stringify({
          facilityName,
          facilityAddress,
          websiteUrl,
          googleRating,
          reviewCount,
          contactEmail,
        }),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [facilityName, facilityAddress, websiteUrl, googleRating, reviewCount, contactEmail]);

  const copyLink = useCallback(() => {
    if (!result?.auditUrl) return;
    navigator.clipboard.writeText(result.auditUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const field =
    "w-full px-3 py-2 rounded text-sm bg-[var(--bg)] border border-[var(--bdr)] text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/20";
  const label = "block text-xs font-medium text-[var(--ink2)] mb-1";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[var(--ink)]" />
        <h1 className="text-xl font-semibold text-[var(--ink)]">Quick Diagnostic</h1>
      </div>
      <p className="text-sm text-[var(--ink2)] mb-6">
        Generate a shareable diagnostic link from public data only. Look up a
        facility to autofill its Google signals, then generate. Use it for
        outbound when you don&apos;t have the operator&apos;s full intake yet.
      </p>

      {/* Step 1 — look up the facility */}
      <div className="rounded-lg bg-[var(--card)] border border-[var(--bdr)] p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink2)] mb-3">
          1 · Find the facility
        </p>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className={label} htmlFor="qa-lookup-name">Facility name</label>
            <input id="qa-lookup-name" className={field} value={lookupName}
              onChange={(e) => setLookupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canLookup) lookup(); }}
              placeholder="Sunset Self Storage" />
          </div>
          <div>
            <label className={label} htmlFor="qa-lookup-loc">City / state</label>
            <input id="qa-lookup-loc" className={field} value={lookupLocation}
              onChange={(e) => setLookupLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canLookup) lookup(); }}
              placeholder="Austin, TX" />
          </div>
          <button
            onClick={lookup}
            disabled={!canLookup}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Look up
          </button>
        </div>
        {lookupError && (
          <p className="mt-2 text-xs text-[var(--color-red)]">{lookupError}</p>
        )}
      </div>

      {/* Step 2 — confirm / edit the details */}
      <div className="rounded-lg bg-[var(--card)] border border-[var(--bdr)] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink2)]">
          2 · Confirm details {lookedUp && <span className="text-[var(--color-green)] normal-case font-normal">· autofilled from Google</span>}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="qa-name">Facility name *</label>
            <input id="qa-name" className={field} value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="Sunset Self Storage" />
          </div>
          <div>
            <label className={label} htmlFor="qa-addr">Address *</label>
            <input id="qa-addr" className={field} value={facilityAddress}
              onChange={(e) => setFacilityAddress(e.target.value)}
              placeholder="123 Main St, Austin, TX" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="qa-web">Website</label>
            <input id="qa-web" className={field} value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://sunsetstorage.com" />
          </div>
          <div>
            <label className={label} htmlFor="qa-rating">Google rating</label>
            <input id="qa-rating" className={field} value={googleRating}
              onChange={(e) => setGoogleRating(e.target.value)}
              placeholder="4.2" inputMode="decimal" />
          </div>
          <div>
            <label className={label} htmlFor="qa-reviews">Review count</label>
            <input id="qa-reviews" className={field} value={reviewCount}
              onChange={(e) => setReviewCount(e.target.value)}
              placeholder="87" inputMode="numeric" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="qa-email">Operator email (optional — emails them the link)</label>
            <input id="qa-email" className={field} value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@facility.com" type="email" />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded text-sm font-semibold bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating (30-60s)…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate diagnostic</>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--card)] p-4 text-sm text-[var(--color-red)]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-[var(--bdr)] bg-[var(--card)] p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{facilityName}</p>
              <p className="text-xs text-[var(--ink2)]">
                Score {result.overallScore}/100 · Grade {result.overallGrade}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={result.auditUrl}
              className={`${field} font-mono text-xs`}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition-opacity shrink-0"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
            <a
              href={result.auditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium border border-[var(--bdr)] text-[var(--ink)] hover:bg-[var(--ink)]/5 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
