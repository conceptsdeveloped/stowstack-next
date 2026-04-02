// ---------------------------------------------------------------------------
// Shared types and utilities for GBP sub-components
// ---------------------------------------------------------------------------

export interface GBPConnection {
  id: string
  facility_id: string
  status: string
  location_name: string | null
  google_account_id: string | null
  last_sync_at: string | null
  created_at: string
  sync_config: Record<string, boolean>
}

export interface GBPPost {
  id: string
  facility_id: string
  post_type: string
  title: string | null
  body: string
  cta_type: string | null
  cta_url: string | null
  image_url: string | null
  offer_code: string | null
  status: string
  scheduled_at: string | null
  published_at: string | null
  ai_generated: boolean
  error_message: string | null
  created_at: string
}

export interface GBPReview {
  id: string
  rating: number
  author_name: string | null
  review_text: string | null
  review_time: string | null
  response_status: string
  response_text: string | null
  ai_draft: string | null
}

export interface GBPSyncLog {
  id: string
  sync_type: string
  status: string
  error_message: string | null
  created_at: string
}

export interface GBPQuestion {
  id: string
  question_text: string
  author_name: string | null
  question_time: string | null
  answer_status: string
  answer_text: string | null
  ai_draft: string | null
  upvote_count: number
}

export interface GBPInsight {
  id: string
  period_start: string
  period_end: string
  search_views: number
  maps_views: number
  website_clicks: number
  direction_clicks: number
  phone_calls: number
}

export interface InsightsSummary {
  period?: string
  total_impressions?: number
  total_actions?: number
  search_views?: number
  maps_views?: number
  website_clicks?: number
  direction_clicks?: number
  phone_calls?: number
  [key: string]: unknown
}

export interface ReviewStats {
  total: number
  avg_rating: number
  responded: number
  response_rate: number
  distribution: Record<number, number>
}

export interface QAStats {
  total: number
  answered: number
  unanswered: number
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

export const card =
  "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl"
export const textPrimary = "text-[var(--color-dark)]"
export const textSecondary = "text-[var(--color-body-text)]"
export const textTertiary = "text-[var(--color-mid-gray)]"
export const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
export const btnPrimary =
  "px-4 py-2 text-xs font-semibold bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg hover:bg-[var(--color-gold)]/90 disabled:opacity-50 transition-colors"
export const btnSecondary =
  "px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDate(iso: string | null) {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export const postStatusColors: Record<string, string> = {
  draft: "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
  scheduled: "bg-[var(--color-blue)]/10 text-[var(--color-blue)]",
  published: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
}

export const responseStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  ai_drafted: "bg-purple-500/10 text-purple-400",
  published: "bg-emerald-500/10 text-emerald-400",
  skipped: "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]",
}

export function chipClass(status: string, colorMap: Record<string, string>) {
  return `px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status] || "bg-[var(--color-light-gray)] text-[var(--color-body-text)]"}`
}
