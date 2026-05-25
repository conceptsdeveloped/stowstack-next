"use client"

import { useState } from "react"
import {
  Loader2,
  Sparkles,
  Send,
  Save,
  X,
} from "lucide-react"

import {
  type Platform,
  type PostType,
  PLATFORM_CONFIG,
  POST_TYPES,
  HASHTAG_SETS,
  textPrimary,
  textTertiary,
  inputCls,
} from "./social-command-center-types"

export function PostComposer({
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
              aria-label="Close composer"
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
