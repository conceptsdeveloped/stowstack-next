"use client"

import { useState } from "react"
import {
  Loader2,
  Send,
  CalendarDays,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
} from "lucide-react"

import {
  type SocialPost,
  PLATFORM_CONFIG,
  POST_TYPES,
  STATUS_CONFIG,
  cardCls,
  textPrimary,
  textTertiary,
  inputCls,
} from "./social-command-center-types"

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export function MetricCard({
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

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
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

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

export function PostCard({
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
                aria-label="Schedule post"
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Schedule"
              >
                <Clock size={14} className="text-[var(--color-blue)]" />
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                aria-label="Publish now"
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
              aria-label="Publish now"
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
                aria-label="Edit post"
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)]"
                title="Edit"
              >
                <Pencil size={14} className={textTertiary} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete post"
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
            aria-label={expanded ? "Collapse post" : "Expand post"}
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
