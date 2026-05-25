"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2,
  Sparkles,
  Plus,
  RefreshCw,
  Send,
  CalendarDays,
  BarChart3,
  AlertTriangle,
} from "lucide-react"

import {
  type SocialPost,
  type SubView,
  type Platform,
  PLATFORM_CONFIG,
  cardCls,
  textPrimary,
  textSecondary,
  textTertiary,
} from "./social-command-center-types"
import { MetricCard, EmptyState, PostCard } from "./social-post-card"
import { ContentCalendar } from "./social-content-calendar"
import { BatchGenerator } from "./social-batch-generator"
import { PostComposer } from "./social-post-composer"

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
              aria-label="Refresh posts"
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
