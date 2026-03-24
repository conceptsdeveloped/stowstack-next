"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2,
  MapPin,
  Star,
  MessageSquare,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image,
  Sparkles,
  Settings,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Eye,
  MousePointer,
  Navigation,
  Phone,
  Search,
  Map,
  X,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GBPConnection {
  id: string
  facility_id: string
  status: string
  location_name: string | null
  google_account_id: string | null
  last_sync_at: string | null
  created_at: string
  sync_config: Record<string, boolean>
}

interface GBPPost {
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

interface GBPReview {
  id: string
  rating: number
  author_name: string | null
  review_text: string | null
  review_time: string | null
  response_status: string
  response_text: string | null
  ai_draft: string | null
}

interface GBPSyncLog {
  id: string
  sync_type: string
  status: string
  error_message: string | null
  created_at: string
}

interface GBPQuestion {
  id: string
  question_text: string
  author_name: string | null
  question_time: string | null
  answer_status: string
  answer_text: string | null
  ai_draft: string | null
  upvote_count: number
}

interface GBPInsight {
  id: string
  period_start: string
  period_end: string
  search_views: number
  maps_views: number
  website_clicks: number
  direction_clicks: number
  phone_calls: number
}

interface InsightsSummary {
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

interface ReviewStats {
  total: number
  avg_rating: number
  responded: number
  response_rate: number
  distribution: Record<number, number>
}

interface QAStats {
  total: number
  answered: number
  unanswered: number
}

type Section = "posts" | "reviews" | "qa" | "insights" | "sync" | "settings"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const card = "bg-white border border-black/[0.08] rounded-xl"
const textPrimary = "text-[#111827]"
const textSecondary = "text-[#6B7280]"
const textTertiary = "text-[#9CA3AF]"
const accent = "bg-[#3B82F6]"
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
const btnPrimary =
  "px-4 py-2 text-xs font-semibold bg-[#3B82F6] text-white rounded-lg hover:bg-[#3B82F6]/90 disabled:opacity-50 transition-colors"
const btnSecondary =
  "px-3 py-1.5 text-xs font-medium rounded-lg border border-black/[0.08] text-[#6B7280] hover:bg-black/[0.03] transition-colors"

function formatDate(iso: string | null) {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const postStatusColors: Record<string, string> = {
  draft: "bg-black/[0.04] text-[#6B7280]",
  scheduled: "bg-blue-500/10 text-blue-400",
  published: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
}

const responseStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  ai_drafted: "bg-purple-500/10 text-purple-400",
  published: "bg-emerald-500/10 text-emerald-400",
  skipped: "bg-black/[0.04] text-[#9CA3AF]",
}

function chipClass(status: string, colorMap: Record<string, string>) {
  return `px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status] || "bg-black/[0.04] text-[#6B7280]"}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GBPFull({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  const [section, setSection] = useState<Section>("posts")
  const [connection, setConnection] = useState<GBPConnection | null>(null)
  const [posts, setPosts] = useState<GBPPost[]>([])
  const [reviews, setReviews] = useState<GBPReview[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    total: 0,
    avg_rating: 0,
    responded: 0,
    response_rate: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  })
  const [syncLog, setSyncLog] = useState<GBPSyncLog[]>([])
  const [questions, setQuestions] = useState<GBPQuestion[]>([])
  const [qaStats, setQaStats] = useState<QAStats>({
    total: 0,
    answered: 0,
    unanswered: 0,
  })
  const [insights, setInsights] = useState<GBPInsight[]>([])
  const [insightsSummary, setInsightsSummary] =
    useState<InsightsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Post form state
  const [showPostForm, setShowPostForm] = useState(false)
  const [postType, setPostType] = useState("update")
  const [postTitle, setPostTitle] = useState("")
  const [postBody, setPostBody] = useState("")
  const [postCta, setPostCta] = useState("")
  const [postCtaUrl, setPostCtaUrl] = useState("")
  const [postImageUrl, setPostImageUrl] = useState("")
  const [postOfferCode, setPostOfferCode] = useState("")
  const [postScheduledAt, setPostScheduledAt] = useState("")
  const [submittingPost, setSubmittingPost] = useState(false)
  const [generatingPostAI, setGeneratingPostAI] = useState(false)
  const [postAIPrompt, setPostAIPrompt] = useState("")

  // Review response state
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Record<string, string>>({})
  const [approvingFor, setApprovingFor] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState("all")
  const [bulkGenerating, setBulkGenerating] = useState(false)

  // Q&A state
  const [generatingAnswer, setGeneratingAnswer] = useState<string | null>(null)
  const [editingAnswer, setEditingAnswer] = useState<Record<string, string>>({})
  const [approvingAnswer, setApprovingAnswer] = useState<string | null>(null)
  const [bulkGeneratingQA, setBulkGeneratingQA] = useState(false)
  const [qaFilter, setQaFilter] = useState("all")

  // Insights state
  const [insightsRange, setInsightsRange] = useState("30d")

  // Sync state
  const [syncing, setSyncing] = useState<string | null>(null)

  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [reviewSettings, setReviewSettings] = useState<{
    auto_respond: boolean
    min_rating: number
    response_tone: string
  }>({ auto_respond: false, min_rating: 4, response_tone: "professional" })

  // ── Data fetching ──

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const headers = { "X-Admin-Key": adminKey }
      const [syncRes, postsRes, reviewsRes, qaRes, insightsRes] =
        await Promise.all([
          fetch(`/api/gbp-sync?facilityId=${facilityId}`, { headers }).then(
            (r) => r.json()
          ),
          fetch(`/api/gbp-posts?facilityId=${facilityId}`, { headers }).then(
            (r) => r.json()
          ),
          fetch(`/api/gbp-reviews?facilityId=${facilityId}`, {
            headers,
          }).then((r) => r.json()),
          fetch(`/api/gbp-questions?facilityId=${facilityId}`, {
            headers,
          }).then((r) => r.json()),
          fetch(
            `/api/gbp-insights?facilityId=${facilityId}&range=${insightsRange}`,
            { headers }
          ).then((r) => r.json()),
        ])
      if (syncRes.connection) setConnection(syncRes.connection)
      if (syncRes.syncLog) setSyncLog(syncRes.syncLog)
      if (postsRes.posts) setPosts(postsRes.posts)
      if (reviewsRes.reviews) setReviews(reviewsRes.reviews)
      if (reviewsRes.stats) setReviewStats(reviewsRes.stats)
      if (qaRes.questions) setQuestions(qaRes.questions)
      if (qaRes.stats) setQaStats(qaRes.stats)
      if (insightsRes.insights) setInsights(insightsRes.insights)
      if (insightsRes.summary) setInsightsSummary(insightsRes.summary)
    } catch {
      /* silent */
    }
    setLoading(false)
  }, [facilityId, adminKey, insightsRange])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Load review settings when settings tab is shown
  useEffect(() => {
    if (section !== "settings") return
    setSettingsLoading(true)
    fetch(`/api/gbp-review-settings?facilityId=${facilityId}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setReviewSettings(data.settings)
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [section, facilityId, adminKey])

