"use client"

import { useState } from "react"
import {
  Loader2,
  Send,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import {
  type GBPPost,
  type GBPConnection,
  card,
  textPrimary,
  textSecondary,
  textTertiary,
  inputCls,
  btnPrimary,
  btnSecondary,
  formatDate,
  postStatusColors,
  chipClass,
} from "./gbp-shared"

interface GBPPostsProps {
  facilityId: string
  adminKey: string
  posts: GBPPost[]
  setPosts: React.Dispatch<React.SetStateAction<GBPPost[]>>
  connection: GBPConnection | null
  loadAll: () => Promise<void>
}

export default function GBPPosts({
  facilityId,
  adminKey,
  posts,
  setPosts,
  connection,
  loadAll,
}: GBPPostsProps) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${textPrimary}`}>GBP Posts</h3>
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
          <Send
            size={32}
            className={`mx-auto mb-2 opacity-40 ${textTertiary}`}
          />
          <p className={`text-sm ${textSecondary}`}>No posts yet.</p>
          <p className={`text-xs mt-1 ${textTertiary}`}>
            Create a post to update your Google Business Profile.
          </p>
        </div>
      ) : (
        <div className={`${card} divide-y divide-[var(--border-subtle)]`}>
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
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
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
                  <p className={`text-sm ${textSecondary} line-clamp-2`}>
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
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-[var(--color-mid-gray)] hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
