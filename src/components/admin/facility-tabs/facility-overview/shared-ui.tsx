"use client"

import { useState } from "react"
import {
  Star,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Image as ImageIcon,
} from "lucide-react"
import type { Target } from "lucide-react"

// ---------------------------------------------------------------------------
// StarRating
// ---------------------------------------------------------------------------

export function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400 text-sm font-semibold">
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} size={12} fill="currentColor" />
      ))}
      {half && <Star size={12} fill="currentColor" className="opacity-50" />}
      <span className="ml-1 text-[var(--color-dark)]">{rating}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// PhotoWithFallback
// ---------------------------------------------------------------------------

export function PhotoWithFallback({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  return (
    <div className="relative w-40 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
      {status === "loading" && (
        <div className="absolute inset-0 bg-[var(--color-light-gray)] animate-pulse flex items-center justify-center">
          <ImageIcon size={16} className="text-[var(--color-mid-gray)]" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <ImageOff size={16} className="text-[var(--color-mid-gray)]" />
          <span className="text-[10px] text-[var(--color-mid-gray)]">Failed</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          status === "loaded"
            ? "opacity-100"
            : status === "error"
              ? "hidden"
              : "opacity-0"
        }`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

export function CollapsibleSection({
  id,
  title,
  icon: Icon,
  expandedSection,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: typeof Target
  expandedSection: string | null
  onToggle: (id: string) => void
  children: React.ReactNode
}) {
  const isOpen = expandedSection === id
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-light-gray)] transition-colors"
      >
        <Icon size={14} className="text-[var(--color-mid-gray)]" />
        <span className="text-sm font-medium flex-1 text-[var(--color-dark)]">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp size={14} className="text-[var(--color-mid-gray)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-mid-gray)]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
          {children}
        </div>
      )}
    </div>
  )
}
