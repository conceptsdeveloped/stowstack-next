"use client"

import { Star, Image as ImageIcon } from "lucide-react"
import { PhotoWithFallback } from "./shared-ui"
import type { GoogleReview } from "./types"

export function GooglePhotosGallery({
  photos,
  facilityName,
}: {
  photos: string[]
  facilityName: string
}) {
  if (photos.length === 0) return null

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-[var(--color-gold)]" />
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">
            Google Photos
          </h4>
          <span className="text-[10px] text-[var(--color-mid-gray)]">
            ({photos.length})
          </span>
        </div>
      </div>
      <div className="px-5 pb-4">
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {photos.map((url: string, i: number) => (
            <PhotoWithFallback
              key={i}
              src={url}
              alt={`${facilityName} photo ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function GoogleReviewsList({
  reviews,
}: {
  reviews: GoogleReview[]
}) {
  if (reviews.length === 0) return null

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-amber-400" />
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">
            Top Reviews
          </h4>
          <span className="text-[10px] text-[var(--color-mid-gray)]">
            ({reviews.length})
          </span>
        </div>
      </div>
      <div className="px-5 pb-4 space-y-3">
        {reviews.slice(0, 5).map((review, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: review.rating }, (_, j) => (
                  <Star key={j} size={10} fill="currentColor" />
                ))}
              </span>
              <span className="text-xs font-medium text-[var(--color-dark)]">
                {review.author_name}
              </span>
              {review.relative_time_description && (
                <span className="text-[10px] text-[var(--color-mid-gray)]">
                  {review.relative_time_description}
                </span>
              )}
            </div>
            {review.text && (
              <p className="text-xs text-[var(--color-body-text)] leading-relaxed line-clamp-3">
                {review.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
