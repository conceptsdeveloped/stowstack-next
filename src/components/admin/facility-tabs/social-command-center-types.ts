// ---------------------------------------------------------------------------
// Shared types, config, and style constants for Social Command Center
// ---------------------------------------------------------------------------

export interface SocialPost {
  id: string
  facility_id: string
  platform: "facebook" | "instagram" | "gbp"
  post_type: string
  content: string
  hashtags: string[]
  media_urls: string[]
  cta_url: string | null
  status: "draft" | "scheduled" | "publishing" | "published" | "failed"
  scheduled_at: string | null
  published_at: string | null
  external_post_id: string | null
  external_url: string | null
  error_message: string | null
  engagement: {
    reach: number
    impressions: number
    likes: number
    comments: number
    shares: number
    clicks: number
  }
  ai_generated: boolean
  batch_id: string | null
  suggested_image: string | null
  created_at: string
  updated_at: string
}

export type Platform = "facebook" | "instagram" | "gbp"
export type PostType =
  | "promotion"
  | "tip"
  | "testimonial"
  | "seasonal"
  | "behind_the_scenes"
  | "unit_spotlight"
  | "community"
  | "holiday"
export type SubView = "calendar" | "drafts" | "published" | "metrics"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const PLATFORM_CONFIG = {
  facebook: {
    label: "Facebook",
    color: "bg-[var(--color-blue)]",
    textColor: "text-[var(--color-blue)]",
    dotColor: "bg-[var(--color-blue)]",
    icon: "\uD83D\uDCD8",
    charLimit: 63206,
  },
  instagram: {
    label: "Instagram",
    color: "bg-pink-500",
    textColor: "text-pink-400",
    dotColor: "bg-pink-500",
    icon: "\uD83D\uDCF7",
    charLimit: 2200,
  },
  gbp: {
    label: "Google Business",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    dotColor: "bg-emerald-500",
    icon: "\uD83D\uDCCD",
    charLimit: 1500,
  },
} as const

export const POST_TYPES: Record<string, { label: string; icon: string }> = {
  promotion: { label: "Promotion", icon: "\uD83C\uDFF7\uFE0F" },
  tip: { label: "Storage Tip", icon: "\uD83D\uDCA1" },
  testimonial: { label: "Testimonial", icon: "\u2B50" },
  seasonal: { label: "Seasonal", icon: "\uD83C\uDF24\uFE0F" },
  behind_the_scenes: { label: "Behind the Scenes", icon: "\uD83D\uDD27" },
  unit_spotlight: { label: "Unit Spotlight", icon: "\uD83D\uDCE6" },
  community: { label: "Community", icon: "\uD83C\uDFD8\uFE0F" },
  holiday: { label: "Holiday", icon: "\uD83C\uDF89" },
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "Draft", bg: "bg-[var(--color-light-gray)]", text: "text-[var(--color-body-text)]" },
  scheduled: {
    label: "Scheduled",
    bg: "bg-[var(--color-blue)]/10",
    text: "text-[var(--color-blue)]",
  },
  publishing: {
    label: "Publishing...",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  published: {
    label: "Published",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  failed: { label: "Failed", bg: "bg-red-500/10", text: "text-red-400" },
}

export const TONE_OPTIONS = [
  {
    value: "friendly",
    label: "Friendly & Approachable",
    desc: "Warm, conversational, uses emojis",
  },
  {
    value: "professional",
    label: "Professional",
    desc: "Clean, authoritative, no slang",
  },
  {
    value: "urgent",
    label: "Urgency-driven",
    desc: "Direct, action-oriented, time-sensitive",
  },
  {
    value: "premium",
    label: "Premium",
    desc: "Polished, high-end feel",
  },
]

export const HASHTAG_SETS: Record<string, string[]> = {
  storage: [
    "#selfstorage",
    "#storageunits",
    "#storagesolutions",
    "#storagespace",
    "#climatecontrolled",
  ],
  moving: [
    "#moving",
    "#movingday",
    "#relocation",
    "#movingtips",
    "#newbeginnings",
  ],
  seasonal: [
    "#springcleaning",
    "#declutter",
    "#organization",
    "#organize",
    "#tidy",
  ],
  community: [
    "#localbusiness",
    "#supportlocal",
    "#community",
    "#smallbusiness",
    "#neighborhood",
  ],
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const SEASONAL_MARKERS: Record<string, { label: string; color: string }> = {
  "1": { label: "New Year Declutter", color: "bg-[var(--color-blue)]/20 text-[var(--color-blue)]" },
  "3": {
    label: "Spring Cleaning",
    color: "bg-green-500/20 text-green-400",
  },
  "5": {
    label: "Moving Season",
    color: "bg-orange-500/20 text-orange-400",
  },
  "6": { label: "Peak Moving", color: "bg-red-500/20 text-red-400" },
  "8": {
    label: "College Move-In",
    color: "bg-purple-500/20 text-purple-400",
  },
  "10": {
    label: "Fall Transition",
    color: "bg-amber-500/20 text-amber-400",
  },
  "12": {
    label: "Holiday Storage",
    color: "bg-emerald-500/20 text-emerald-400",
  },
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

export const cardCls = "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl"
export const textPrimary = "text-[var(--color-dark)]"
export const textSecondary = "text-[var(--color-body-text)]"
export const textTertiary = "text-[var(--color-mid-gray)]"
export const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
