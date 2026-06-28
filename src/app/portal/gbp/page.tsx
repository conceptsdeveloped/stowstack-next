"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import { PortalPage, Card, Badge, EmptyState, ErrorState } from "@/components/portal/ui";

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

const HEADER = {
  title: "Google Business Profile",
  subtitle: "Your GBP listing overview and recent reviews",
} as const;

function formatDate(iso: string | null) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
              ? "fill-[var(--color-dark)] text-[var(--color-dark)]"
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

  /* ─── loading ─── */

  if (loading) {
    return (
      <PortalPage title={HEADER.title} subtitle={HEADER.subtitle} maxWidth="4xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-dark)]" />
        </div>
      </PortalPage>
    );
  }

  /* ─── error ─── */

  if (error) {
    return (
      <PortalPage title={HEADER.title} subtitle={HEADER.subtitle} maxWidth="4xl">
        <ErrorState message={error} onRetry={fetchData} />
      </PortalPage>
    );
  }

  /* ─── not connected ─── */

  if (!data?.connected) {
    return (
      <PortalPage title={HEADER.title} subtitle={HEADER.subtitle} maxWidth="4xl">
        <EmptyState
          icon={<XCircle className="h-10 w-10" />}
          title="Not Connected"
          message="Your Google Business Profile is not yet connected. Contact your account manager to set up GBP integration."
        />
      </PortalPage>
    );
  }

  /* ─── connected view ─── */

  return (
    <PortalPage title={HEADER.title} subtitle={HEADER.subtitle} maxWidth="4xl">
      <div className="space-y-6">
        {/* Connection status + location */}
        <Card as="section">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[var(--color-dark)]" />
              <div>
                <h3 className="text-base font-semibold text-[var(--color-dark)]">
                  {data.locationName || "Your Facility"}
                </h3>
                <p className="text-xs text-[var(--color-mid-gray)]">
                  Last synced: {formatDate(data.lastSyncAt)}
                </p>
              </div>
            </div>
            <Badge tone="success" className="w-fit px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </Badge>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Average rating */}
          <Card className="text-center">
            <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Average Rating</p>
            <p className="text-3xl font-semibold text-[var(--color-dark)]">
              {data.averageRating.toFixed(1)}
            </p>
            <div className="mt-2 flex justify-center">
              <Stars rating={data.averageRating} size="lg" />
            </div>
          </Card>

          {/* Total reviews */}
          <Card className="text-center">
            <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Total Reviews</p>
            <p className="text-3xl font-semibold text-[var(--color-dark)]">
              {data.totalReviews}
            </p>
            <p className="mt-2 text-xs text-[var(--color-body-text)]">All time</p>
          </Card>

          {/* Response rate */}
          <Card className="text-center">
            <p className="mb-1 text-xs text-[var(--color-mid-gray)]">Response Rate</p>
            <p className="text-3xl font-semibold text-[var(--color-dark)]">
              {data.responseRate}%
            </p>
            <div className="mx-auto mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
              <div
                className="h-full rounded-full bg-[var(--color-dark)]"
                style={{ width: `${Math.min(data.responseRate, 100)}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Recent reviews */}
        <section className="overflow-hidden rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Recent Reviews</h3>
          </div>

          {data.recentReviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No reviews yet"
              message="New Google reviews will show up here once they come in."
            />
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
                      <Badge tone={review.hasResponse ? "success" : "warn"}>
                        {review.hasResponse ? "Responded" : "Pending"}
                      </Badge>
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
        </section>
      </div>
    </PortalPage>
  );
}
