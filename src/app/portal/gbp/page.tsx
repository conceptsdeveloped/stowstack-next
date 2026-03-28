"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";

/* ─── types ─── */

interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  reviewTime: string | null;
  responseStatus: string;
  hasResponse: boolean;
}

interface GbpData {
  connected: boolean;
  locationName: string | null;
  lastSyncAt: string | null;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  recentReviews: Review[];
}

/* ─── star rendering ─── */

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < Math.round(rating)
              ? "fill-[var(--color-gold)] text-[var(--color-gold)]"
              : "fill-none text-[var(--color-mid-gray)]"
          }`}
        />
      ))}
    </span>
  );
}

/* ─── page ─── */

export default function GbpPage() {
  const { session } = usePortal();
  const [data, setData] = useState<GbpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/portal-gbp?accessCode=${session.accessCode}&email=${encodeURIComponent(session.email)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: GbpData = await res.json();
      setData(json);
    } catch {
      setError("Unable to load Google Business Profile data.");
    } finally {
      setLoading(false);
    }
  }, [session.accessCode, session.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── loading state ─── */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">
            Google Business Profile
          </h2>
          <p className="text-sm text-[var(--color-mid-gray)]">
            Your GBP listing overview and recent reviews
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-gold)]" />
        </div>
      </div>
    );
  }

  /* ─── error state ─── */

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">
            Google Business Profile
          </h2>
          <p className="text-sm text-[var(--color-mid-gray)]">
            Your GBP listing overview and recent reviews
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="mb-3 text-sm text-[var(--color-body-text)]">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-light)] hover:bg-[var(--color-gold-hover)] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ─── not connected ─── */

  if (!data?.connected) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">
            Google Business Profile
          </h2>
          <p className="text-sm text-[var(--color-mid-gray)]">
            Your GBP listing overview and recent reviews
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-10 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-[var(--color-mid-gray)]" />
          <h3 className="mb-2 text-base font-semibold text-[var(--color-dark)]">
            Not Connected
          </h3>
          <p className="text-sm text-[var(--color-body-text)]">
            Your Google Business Profile is not yet connected. Contact your account manager to set up GBP integration.
          </p>
        </div>
      </div>
    );
  }

  /* ─── connected view ─── */

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-dark)]">
          Google Business Profile
        </h2>
        <p className="text-sm text-[var(--color-mid-gray)]">
          Your GBP listing overview and recent reviews
        </p>
      </div>

      {/* Connection status + location */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[var(--color-gold)]" />
            <div>
              <h3 className="text-base font-semibold text-[var(--color-dark)]">
                {data.locationName || "Your Facility"}
              </h3>
              <p className="text-xs text-[var(--color-mid-gray)]">
                Last synced: {formatDate(data.lastSyncAt)}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Average rating */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 text-center">
          <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Average Rating</p>
          <p className="text-3xl font-semibold text-[var(--color-gold)]">
            {data.averageRating.toFixed(1)}
          </p>
          <div className="mt-2 flex justify-center">
            <Stars rating={data.averageRating} size="lg" />
          </div>
        </div>

        {/* Total reviews */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 text-center">
          <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Total Reviews</p>
          <p className="text-3xl font-semibold text-[var(--color-dark)]">
            {data.totalReviews}
          </p>
          <p className="mt-2 text-xs text-[var(--color-body-text)]">
            All time
          </p>
        </div>

        {/* Response rate */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 text-center">
          <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Response Rate</p>
          <p className="text-3xl font-semibold text-[var(--color-dark)]">
            {data.responseRate}%
          </p>
          <div className="mx-auto mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
            <div
              className="h-full rounded-full bg-[var(--color-gold)]"
              style={{ width: `${Math.min(data.responseRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-dark)]">
            Recent Reviews
          </h3>
        </div>

        {data.recentReviews.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
            <p className="text-sm text-[var(--color-body-text)]">No reviews yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.recentReviews.map((review) => (
              <div key={review.id} className="px-5 py-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--color-mid-gray)]" />
                    <span className="text-sm font-medium text-[var(--color-dark)]">
                      {review.authorName}
                    </span>
                    <Stars rating={review.rating} />
                  </div>
                  <div className="flex items-center gap-3">
                    {review.reviewTime && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-mid-gray)]">
                        <Clock className="h-3 w-3" />
                        {formatDate(review.reviewTime)}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        review.hasResponse
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {review.hasResponse ? "Responded" : "Pending"}
                    </span>
                  </div>
                </div>
                {review.text && (
                  <p className="text-sm leading-relaxed text-[var(--color-body-text)]">
                    {review.text.length > 200
                      ? `${review.text.slice(0, 200)}...`
                      : review.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
