"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Loader2,
  Sparkles,
  Plus,
  RefreshCw,
  Send,
  CalendarDays,
  BarChart3,
  AlertTriangle,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  List,
  Save,
  X,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocialPost {
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

type Platform = "facebook" | "instagram" | "gbp"
type PostType =
  | "promotion"
  | "tip"
  | "testimonial"
  | "seasonal"
  | "behind_the_scenes"
  | "unit_spotlight"
  | "community"
  | "holiday"
type SubView = "calendar" | "drafts" | "published" | "metrics"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG = {
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

const POST_TYPES: Record<string, { label: string; icon: string }> = {
  promotion: { label: "Promotion", icon: "\uD83C\uDFF7\uFE0F" },
  tip: { label: "Storage Tip", icon: "\uD83D\uDCA1" },
  testimonial: { label: "Testimonial", icon: "\u2B50" },
  seasonal: { label: "Seasonal", icon: "\uD83C\uDF24\uFE0F" },
  behind_the_scenes: { label: "Behind the Scenes", icon: "\uD83D\uDD27" },
  unit_spotlight: { label: "Unit Spotlight", icon: "\uD83D\uDCE6" },
  community: { label: "Community", icon: "\uD83C\uDFD8\uFE0F" },
  holiday: { label: "Holiday", icon: "\uD83C\uDF89" },
}

const STATUS_CONFIG: Record<
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

const TONE_OPTIONS = [
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

const HASHTAG_SETS: Record<string, string[]> = {
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
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

const SEASONAL_MARKERS: Record<string, { label: string; color: string }> = {
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

const cardCls = "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl"
const textPrimary = "text-[var(--color-dark)]"
const textSecondary = "text-[var(--color-body-text)]"
const textTertiary = "text-[var(--color-mid-gray)]"
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className={`rounded-xl px-3 py-2 ${cardCls}`}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)]">
        {label}
      </p>
      <p className={`text-lg font-semibold ${accent || textPrimary}`}>{value}</p>
    </div>
  )
}

function EmptyState({
  message,
  action,
  onAction,
}: {
  message: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="text-center py-10">
      <CalendarDays size={32} className={`mx-auto mb-3 ${textTertiary}`} />
      <p className={`font-medium ${textPrimary}`}>{message}</p>
      <p className={`text-sm ${textTertiary} mt-1`}>{action}</p>
      <button
        onClick={onAction}
        className="mt-4 px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-sm font-medium hover:bg-[var(--color-gold)]/90 transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}

// ── PostCard ──

function PostCard({
  post,
  adminKey,
  onUpdate,
}: {
  post: SocialPost
  adminKey: string
  onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const platform = PLATFORM_CONFIG[post.platform]
  const postType = POST_TYPES[post.post_type] || {
    label: post.post_type,
    icon: "\uD83D\uDCDD",
  }
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch("/api/publish-social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ postId: post.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Publish failed")
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch("/api/social-posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ id: post.id, content: editContent }),
      })
      setEditing(false)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return
    setDeleting(true)
    try {
      await fetch(`/api/social-posts?id=${post.id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      })
      onUpdate()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSchedule() {
    await fetch("/api/social-posts", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id: post.id, status: "scheduled" }),
    })
    onUpdate()
  }

  const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null
  const truncatedContent =
    post.content.length > 120 ? post.content.slice(0, 120) + "..." : post.content

  return (
    <div
      className={`border border-[var(--border-subtle)] rounded-xl overflow-hidden transition-all bg-[var(--bg-elevated)] ${expanded ? "ring-1 ring-[var(--color-gold)]/20" : ""}`}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${platform.dotColor}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium ${platform.textColor}`}>
              {platform.icon} {platform.label}
            </span>
            <span className={`text-xs ${textTertiary}`}>&middot;</span>
            <span className={`text-xs ${textTertiary}`}>
              {postType.icon} {postType.label}
            </span>
            {post.ai_generated && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
                AI
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={5}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-xs font-medium hover:bg-[var(--color-gold)]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditContent(post.content)
                  }}
                  className="px-3 py-1 border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--color-body-text)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`text-sm ${textPrimary} cursor-pointer`}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? post.content : truncatedContent}
            </p>
          )}

          {scheduledDate && (
            <p
              className={`text-xs mt-1.5 flex items-center gap-1 ${textTertiary}`}
            >
              <Clock size={11} />
              {scheduledDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {scheduledDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}

          {expanded && post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {expanded && post.suggested_image && (
            <div className="mt-2 flex items-start gap-2 rounded-lg p-2 bg-[var(--color-light-gray)]">
              <ImageIcon size={14} className={textTertiary} />
              <p className={`text-xs ${textTertiary}`}>
                {post.suggested_image}
              </p>
            </div>
          )}

          {post.error_message && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle size={11} /> {post.error_message}
            </p>
          )}

          {/* Engagement metrics if published */}
          {expanded &&
            post.status === "published" &&
            post.engagement &&
            (post.engagement.likes > 0 ||
              post.engagement.comments > 0 ||
              post.engagement.shares > 0) && (
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                {post.engagement.impressions > 0 && (
                  <span className={`text-xs ${textTertiary}`}>
                    {post.engagement.impressions.toLocaleString()} impressions
                  </span>
                )}
                {post.engagement.likes > 0 && (
                  <span className={`text-xs ${textTertiary}`}>
                    {post.engagement.likes} likes
                  </span>
                )}
                {post.engagement.comments > 0 && (
                  <span className={`text-xs ${textTertiary}`}>
                    {post.engagement.comments} comments
                  </span>
                )}
                {post.engagement.shares > 0 && (
                  <span className={`text-xs ${textTertiary}`}>
                    {post.engagement.shares} shares
                  </span>
                )}
                {post.engagement.clicks > 0 && (
                  <span className={`text-xs ${textTertiary}`}>
                    {post.engagement.clicks} clicks
                  </span>
                )}
              </div>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {post.status === "draft" && (
            <>
              <button
                onClick={handleSchedule}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Schedule"
              >
                <Clock size={14} className="text-[var(--color-blue)]" />
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Publish now"
              >
                {publishing ? (
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                ) : (
                  <Send size={14} className="text-emerald-400" />
                )}
              </button>
            </>
          )}
          {post.status === "scheduled" && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
              title="Publish now"
            >
              {publishing ? (
                <Loader2 size={14} className="animate-spin text-emerald-400" />
              ) : (
                <Send size={14} className="text-emerald-400" />
              )}
            </button>
          )}
          {(post.status === "draft" || post.status === "scheduled") && (
            <>
              <button
                onClick={() => {
                  setEditing(true)
                  setExpanded(true)
                }}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Edit"
              >
                <Pencil size={14} className={textTertiary} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Delete"
              >
                <Trash2 size={14} className="text-red-400" />
              </button>
            </>
          )}
          {post.status === "published" && post.external_url && (
            <a
              href={post.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
              title="View post"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
          >
            {expanded ? (
              <ChevronUp size={14} className={textTertiary} />
            ) : (
              <ChevronDown size={14} className={textTertiary} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ContentCalendar ──

function ContentCalendar({
  posts,
  adminKey,
  onRefresh,
}: {
  posts: SocialPost[]
  adminKey: string
  onRefresh: () => void
}) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const seasonalMarker = SEASONAL_MARKERS[String(month + 1)]

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  const postsByDay = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    posts.forEach((p) => {
      const date = p.scheduled_at || p.published_at || p.created_at
      const d = new Date(date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate())
        if (!map[key]) map[key] = []
        map[key].push(p)
      }
    })
    return map
  }, [posts, year, month])

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day

  const totalScheduled = posts.filter((p) => p.status === "scheduled").length
  const totalDraft = posts.filter((p) => p.status === "draft").length
  const totalPublished = posts.filter((p) => p.status === "published").length

  const visiblePosts = selectedDay
    ? postsByDay[selectedDay] || []
    : posts.sort((a, b) => {
        const da = a.scheduled_at || a.created_at
        const db = b.scheduled_at || b.created_at
        return new Date(da).getTime() - new Date(db).getTime()
      })

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMonth(new Date(year, month - 1))}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--color-light-gray)]"
          >
            <ChevronLeft size={16} className={textTertiary} />
          </button>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>
            {MONTHS[month]} {year}
          </h3>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1))}
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--color-light-gray)]"
          >
            <ChevronRight size={16} className={textTertiary} />
          </button>
          <button
            onClick={() => setViewMonth(new Date())}
            className="text-xs px-2 py-1 rounded-lg bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${textTertiary}`}>
            {totalDraft} draft &middot; {totalScheduled} scheduled &middot;{" "}
            {totalPublished} published
          </span>
          <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-light-gray)]">
            <button
              onClick={() => {
                setViewMode("calendar")
                setSelectedDay(null)
              }}
              className={`p-1.5 rounded ${viewMode === "calendar" ? "bg-[var(--color-gold)] text-[var(--color-light)]" : textTertiary}`}
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => {
                setViewMode("list")
                setSelectedDay(null)
              }}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-[var(--color-gold)] text-[var(--color-light)]" : textTertiary}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {seasonalMarker && (
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${seasonalMarker.color}`}
        >
          \uD83D\uDCC5 {seasonalMarker.label} \u2014 great time to post
          seasonal content
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className={`border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]`}>
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium py-2 text-[var(--color-mid-gray)] border-b border-[var(--border-subtle)]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={i}
                    className="min-h-[80px] border-b border-r border-[var(--border-subtle)] bg-[var(--color-light)]/30"
                  />
                )
              }
              const dayPosts = postsByDay[String(day)] || []
              const isSelected = selectedDay === String(day)
              return (
                <div
                  key={i}
                  onClick={() =>
                    setSelectedDay(isSelected ? null : String(day))
                  }
                  className={`min-h-[80px] border-b border-r border-[var(--border-subtle)] p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--color-gold)]/10" : ""
                  } ${isToday(day) ? "bg-[var(--color-gold)]/5" : ""} hover:bg-[var(--color-light-gray)]`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${isToday(day) ? "text-[var(--color-gold)] font-semibold" : textTertiary}`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] px-1 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 4).map((p, j) => (
                      <div
                        key={j}
                        className={`w-2 h-2 rounded-full ${PLATFORM_CONFIG[p.platform].dotColor} ${p.status === "published" ? "opacity-100" : "opacity-50"}`}
                        title={`${PLATFORM_CONFIG[p.platform].label}: ${p.content.slice(0, 40)}...`}
                      />
                    ))}
                    {dayPosts.length > 4 && (
                      <span className={`text-[9px] ${textTertiary}`}>
                        +{dayPosts.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day posts or list view */}
      {(selectedDay || viewMode === "list") && (
        <div className="space-y-2">
          {selectedDay && (
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${textPrimary}`}>
                {MONTHS[month]} {selectedDay}, {year} \u2014{" "}
                {visiblePosts.length}{" "}
                {visiblePosts.length === 1 ? "post" : "posts"}
              </h4>
              <button
                onClick={() => setSelectedDay(null)}
                className={`text-xs ${textTertiary} hover:underline`}
              >
                Clear selection
              </button>
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <p
              className={`text-sm ${textTertiary} text-center py-4`}
            >
              No posts {selectedDay ? "on this day" : "this month"}. Generate
              some content!
            </p>
          ) : (
            visiblePosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                adminKey={adminKey}
                onUpdate={onRefresh}
              />
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <span
            key={key}
            className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            {config.label}
          </span>
        ))}
        <span
          className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-mid-gray)] opacity-50" />{" "}
          Draft/Scheduled
        </span>
        <span
          className={`flex items-center gap-1.5 text-xs ${textTertiary}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-mid-gray)] opacity-100" />{" "}
          Published
        </span>
      </div>
    </div>
  )
}

// ── BatchGenerator ──

function BatchGenerator({
  facilityId,
  adminKey,
  onGenerated,
  onClose,
}: {
  facilityId: string
  adminKey: string
  onGenerated: () => void
  onClose: () => void
}) {
  const [platforms, setPlatforms] = useState<Platform[]>([
    "facebook",
    "instagram",
    "gbp",
  ])
  const [postTypes, setPostTypes] = useState<PostType[]>([
    "promotion",
    "tip",
    "seasonal",
    "community",
  ])
  const [count, setCount] = useState(10)
  const [timeframe, setTimeframe] = useState(14)
  const [tone, setTone] = useState("friendly")
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function togglePostType(t: PostType) {
    setPostTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  async function handleGenerate() {
    if (platforms.length === 0) return setError("Select at least one platform")
    if (postTypes.length === 0)
      return setError("Select at least one post type")
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/generate-social-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          platforms,
          count,
          timeframeDays: timeframe,
          postTypes,
          tone,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Generation failed")
      }
      const data = await res.json()
      setResult({ count: data.count })
      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="border border-[var(--border-subtle)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={20} className="text-violet-400" />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>
                Generate Social Content
              </h3>
              <p className={`text-xs ${textTertiary}`}>
                AI creates a batch of posts using your facility data
              </p>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${textTertiary}`}>
              Platforms
            </label>
            <div className="flex gap-2 mt-2">
              {(
                Object.entries(PLATFORM_CONFIG) as [
                  Platform,
                  (typeof PLATFORM_CONFIG)[Platform],
                ][]
              ).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => togglePlatform(key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    platforms.includes(key)
                      ? `${config.color} text-white border-transparent`
                      : "border-[var(--border-subtle)] text-[var(--color-body-text)]"
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post types */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${textTertiary}`}>
              Post Types
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(
                Object.entries(POST_TYPES) as [
                  PostType,
                  (typeof POST_TYPES)[PostType],
                ][]
              ).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => togglePostType(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    postTypes.includes(key)
                      ? "bg-[var(--color-gold)] text-[var(--color-light)] border-transparent"
                      : "border-[var(--border-subtle)] text-[var(--color-body-text)]"
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count & timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium ${textTertiary}`}>
                Number of Posts
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={`w-full mt-1 ${inputCls}`}
              >
                <option value={5}>5 posts</option>
                <option value={8}>8 posts</option>
                <option value={10}>10 posts</option>
                <option value={14}>14 posts (2 weeks)</option>
                <option value={20}>20 posts</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium ${textTertiary}`}>
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
                className={`w-full mt-1 ${inputCls}`}
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={21}>3 weeks</option>
                <option value={30}>1 month</option>
              </select>
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${textTertiary}`}>
              Tone of Voice
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    tone === t.value
                      ? "bg-[var(--color-gold)] text-[var(--color-light)] border-transparent"
                      : "border-[var(--border-subtle)] text-[var(--color-body-text)]"
                  }`}
                >
                  <p className="text-xs font-medium">{t.label}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${tone === t.value ? "text-[var(--color-blue)]" : textTertiary}`}
                  >
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {result && (
            <div className="rounded-lg p-3 flex items-center gap-2 bg-emerald-500/10">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <p className="text-sm text-emerald-400">
                {result.count} posts generated as drafts. Review them in the
                calendar!
              </p>
            </div>
          )}
          {error && (
            <div className="rounded-lg p-3 flex items-center gap-2 bg-red-500/10">
              <AlertTriangle size={16} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={
                generating ||
                platforms.length === 0 ||
                postTypes.length === 0
              }
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-xl text-sm font-medium hover:bg-[var(--color-gold)]/90 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating{" "}
                  {count} posts...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate {count} Posts
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-[var(--border-subtle)] rounded-xl text-sm font-medium text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
            >
              {result ? "Done" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PostComposer ──

function PostComposer({
  facilityId,
  adminKey,
  onCreated,
  onClose,
}: {
  facilityId: string
  adminKey: string
  onCreated: () => void
  onClose: () => void
}) {
  const [platform, setPlatform] = useState<Platform>("facebook")
  const [postType, setPostType] = useState<PostType>("tip")
  const [content, setContent] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  const platformConfig = PLATFORM_CONFIG[platform]
  const charLimit = platformConfig.charLimit
  const charCount = content.length

  async function generateAIContent() {
    setGeneratingAI(true)
    try {
      const res = await fetch("/api/generate-social-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          platforms: [platform],
          count: 1,
          postTypes: [postType],
          tone: "friendly",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.posts && data.posts.length > 0) {
          setContent(data.posts[0].content || "")
          if (data.posts[0].hashtags) {
            setHashtags(data.posts[0].hashtags.join(" "))
          }
        }
      }
    } catch {
      /* silent */
    }
    setGeneratingAI(false)
  }

  async function handleSave(publishNow: boolean) {
    if (!content.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        facilityId,
        platform,
        postType,
        content: content.trim(),
        hashtags: hashtags
          ? hashtags
              .split(/[\s,]+/)
              .filter(Boolean)
              .map((h) => (h.startsWith("#") ? h : `#${h}`))
          : [],
        ctaUrl: ctaUrl || null,
        scheduledAt: scheduledAt || null,
      }
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed to save post")
      if (publishNow) {
        const data = await res.json()
        await fetch("/api/publish-social", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({ postId: data.post.id }),
        })
      }
      onCreated()
      onClose()
    } catch {
      alert("Failed to save post")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="border border-[var(--border-subtle)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${textPrimary}`}>Create Post</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--color-light-gray)]"
            >
              <X size={16} className={textTertiary} />
            </button>
          </div>

          {/* Platform tabs */}
          <div className="flex gap-1">
            {(
              Object.entries(PLATFORM_CONFIG) as [
                Platform,
                (typeof PLATFORM_CONFIG)[Platform],
              ][]
            ).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setPlatform(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  platform === key
                    ? `${config.color} text-white`
                    : "bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>

          {/* Post type */}
          <div>
            <label className={`text-xs font-medium ${textTertiary}`}>
              Post Type
            </label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              className={`w-full mt-1 ${inputCls}`}
            >
              {Object.entries(POST_TYPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-medium ${textTertiary}`}>
                Content
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateAIContent}
                  disabled={generatingAI}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                >
                  {generatingAI ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Sparkles size={10} />
                  )}
                  AI Generate
                </button>
                <span
                  className={`text-xs ${charCount > charLimit ? "text-red-500" : textTertiary}`}
                >
                  {charCount}/{charLimit}
                </span>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                platform === "facebook"
                  ? "Write your Facebook post..."
                  : platform === "instagram"
                    ? "Write your Instagram caption..."
                    : "Write your Google Business post..."
              }
              className={`w-full mt-1 ${inputCls} resize-none`}
              rows={6}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className={`text-xs font-medium ${textTertiary}`}>
              Hashtags (space or comma separated)
            </label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#storage #moving #organization #selfstorage"
              className={`w-full mt-1 ${inputCls}`}
            />
            {/* Quick hashtag sets */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {Object.entries(HASHTAG_SETS).map(([key, tags]) => (
                <button
                  key={key}
                  onClick={() =>
                    setHashtags((prev) =>
                      prev ? `${prev} ${tags.join(" ")}` : tags.join(" ")
                    )
                  }
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors capitalize"
                >
                  + {key}
                </button>
              ))}
            </div>
          </div>

          {/* CTA URL */}
          <div>
            <label className={`text-xs font-medium ${textTertiary}`}>
              Link URL (optional)
            </label>
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://..."
              className={`w-full mt-1 ${inputCls}`}
            />
          </div>

          {/* Schedule */}
          <div>
            <label className={`text-xs font-medium ${textTertiary}`}>
              Schedule (optional, leave blank for draft)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`w-full mt-1 ${inputCls}`}
            />
          </div>

          {/* Preview hint */}
          <div className="rounded-lg p-3 bg-[var(--color-light-gray)]">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${platformConfig.dotColor}`}
              />
              <span className={`text-xs font-medium ${platformConfig.textColor}`}>
                {platformConfig.label} Preview
              </span>
            </div>
            <p className={`text-xs ${textTertiary} whitespace-pre-wrap`}>
              {content || "Your post will appear here..."}
            </p>
            {hashtags && (
              <p className="text-xs text-[var(--color-blue)] mt-1">
                {hashtags
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((h) => (h.startsWith("#") ? h : `#${h}`))
                  .join(" ")}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-subtle)] rounded-xl text-sm font-medium transition-colors disabled:opacity-50 text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
            >
              <Save size={14} /> {scheduledAt ? "Schedule" : "Save Draft"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-xl text-sm font-medium hover:bg-[var(--color-gold)]/90 disabled:opacity-50 transition-colors"
            >
              <Send size={14} /> Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SocialCommandCenter({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)
  const [subView, setSubView] = useState<SubView>("calendar")
  const [showGenerator, setShowGenerator] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/social-posts?facilityId=${facilityId}`, {
        headers: { "X-Admin-Key": adminKey },
      })
      if (!res.ok) throw new Error("Failed to load posts")
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Derived stats
  const drafts = posts.filter((p) => p.status === "draft")
  const scheduled = posts.filter((p) => p.status === "scheduled")
  const published = posts.filter((p) => p.status === "published")
  const failed = posts.filter((p) => p.status === "failed")

  const platformCounts = {
    facebook: posts.filter((p) => p.platform === "facebook").length,
    instagram: posts.filter((p) => p.platform === "instagram").length,
    gbp: posts.filter((p) => p.platform === "gbp").length,
  }

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false
    if (filterStatus !== "all" && p.status !== filterStatus) return false
    return true
  })

  async function handlePublishAll(postIds: string[]) {
    for (const id of postIds) {
      await fetch("/api/publish-social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ postId: id }),
      })
    }
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-gold)]" />
        <span className={`ml-3 ${textSecondary}`}>
          Loading social media hub...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={cardCls + " p-4"}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Social Media Command Center
            </h2>
            <p className={`text-xs ${textTertiary} mt-0.5`}>
              Create, schedule, and publish to Facebook, Instagram, and Google
              Business
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Sparkles size={14} /> Generate Content
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] rounded-xl text-sm font-medium hover:bg-[var(--color-gold)]/90 transition-colors"
            >
              <Plus size={14} /> New Post
            </button>
            <button
              onClick={fetchPosts}
              className="p-2 rounded-xl border border-[var(--border-subtle)] transition-colors hover:bg-[var(--color-light-gray)]"
            >
              <RefreshCw size={14} className={textTertiary} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        <MetricCard label="Total Posts" value={String(posts.length)} />
        <MetricCard
          label="Drafts"
          value={String(drafts.length)}
          accent={drafts.length > 0 ? "text-amber-400" : undefined}
        />
        <MetricCard
          label="Scheduled"
          value={String(scheduled.length)}
          accent="text-[var(--color-blue)]"
        />
        <MetricCard
          label="Published"
          value={String(published.length)}
          accent="text-emerald-400"
        />
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <MetricCard
            key={key}
            label={config.label}
            value={String(
              platformCounts[key as keyof typeof platformCounts]
            )}
            accent={config.textColor}
          />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {["all", "facebook", "instagram", "gbp"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterPlatform === p
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {p === "all"
                ? "All Platforms"
                : PLATFORM_CONFIG[p as Platform]?.label || p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "draft", "scheduled", "published"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-light-gray)]">
        {(
          [
            ["calendar", "Calendar", CalendarDays],
            ["drafts", `Drafts (${drafts.length})`, Sparkles],
            ["published", `Published (${published.length})`, Send],
            ["metrics", "Overview", BarChart3],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubView(key as SubView)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              subView === key
                ? "bg-[var(--color-gold)] text-[var(--color-light)] shadow-lg"
                : "text-[var(--color-body-text)] hover:text-[var(--color-dark)]"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {subView === "calendar" && (
        <ContentCalendar
          posts={filteredPosts}
          adminKey={adminKey}
          onRefresh={fetchPosts}
        />
      )}

      {/* Drafts View */}
      {subView === "drafts" && (
        <div className="space-y-3">
          {drafts.length > 0 && (
            <div className="flex items-center justify-between">
              <p className={`text-sm ${textSecondary}`}>
                {drafts.length} posts ready to review
              </p>
              <button
                onClick={() =>
                  handlePublishAll(scheduled.map((p) => p.id))
                }
                disabled={scheduled.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-xs font-medium hover:bg-[var(--color-gold)]/90 disabled:opacity-50 transition-colors"
              >
                <Send size={12} /> Publish All Scheduled ({scheduled.length})
              </button>
            </div>
          )}
          {drafts.length === 0 ? (
            <EmptyState
              message="No drafts yet"
              action="Generate some content to get started"
              onAction={() => setShowGenerator(true)}
            />
          ) : (
            drafts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                adminKey={adminKey}
                onUpdate={fetchPosts}
              />
            ))
          )}
          {failed.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4">
                <AlertTriangle size={14} className="text-red-500" />
                <h4 className={`text-sm font-medium ${textPrimary}`}>
                  Failed ({failed.length})
                </h4>
              </div>
              {failed.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  adminKey={adminKey}
                  onUpdate={fetchPosts}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Published View */}
      {subView === "published" && (
        <div className="space-y-2">
          {published.length === 0 ? (
            <EmptyState
              message="No published posts yet"
              action="Create and publish your first post"
              onAction={() => setShowComposer(true)}
            />
          ) : (
            published
              .sort(
                (a, b) =>
                  new Date(
                    b.published_at || b.created_at
                  ).getTime() -
                  new Date(
                    a.published_at || a.created_at
                  ).getTime()
              )
              .map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  adminKey={adminKey}
                  onUpdate={fetchPosts}
                />
              ))
          )}
        </div>
      )}

      {/* Overview / Metrics View */}
      {subView === "metrics" && (
        <div className="space-y-4">
          {/* Platform breakdown */}
          <div className={cardCls + " p-4"}>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              Posts by Platform
            </h3>
            <div className="space-y-3">
              {(
                Object.entries(PLATFORM_CONFIG) as [
                  keyof typeof PLATFORM_CONFIG,
                  (typeof PLATFORM_CONFIG)[keyof typeof PLATFORM_CONFIG],
                ][]
              ).map(([key, config]) => {
                const count = platformCounts[key]
                const pubCount = published.filter(
                  (p) => p.platform === key
                ).length
                const maxCount = Math.max(
                  ...Object.values(platformCounts),
                  1
                )
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span
                        className={`text-xs font-medium ${config.textColor}`}
                      >
                        {config.icon} {config.label}
                      </span>
                      <span className={`text-xs ${textTertiary}`}>
                        {count} total &middot; {pubCount} published
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--color-light-gray)]">
                      <div
                        className={`h-3 rounded-full ${config.color} transition-all`}
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Content mix */}
          <div className={cardCls + " p-4"}>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              Content Mix
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(
                posts.reduce<Record<string, number>>((acc, p) => {
                  acc[p.post_type] = (acc[p.post_type] || 0) + 1
                  return acc
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="rounded-lg p-3 text-center bg-[var(--color-light-gray)]"
                  >
                    <p className={`text-lg font-semibold ${textPrimary}`}>
                      {count}
                    </p>
                    <p
                      className={`text-xs ${textTertiary} capitalize`}
                    >
                      {type.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className={cardCls + " p-4"}>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setShowGenerator(true)}
                className="p-3 rounded-lg border border-[var(--border-subtle)] text-left transition-colors hover:bg-[var(--color-light-gray)]"
              >
                <Sparkles size={16} className="text-violet-400 mb-1" />
                <p className={`text-xs font-medium ${textPrimary}`}>
                  Generate 2 Weeks of Content
                </p>
                <p className={`text-[10px] ${textTertiary}`}>
                  AI creates 10 posts across all platforms
                </p>
              </button>
              <button
                onClick={() => setShowComposer(true)}
                className="p-3 rounded-lg border border-[var(--border-subtle)] text-left transition-colors hover:bg-[var(--color-light-gray)]"
              >
                <Plus size={16} className="text-[var(--color-gold)] mb-1" />
                <p className={`text-xs font-medium ${textPrimary}`}>
                  Create Single Post
                </p>
                <p className={`text-[10px] ${textTertiary}`}>
                  Write and publish a custom post
                </p>
              </button>
              <button
                onClick={() => {
                  if (scheduled.length > 0)
                    handlePublishAll(scheduled.map((p) => p.id))
                }}
                disabled={scheduled.length === 0}
                className="p-3 rounded-lg border border-[var(--border-subtle)] text-left transition-colors disabled:opacity-40 hover:bg-[var(--color-light-gray)]"
              >
                <Send size={16} className="text-[var(--color-blue)] mb-1" />
                <p className={`text-xs font-medium ${textPrimary}`}>
                  Publish All Scheduled
                </p>
                <p className={`text-[10px] ${textTertiary}`}>
                  {scheduled.length} posts ready to go
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showGenerator && (
        <BatchGenerator
          facilityId={facilityId}
          adminKey={adminKey}
          onGenerated={fetchPosts}
          onClose={() => setShowGenerator(false)}
        />
      )}
      {showComposer && (
        <PostComposer
          facilityId={facilityId}
          adminKey={adminKey}
          onCreated={fetchPosts}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  )
}