  // ── Post actions ──

  async function generatePostWithAI() {
    setGeneratingPostAI(true)
    try {
      const res = await fetch("/api/gbp-posts?action=generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          postType,
          promptContext: postAIPrompt,
        }),
      })
      const data = await res.json()
      if (data.generated) {
        if (data.generated.title) setPostTitle(data.generated.title)
        if (data.generated.body) setPostBody(data.generated.body)
      }
    } catch {
      /* silent */
    }
    setGeneratingPostAI(false)
  }

  async function createPost(publish: boolean) {
    if (!postBody.trim()) return
    setSubmittingPost(true)
    try {
      const res = await fetch("/api/gbp-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          postType,
          title: postTitle || null,
          body: postBody,
          ctaType: postCta || null,
          ctaUrl: postCtaUrl || null,
          imageUrl: postImageUrl || null,
          offerCode: postOfferCode || null,
          scheduledAt: postScheduledAt || null,
          publish,
        }),
      })
      if (res.ok) {
        setShowPostForm(false)
        setPostTitle("")
        setPostBody("")
        setPostCta("")
        setPostCtaUrl("")
        setPostImageUrl("")
        setPostOfferCode("")
        setPostScheduledAt("")
        setPostAIPrompt("")
        await loadAll()
      }
    } catch {
      /* silent */
    }
    setSubmittingPost(false)
  }

  async function deletePost(id: string) {
    await fetch(`/api/gbp-posts?id=${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    })
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  // ── Review actions ──

  async function generateAIResponse(reviewId: string) {
    setGeneratingFor(reviewId)
    try {
      const res = await fetch("/api/gbp-reviews?action=generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ reviewId }),
      })
      const data = await res.json()
      if (data.aiDraft) {
        setEditingDraft((prev) => ({ ...prev, [reviewId]: data.aiDraft }))
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, ai_draft: data.aiDraft, response_status: "ai_drafted" }
              : r
          )
        )
      }
    } catch {
      /* silent */
    }
    setGeneratingFor(null)
  }

  async function bulkGenerateResponses() {
    setBulkGenerating(true)
    try {
      const res = await fetch("/api/gbp-reviews?action=bulk-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      if (res.ok) await loadAll()
    } catch {
      /* silent */
    }
    setBulkGenerating(false)
  }

  async function approveResponse(reviewId: string) {
    const responseText = editingDraft[reviewId]
    if (!responseText?.trim()) return
    setApprovingFor(reviewId)
    try {
      await fetch("/api/gbp-reviews?action=approve-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ reviewId, responseText }),
      })
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, response_status: "published", response_text: responseText }
            : r
        )
      )
      setEditingDraft((prev) => {
        const n = { ...prev }
        delete n[reviewId]
        return n
      })
    } catch {
      /* silent */
    }
    setApprovingFor(null)
  }

  async function syncReviews() {
    setSyncing("reviews")
    try {
      await fetch("/api/gbp-reviews?action=sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      await loadAll()
    } catch {
      /* silent */
    }
    setSyncing(null)
  }

  // ── Q&A actions ──

  async function syncQuestions() {
    setSyncing("qa")
    try {
      await fetch("/api/gbp-questions?action=sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      await loadAll()
    } catch {
      /* silent */
    }
    setSyncing(null)
  }

  async function generateAIAnswer(questionId: string) {
    setGeneratingAnswer(questionId)
    try {
      const res = await fetch("/api/gbp-questions?action=generate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ questionId }),
      })
      const data = await res.json()
      if (data.aiDraft) {
        setEditingAnswer((prev) => ({ ...prev, [questionId]: data.aiDraft }))
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, ai_draft: data.aiDraft, answer_status: "ai_drafted" }
              : q
          )
        )
      }
    } catch {
      /* silent */
    }
    setGeneratingAnswer(null)
  }

  async function bulkGenerateAnswers() {
    setBulkGeneratingQA(true)
    try {
      const res = await fetch("/api/gbp-questions?action=bulk-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      if (res.ok) await loadAll()
    } catch {
      /* silent */
    }
    setBulkGeneratingQA(false)
  }

  async function approveAnswer(questionId: string) {
    const answerText = editingAnswer[questionId]
    if (!answerText?.trim()) return
    setApprovingAnswer(questionId)
    try {
      await fetch("/api/gbp-questions?action=approve-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ questionId, answerText }),
      })
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answer_status: "published", answer_text: answerText }
            : q
        )
      )
      setEditingAnswer((prev) => {
        const n = { ...prev }
        delete n[questionId]
        return n
      })
    } catch {
      /* silent */
    }
    setApprovingAnswer(null)
  }

  // ── Insights actions ──

  async function syncInsights() {
    setSyncing("insights")
    try {
      await fetch("/api/gbp-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId }),
      })
      await loadAll()
    } catch {
      /* silent */
    }
    setSyncing(null)
  }

  // ── Sync + Settings actions ──

  async function triggerSync(type: string) {
    setSyncing(type)
    try {
      await fetch("/api/gbp-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId, type }),
      })
      await loadAll()
    } catch {
      /* silent */
    }
    setSyncing(null)
  }

  async function updateSyncConfig(key: string, value: boolean) {
    if (!connection) return
    const newConfig = { ...connection.sync_config, [key]: value }
    try {
      const res = await fetch("/api/gbp-sync", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId, syncConfig: newConfig }),
      })
      const data = await res.json()
      if (data.connection) setConnection(data.connection)
    } catch {
      /* silent */
    }
  }

  async function saveReviewSettings(
    updates: Partial<typeof reviewSettings>
  ) {
    const merged = { ...reviewSettings, ...updates }
    setReviewSettings(merged)
    try {
      await fetch("/api/gbp-review-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ facilityId, ...merged }),
      })
    } catch {
      /* silent */
    }
  }

  // ── Derived data ──

  const filteredReviews =
    reviewFilter === "all"
      ? reviews
      : reviewFilter === "unresponded"
        ? reviews.filter(
            (r) =>
              r.response_status === "pending" ||
              r.response_status === "ai_drafted"
          )
        : reviews.filter((r) => r.response_status === reviewFilter)

  const filteredQuestions =
    qaFilter === "all"
      ? questions
      : qaFilter === "unanswered"
        ? questions.filter(
            (q) =>
              q.answer_status === "pending" || q.answer_status === "ai_drafted"
          )
        : questions.filter((q) => q.answer_status === qaFilter)

  const pendingReviewCount = reviews.filter(
    (r) => r.response_status === "pending"
  ).length
  const pendingQACount = questions.filter(
    (q) => q.answer_status === "pending"
  ).length

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#3B82F6] mr-2" />
        <span className={textSecondary}>Loading Google Business Profile...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection banner */}
      <div className={card + " p-4"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                connection?.status === "connected"
                  ? "bg-emerald-500/10"
                  : "bg-black/[0.03]"
              }`}
            >
              <MapPin
                size={18}
                className={
                  connection?.status === "connected"
                    ? "text-emerald-400"
                    : textTertiary
                }
              />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>
                {connection?.status === "connected"
                  ? connection.location_name || "Connected"
                  : "Google Business Profile"}
              </p>
              <p className={`text-xs ${textTertiary}`}>
                {connection?.status === "connected"
                  ? `Connected \u00B7 Last synced ${connection.last_sync_at ? formatDate(connection.last_sync_at) : "never"}`
                  : "Not connected \u2014 connect to enable auto-posting and review management"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection?.status === "connected" && (
              <button
                onClick={() => triggerSync("full")}
                disabled={syncing === "full"}
                className={btnSecondary}
              >
                {syncing === "full" ? (
                  <Loader2 size={13} className="inline animate-spin mr-1" />
                ) : (
                  <RefreshCw size={13} className="inline mr-1" />
                )}
                Sync Now
              </button>
            )}
            {(!connection || connection.status !== "connected") && (
              <button
                className={btnPrimary}
                onClick={() => {
                  window.open(
                    `/api/gbp-sync?action=oauth&facilityId=${facilityId}`,
                    "_blank"
                  )
                }}
              >
                Connect GBP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section pills */}
      <div className="flex gap-1 flex-wrap">
        {(
          [
            ["posts", "Posts", Send, 0],
            ["reviews", "Reviews", MessageSquare, pendingReviewCount],
            ["qa", "Q&A", HelpCircle, pendingQACount],
            ["insights", "Insights", BarChart3, 0],
            ["sync", "Profile Sync", RefreshCw, 0],
            ["settings", "Settings", Settings, 0],
          ] as const
        ).map(([id, label, Icon, badge]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              section === id
                ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                : "text-[#6B7280] hover:bg-black/[0.03]"
            }`}
          >
            <Icon size={13} /> {label}
            {badge > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ──── POSTS SECTION ──── */}
      {section === "posts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${textPrimary}`}>
              GBP Posts
            </h3>
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className={btnPrimary}
            >
              <Plus size={14} className="inline mr-1" /> New Post
            </button>
          </div>

          {showPostForm && (
            <div className={card + " p-4 space-y-3"}>
              {/* AI generation prompt */}
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs font-medium mb-2 text-purple-400">
                  <Sparkles size={12} className="inline mr-1" />
                  Generate with AI
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={postAIPrompt}
                    onChange={(e) => setPostAIPrompt(e.target.value)}
                    placeholder="e.g. 10x10 climate units 15% off first month, mention spring cleaning"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={generatePostWithAI}
                    disabled={generatingPostAI}
                    className={btnPrimary}
                  >
                    {generatingPostAI ? (
                      <Loader2 size={13} className="inline animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={13} className="inline mr-1" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    Post Type
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className={`mt-1 ${inputCls}`}
                  >
                    <option value="update">Update</option>
                    <option value="offer">Offer / Special</option>
                    <option value="event">Event</option>
                    <option value="product">Product</option>
                    <option value="availability">Unit Availability</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g. Spring Move-In Special"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    Post Body *
                  </label>
                  <span
                    className={`text-xs ${postBody.length > 1500 ? "text-red-500" : textTertiary}`}
                  >
                    {postBody.length}/1500
                  </span>
                </div>
                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  rows={3}
                  placeholder="Write your GBP update..."
                  className={`mt-1 ${inputCls}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    CTA Button
                  </label>
                  <select
                    value={postCta}
                    onChange={(e) => setPostCta(e.target.value)}
                    className={`mt-1 ${inputCls}`}
                  >
                    <option value="">None</option>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK">Book</option>
                    <option value="ORDER">Order</option>
                    <option value="SHOP">Shop</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="CALL">Call</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    CTA URL
                  </label>
                  <input
                    type="url"
                    value={postCtaUrl}
                    onChange={(e) => setPostCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={postImageUrl}
                    onChange={(e) => setPostImageUrl(e.target.value)}
                    placeholder="https://..."
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
              </div>

              {postType === "offer" && (
                <div>
                  <label className={`text-xs font-medium ${textSecondary}`}>
                    Offer / Promo Code
                  </label>
                  <input
                    type="text"
                    value={postOfferCode}
                    onChange={(e) => setPostOfferCode(e.target.value)}
                    placeholder="e.g. SPRING25"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
              )}

              {postType === "event" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium ${textSecondary}`}>
                      Event Start
                    </label>
                    <input
                      type="datetime-local"
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textSecondary}`}>
                      Event End
                    </label>
                    <input
                      type="datetime-local"
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`text-xs font-medium ${textSecondary}`}>
                  Schedule (leave empty to post now or save as draft)
                </label>
                <input
                  type="datetime-local"
                  value={postScheduledAt}
                  onChange={(e) => setPostScheduledAt(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => createPost(false)}
                  disabled={submittingPost || !postBody.trim()}
                  className={btnSecondary}
                >
                  {submittingPost ? (
                    <Loader2 size={13} className="inline animate-spin mr-1" />
                  ) : null}
                  {postScheduledAt ? "Schedule" : "Save Draft"}
                </button>
                {connection?.status === "connected" && !postScheduledAt && (
                  <button
                    onClick={() => createPost(true)}
                    disabled={submittingPost || !postBody.trim()}
                    className={btnPrimary}
                  >
                    <Send size={13} className="inline mr-1" /> Publish Now
                  </button>
                )}
                <button
                  onClick={() => setShowPostForm(false)}
                  className={`${btnSecondary} ml-auto`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {posts.length === 0 ? (
            <div className={card + " p-8 text-center"}>
              <Send size={32} className={`mx-auto mb-2 opacity-40 ${textTertiary}`} />
              <p className={`text-sm ${textSecondary}`}>No posts yet.</p>
              <p className={`text-xs mt-1 ${textTertiary}`}>
                Create a post to update your Google Business Profile.
              </p>
            </div>
          ) : (
            <div className={`${card} divide-y divide-black/[0.08]`}>
              {posts.map((post) => (
                <div key={post.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={chipClass(post.status, postStatusColors)}
                        >
                          {post.status}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-black/[0.04] text-[#6B7280]">
                          {post.post_type}
                        </span>
                        {post.ai_generated && (
                          <span className={`text-xs ${textTertiary}`}>
                            <Sparkles size={11} className="inline" /> AI
                          </span>
                        )}
                      </div>
                      {post.title && (
                        <p
                          className={`text-sm font-medium ${textPrimary} mb-0.5`}
                        >
                          {post.title}
                        </p>
                      )}
                      <p
                        className={`text-sm ${textSecondary} line-clamp-2`}
                      >
                        {post.body}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs ${textTertiary}`}>
                          {formatDate(post.created_at)}
                        </span>
                        {post.scheduled_at && (
                          <span className={`text-xs ${textTertiary}`}>
                            <Clock size={11} className="inline" />{" "}
                            {formatDate(post.scheduled_at)}
                          </span>
                        )}
                        {post.published_at && (
                          <span className={`text-xs ${textTertiary}`}>
                            <CheckCircle2 size={11} className="inline" />{" "}
                            {formatDate(post.published_at)}
                          </span>
                        )}
                        {post.error_message && (
                          <span className="text-xs text-red-500">
                            <AlertCircle size={11} className="inline" />{" "}
                            {post.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-[#9CA3AF] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── REVIEWS SECTION ──── */}
      {section === "reviews" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Avg Rating",
                value: `\u2605 ${reviewStats.avg_rating}`,
                icon: Star,
              },
              {
                label: "Total Reviews",
                value: reviewStats.total,
                icon: MessageSquare,
              },
              {
                label: "Responded",
                value: reviewStats.responded,
                icon: CheckCircle2,
              },
              {
                label: "Response Rate",
                value: `${reviewStats.response_rate}%`,
                icon: Send,
              },
            ].map((stat) => (
              <div key={stat.label} className={card + " p-4"}>
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={14} className={textTertiary} />
                  <span className={`text-xs font-medium ${textTertiary}`}>
                    {stat.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${textPrimary}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Rating distribution */}
          {reviewStats.total > 0 && (
            <div className={card + " p-4"}>
              <h4
                className={`text-xs font-semibold ${textTertiary} mb-3 uppercase tracking-wider`}
              >
                Rating Distribution
              </h4>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviewStats.distribution?.[rating] || 0
                  const pct =
                    reviewStats.total > 0
                      ? (count / reviewStats.total) * 100
                      : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className={`text-xs w-8 text-right ${textPrimary}`}>
                        {rating} \u2605
                      </span>
                      <div className="flex-1 h-4 rounded-full overflow-hidden bg-black/[0.04]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rating >= 4
                              ? "bg-emerald-500"
                              : rating === 3
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs w-16 ${textTertiary}`}>
                        {count} ({Math.round(pct)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              {["all", "unresponded", "published"].map((f) => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    reviewFilter === f
                      ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                      : "text-[#6B7280] hover:bg-black/[0.03]"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "unresponded"
                      ? "Needs Response"
                      : "Responded"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {pendingReviewCount > 0 && (
                <button
                  onClick={bulkGenerateResponses}
                  disabled={bulkGenerating}
                  className={btnSecondary}
                >
                  {bulkGenerating ? (
                    <Loader2
                      size={13}
                      className="inline animate-spin mr-1"
                    />
                  ) : (
                    <Sparkles size={13} className="inline mr-1" />
                  )}
                  AI Draft All ({pendingReviewCount})
                </button>
              )}
              {connection?.status === "connected" && (
                <button
                  onClick={syncReviews}
                  disabled={syncing === "reviews"}
                  className={btnSecondary}
                >
                  {syncing === "reviews" ? (
                    <Loader2
                      size={13}
                      className="inline animate-spin mr-1"
                    />
                  ) : (
                    <RefreshCw size={13} className="inline mr-1" />
                  )}
                  Sync Reviews
                </button>
              )}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className={card + " p-8 text-center"}>
              <MessageSquare
                size={32}
                className={`mx-auto mb-2 opacity-40 ${textTertiary}`}
              />
              <p className={`text-sm ${textSecondary}`}>
                No reviews{" "}
                {reviewFilter !== "all" ? "matching this filter" : "yet"}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <div key={review.id} className={card + " p-4"}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-amber-500 text-sm">
                        {"\u2605".repeat(review.rating)}
                        {"\u2606".repeat(5 - review.rating)}
                      </span>
                      <span
                        className={`text-sm font-medium ${textPrimary}`}
                      >
                        {review.author_name || "Anonymous"}
                      </span>
                      <span
                        className={chipClass(
                          review.response_status,
                          responseStatusColors
                        )}
                      >
                        {review.response_status.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs ${textTertiary}`}>
                        {formatDate(review.review_time)}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className={`text-sm ${textSecondary} mt-1`}>
                        {review.review_text}
                      </p>
                    )}

                    {review.response_status === "published" &&
                      review.response_text && (
                        <div className="mt-3 p-3 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs font-medium mb-1 text-emerald-400">
                            Your Response
                          </p>
                          <p className="text-emerald-300">
                            {review.response_text}
                          </p>
                        </div>
                      )}

                    {(review.response_status === "pending" ||
                      review.response_status === "ai_drafted") && (
                      <div className="mt-3 space-y-2">
                        {editingDraft[review.id] || review.ai_draft ? (
                          <>
                            {(editingDraft[review.id] || review.ai_draft) && (
                              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-2">
                                <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">
                                  AI-Generated Draft
                                </p>
                              </div>
                            )}
                            <textarea
                              value={
                                editingDraft[review.id] ??
                                review.ai_draft ??
                                ""
                              }
                              onChange={(e) =>
                                setEditingDraft((prev) => ({
                                  ...prev,
                                  [review.id]: e.target.value,
                                }))
                              }
                              rows={3}
                              className={inputCls}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveResponse(review.id)}
                                disabled={approvingFor === review.id}
                                className={btnPrimary}
                              >
                                {approvingFor === review.id ? (
                                  <Loader2
                                    size={13}
                                    className="inline animate-spin mr-1"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={13}
                                    className="inline mr-1"
                                  />
                                )}
                                Approve & Publish
                              </button>
                              <button
                                onClick={() =>
                                  generateAIResponse(review.id)
                                }
                                disabled={generatingFor === review.id}
                                className={btnSecondary}
                              >
                                <Sparkles
                                  size={13}
                                  className="inline mr-1"
                                />{" "}
                                Regenerate
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              generateAIResponse(review.id)
                            }
                            disabled={generatingFor === review.id}
                            className={btnSecondary}
                          >
                            {generatingFor === review.id ? (
                              <Loader2
                                size={13}
                                className="inline animate-spin mr-1"
                              />
                            ) : (
                              <Sparkles
                                size={13}
                                className="inline mr-1"
                              />
                            )}
                            Generate AI Response
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── Q&A SECTION ──── */}
      {section === "qa" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Questions",
                value: qaStats.total,
                icon: HelpCircle,
              },
              {
                label: "Answered",
                value: qaStats.answered,
                icon: CheckCircle2,
              },
              {
                label: "Unanswered",
                value: qaStats.unanswered,
                icon: AlertCircle,
              },
            ].map((stat) => (
              <div key={stat.label} className={card + " p-4"}>
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={14} className={textTertiary} />
                  <span className={`text-xs font-medium ${textTertiary}`}>
                    {stat.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${textPrimary}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              {["all", "unanswered", "published"].map((f) => (
                <button
                  key={f}
                  onClick={() => setQaFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    qaFilter === f
                      ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                      : "text-[#6B7280] hover:bg-black/[0.03]"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "unanswered"
                      ? "Needs Answer"
                      : "Answered"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {pendingQACount > 0 && (
                <button
                  onClick={bulkGenerateAnswers}
                  disabled={bulkGeneratingQA}
                  className={btnSecondary}
                >
                  {bulkGeneratingQA ? (
                    <Loader2
                      size={13}
                      className="inline animate-spin mr-1"
                    />
                  ) : (
                    <Sparkles size={13} className="inline mr-1" />
                  )}
                  AI Draft All ({pendingQACount})
                </button>
              )}
              {connection?.status === "connected" && (
                <button
                  onClick={syncQuestions}
                  disabled={syncing === "qa"}
                  className={btnSecondary}
                >
                  {syncing === "qa" ? (
                    <Loader2
                      size={13}
                      className="inline animate-spin mr-1"
                    />
                  ) : (
                    <RefreshCw size={13} className="inline mr-1" />
                  )}
                  Sync Q&A
                </button>
              )}
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className={card + " p-8 text-center"}>
              <HelpCircle
                size={32}
                className={`mx-auto mb-2 opacity-40 ${textTertiary}`}
              />
              <p className={`text-sm ${textSecondary}`}>
                No questions{" "}
                {qaFilter !== "all" ? "matching this filter" : "yet"}.
              </p>
              {connection?.status === "connected" && (
                <p className={`text-xs mt-1 ${textTertiary}`}>
                  Click &quot;Sync Q&A&quot; to pull questions from GBP.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q) => (
                <div key={q.id} className={card + " p-4"}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10">
                      <HelpCircle size={14} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-sm font-medium ${textPrimary}`}
                        >
                          {q.author_name || "Anonymous"}
                        </span>
                        <span
                          className={chipClass(
                            q.answer_status,
                            responseStatusColors
                          )}
                        >
                          {q.answer_status.replace(/_/g, " ")}
                        </span>
                        <span className={`text-xs ${textTertiary}`}>
                          {formatDate(q.question_time)}
                        </span>
                        {q.upvote_count > 0 && (
                          <span className={`text-xs ${textTertiary}`}>
                            +{q.upvote_count} upvotes
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${textPrimary} mb-2`}>
                        {q.question_text}
                      </p>

                      {q.answer_status === "published" && q.answer_text && (
                        <div className="p-3 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs font-medium mb-1 text-emerald-400">
                            Your Answer
                          </p>
                          <p className="text-emerald-300">{q.answer_text}</p>
                        </div>
                      )}

                      {(q.answer_status === "pending" ||
                        q.answer_status === "ai_drafted") && (
                        <div className="space-y-2">
                          {editingAnswer[q.id] || q.ai_draft ? (
                            <>
                              <textarea
                                value={
                                  editingAnswer[q.id] ?? q.ai_draft ?? ""
                                }
                                onChange={(e) =>
                                  setEditingAnswer((prev) => ({
                                    ...prev,
                                    [q.id]: e.target.value,
                                  }))
                                }
                                rows={2}
                                className={inputCls}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveAnswer(q.id)}
                                  disabled={approvingAnswer === q.id}
                                  className={btnPrimary}
                                >
                                  {approvingAnswer === q.id ? (
                                    <Loader2
                                      size={13}
                                      className="inline animate-spin mr-1"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={13}
                                      className="inline mr-1"
                                    />
                                  )}
                                  Approve & Publish
                                </button>
                                <button
                                  onClick={() => generateAIAnswer(q.id)}
                                  disabled={generatingAnswer === q.id}
                                  className={btnSecondary}
                                >
                                  <Sparkles
                                    size={13}
                                    className="inline mr-1"
                                  />{" "}
                                  Regenerate
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => generateAIAnswer(q.id)}
                              disabled={generatingAnswer === q.id}
                              className={btnSecondary}
                            >
                              {generatingAnswer === q.id ? (
                                <Loader2
                                  size={13}
                                  className="inline animate-spin mr-1"
                                />
                              ) : (
                                <Sparkles
                                  size={13}
                                  className="inline mr-1"
                                />
                              )}
                              Generate AI Answer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── INSIGHTS SECTION ──── */}
      {section === "insights" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${textPrimary}`}>
              GBP Performance Insights
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(
                  [
                    ["7d", "7 Days"],
                    ["30d", "30 Days"],
                    ["90d", "90 Days"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setInsightsRange(val)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      insightsRange === val
                        ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                        : "text-[#6B7280] hover:bg-black/[0.03]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {connection?.status === "connected" && (
                <button
                  onClick={syncInsights}
                  disabled={syncing === "insights"}
                  className={btnSecondary}
                >
                  {syncing === "insights" ? (
                    <Loader2
                      size={13}
                      className="inline animate-spin mr-1"
                    />
                  ) : (
                    <RefreshCw size={13} className="inline mr-1" />
                  )}
                  Sync Insights
                </button>
              )}
            </div>
          </div>

          {insightsSummary ? (
            <>
              {insightsSummary.period && (
                <p className={`text-xs ${textTertiary}`}>
                  Data from {insightsSummary.period}
                </p>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: "Search Views",
                    value: insightsSummary.search_views,
                    icon: Search,
                    color: "text-blue-400",
                  },
                  {
                    label: "Maps Views",
                    value: insightsSummary.maps_views,
                    icon: Map,
                    color: "text-emerald-400",
                  },
                  {
                    label: "Website Clicks",
                    value: insightsSummary.website_clicks,
                    icon: MousePointer,
                    color: "text-purple-400",
                  },
                  {
                    label: "Direction Requests",
                    value: insightsSummary.direction_clicks,
                    icon: Navigation,
                    color: "text-amber-400",
                  },
                  {
                    label: "Phone Calls",
                    value: insightsSummary.phone_calls,
                    icon: Phone,
                    color: "text-rose-400",
                  },
                ].map((stat) => (
                  <div key={stat.label} className={card + " p-4"}>
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon size={14} className={stat.color} />
                      <span className={`text-xs font-medium ${textTertiary}`}>
                        {stat.label}
                      </span>
                    </div>
                    <p className={`text-xl font-bold ${textPrimary}`}>
                      {((stat.value as number) || 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total impressions & actions */}
              <div className="grid grid-cols-2 gap-3">
                <div className={card + " p-4"}>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={14} className="text-blue-400" />
                    <span className={`text-xs font-medium ${textTertiary}`}>
                      Total Impressions
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {(insightsSummary.total_impressions || 0).toLocaleString()}
                  </p>
                  <p className={`text-xs ${textTertiary} mt-0.5`}>
                    Search + Maps views combined
                  </p>
                </div>
                <div className={card + " p-4"}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className={`text-xs font-medium ${textTertiary}`}>
                      Total Actions
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {(insightsSummary.total_actions || 0).toLocaleString()}
                  </p>
                  <p className={`text-xs ${textTertiary} mt-0.5`}>
                    Clicks + Directions + Calls
                  </p>
                </div>
              </div>

              {/* Action rate */}
              {Number(insightsSummary.total_impressions) > 0 && (
                <div className={card + " p-4"}>
                  <h4
                    className={`text-xs font-semibold ${textTertiary} mb-2 uppercase tracking-wider`}
                  >
                    Action Rate
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-6 rounded-full overflow-hidden bg-black/[0.04]">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(100, (Number(insightsSummary.total_actions) / Number(insightsSummary.total_impressions)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${textPrimary}`}>
                      {(
                        (Number(insightsSummary.total_actions) /
                          Number(insightsSummary.total_impressions)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <p className={`text-xs ${textTertiary} mt-1`}>
                    Percentage of viewers who took an action
                  </p>
                </div>
              )}

              {/* Trend chart */}
              {insights.length > 1 && (
                <div className={card + " p-4"}>
                  <h4
                    className={`text-sm font-semibold ${textPrimary} mb-4`}
                  >
                    Impressions Over Time
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={insights.map((i) => ({
                        period: i.period_start,
                        impressions:
                          (i.search_views || 0) + (i.maps_views || 0),
                        actions:
                          (i.website_clicks || 0) +
                          (i.direction_clicks || 0) +
                          (i.phone_calls || 0),
                      }))}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: "#6E6E73", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6E6E73", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          color: "#111827",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="impressions"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                        name="Impressions"
                      />
                      <Line
                        type="monotone"
                        dataKey="actions"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        name="Actions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Historical table */}
              {insights.length > 1 && (
                <div className={card}>
                  <div className="p-4 border-b border-black/[0.08]">
                    <h4 className={`text-sm font-semibold ${textPrimary}`}>
                      Historical Performance
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={textTertiary}>
                          <th className="text-left px-4 py-2 font-medium">
                            Period
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Search
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Maps
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Clicks
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Directions
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Calls
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.08]">
                        {insights.map((i) => (
                          <tr
                            key={i.id}
                            className="hover:bg-black/[0.03]"
                          >
                            <td className={`px-4 py-2 ${textPrimary}`}>
                              {i.period_start} \u2014 {i.period_end}
                            </td>
                            <td
                              className={`px-4 py-2 text-right ${textSecondary}`}
                            >
                              {i.search_views}
                            </td>
                            <td
                              className={`px-4 py-2 text-right ${textSecondary}`}
                            >
                              {i.maps_views}
                            </td>
                            <td
                              className={`px-4 py-2 text-right ${textSecondary}`}
                            >
                              {i.website_clicks}
                            </td>
                            <td
                              className={`px-4 py-2 text-right ${textSecondary}`}
                            >
                              {i.direction_clicks}
                            </td>
                            <td
                              className={`px-4 py-2 text-right ${textSecondary}`}
                            >
                              {i.phone_calls}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={card + " p-8 text-center"}>
              <BarChart3
                size={32}
                className={`mx-auto mb-2 opacity-40 ${textTertiary}`}
              />
              <p className={`text-sm ${textSecondary}`}>
                No insights data yet.
              </p>
              <p className={`text-xs mt-1 ${textTertiary}`}>
                {connection?.status === "connected"
                  ? 'Click "Sync Insights" to pull performance data from GBP.'
                  : "Connect your GBP to start tracking performance metrics."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ──── PROFILE SYNC SECTION ──── */}
      {section === "sync" && (
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold ${textPrimary}`}>
            Profile Sync
          </h3>

          {/* Connection status */}
          <div className={card + " p-4"}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${connection?.status === "connected" ? "bg-emerald-500" : "bg-red-500"}`}
              />
              <span className={`text-sm font-medium ${textPrimary}`}>
                {connection?.status === "connected"
                  ? "Connected"
                  : "Not Connected"}
              </span>
            </div>
            {connection && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className={textTertiary}>Last Sync</span>
                <span className={textSecondary}>
                  {formatDate(connection.last_sync_at)}
                </span>
                <span className={textTertiary}>Location</span>
                <span className={textSecondary}>
                  {connection.location_name || "\u2014"}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                type: "hours",
                label: "Sync Hours",
                desc: "Push facility hours to GBP",
                icon: Clock,
              },
              {
                type: "photos",
                label: "Sync Photos",
                desc: "Upload latest photos to GBP",
                icon: Image,
              },
              {
                type: "full",
                label: "Full Sync",
                desc: "Sync everything at once",
                icon: RefreshCw,
              },
            ].map((s) => (
              <div key={s.type} className={card + " p-4"}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={16} className={textTertiary} />
                  <span className={`text-sm font-medium ${textPrimary}`}>
                    {s.label}
                  </span>
                </div>
                <p className={`text-xs ${textTertiary} mb-3`}>{s.desc}</p>
                <button
                  onClick={() => triggerSync(s.type)}
                  disabled={
                    syncing === s.type ||
                    connection?.status !== "connected"
                  }
                  className={btnPrimary + " w-full"}
                >
                  {syncing === s.type ? (
                    <>
                      <Loader2
                        size={13}
                        className="inline animate-spin mr-1"
                      />{" "}
                      Syncing...
                    </>
                  ) : (
                    s.label
                  )}
                </button>
              </div>
            ))}
          </div>

          {syncLog.length > 0 && (
            <div className={card}>
              <div className="p-4 border-b border-black/[0.08]">
                <h4 className={`text-sm font-semibold ${textPrimary}`}>
                  Sync History
                </h4>
              </div>
              <div className="divide-y divide-black/[0.08]">
                {syncLog.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    {log.status === "success" ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : log.status === "partial" ? (
                      <AlertCircle size={14} className="text-amber-500" />
                    ) : (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${textPrimary}`}>
                        {log.sync_type}
                      </span>
                      {log.error_message && (
                        <p className="text-xs text-red-400 truncate">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs ${textTertiary}`}>
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── SETTINGS SECTION ──── */}
      {section === "settings" && (
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold ${textPrimary}`}>
            Automation Settings
          </h3>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2
                size={20}
                className="animate-spin text-[#3B82F6] mr-2"
              />
              <span className={textSecondary}>Loading settings...</span>
            </div>
          ) : (
            <>
              <div className={card + " p-4 space-y-4"}>
                {/* Sync automation toggles */}
                {[
                  {
                    key: "auto_post",
                    label: "Auto-Post Updates",
                    desc: "Automatically publish scheduled posts at their scheduled time",
                  },
                  {
                    key: "auto_respond",
                    label: "Auto-Respond to Reviews",
                    desc: "Automatically generate and publish AI responses to new reviews",
                  },
                  {
                    key: "sync_hours",
                    label: "Auto-Sync Hours",
                    desc: "Keep GBP hours in sync with facility hours on file",
                  },
                  {
                    key: "sync_photos",
                    label: "Auto-Sync Photos",
                    desc: "Automatically push new facility photos to GBP",
                  },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>
                        {setting.label}
                      </p>
                      <p className={`text-xs ${textTertiary}`}>
                        {setting.desc}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateSyncConfig(
                          setting.key,
                          !connection?.sync_config?.[
                            setting.key as keyof typeof connection.sync_config
                          ]
                        )
                      }
                      disabled={!connection}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        connection?.sync_config?.[
                          setting.key as keyof typeof connection.sync_config
                        ]
                          ? "bg-[#3B82F6]"
                          : "bg-black/[0.06]"
                      } ${!connection ? "opacity-40" : ""}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          connection?.sync_config?.[
                            setting.key as keyof typeof connection.sync_config
                          ]
                            ? "translate-x-[22px]"
                            : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Review response settings */}
              <div className={card + " p-4 space-y-4"}>
                <h4
                  className={`text-xs font-semibold ${textTertiary} uppercase tracking-wider`}
                >
                  Review Response Settings
                </h4>

                {/* Auto-respond toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      Auto-Respond
                    </p>
                    <p className={`text-xs ${textTertiary}`}>
                      Automatically respond to reviews meeting minimum rating
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      saveReviewSettings({
                        auto_respond: !reviewSettings.auto_respond,
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      reviewSettings.auto_respond
                        ? "bg-[#3B82F6]"
                        : "bg-black/[0.06]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        reviewSettings.auto_respond
                          ? "translate-x-[22px]"
                          : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                </div>

                {/* Min rating slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      Minimum Rating for Auto-Respond
                    </p>
                    <span className={`text-sm font-bold ${textPrimary}`}>
                      {reviewSettings.min_rating} \u2605
                    </span>
                  </div>
                  <p className={`text-xs ${textTertiary} mb-2`}>
                    Only auto-respond to reviews at or above this rating
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={reviewSettings.min_rating}
                    onChange={(e) =>
                      saveReviewSettings({
                        min_rating: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#3B82F6]"
                  />
                  <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
                    <span>1 star</span>
                    <span>2 stars</span>
                    <span>3 stars</span>
                    <span>4 stars</span>
                    <span>5 stars</span>
                  </div>
                </div>

                {/* Response tone */}
                <div>
                  <p className={`text-sm font-medium ${textPrimary} mb-2`}>
                    Response Tone
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: "professional",
                          label: "Professional",
                          desc: "Clean, authoritative",
                        },
                        {
                          value: "friendly",
                          label: "Friendly",
                          desc: "Warm, conversational",
                        },
                        {
                          value: "empathetic",
                          label: "Empathetic",
                          desc: "Understanding, caring",
                        },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.value}
                        onClick={() =>
                          saveReviewSettings({ response_tone: t.value })
                        }
                        className={`px-3 py-2 rounded-lg border text-left transition-all ${
                          reviewSettings.response_tone === t.value
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]"
                            : "border-black/[0.08] text-[#6B7280] hover:bg-black/[0.03]"
                        }`}
                      >
                        <p className="text-xs font-medium">{t.label}</p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            reviewSettings.response_tone === t.value
                              ? "text-[#3B82F6]/70"
                              : textTertiary
                          }`}
                        >
                          {t.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Connection details */}
              {connection && (
                <div className={card + " p-4"}>
                  <h4 className={`text-sm font-semibold ${textPrimary} mb-2`}>
                    Connection Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className={textTertiary}>Status</span>
                    <span className={textPrimary}>{connection.status}</span>
                    <span className={textTertiary}>Location</span>
                    <span className={textPrimary}>
                      {connection.location_name || "\u2014"}
                    </span>
                    <span className={textTertiary}>Google Account</span>
                    <span className={textPrimary}>
                      {connection.google_account_id || "\u2014"}
                    </span>
                    <span className={textTertiary}>Connected</span>
                    <span className={textPrimary}>
                      {formatDate(connection.created_at)}
                    </span>
                    <span className={textTertiary}>Last Sync</span>
                    <span className={textPrimary}>
                      {formatDate(connection.last_sync_at)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
