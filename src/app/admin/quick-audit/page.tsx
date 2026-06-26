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
} from "lucide-react";

interface QuickResult {
  success: boolean;
  slug: string;
  auditUrl: string;
  overallScore: number;
  overallGrade: string;
}

/**
 * Quick Diagnostic — generate a shareable /audit/[slug] link from public data
 * alone (no 40-field intake). Paste what the audit tool already surfaces from
 * the Google lookup, hit generate, copy the link into an outbound message.
 */
export default function QuickAuditPage() {
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleRating, setGoogleRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = facilityName.trim() && facilityAddress.trim() && !loading;

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
        Generate a shareable diagnostic link from public data only. Name and
        address are required; the rest sharpens the result. Use it for outbound
        when you don&apos;t have the operator&apos;s full intake yet.
      </p>

      <div className="rounded-lg bg-[var(--card)] border border-[var(--bdr)] p-5 space-y-4">
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
