"use client"

import { useState } from "react"
import { Image as ImageIcon, ImageOff } from "lucide-react"

export function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="absolute inset-0" />

      {status === "loading" && (
        <div className="absolute inset-0 bg-[var(--color-light-gray)] animate-pulse flex items-center justify-center z-10">
          <ImageIcon size={16} className="text-[var(--color-mid-gray)]" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 bg-[var(--bg-elevated)] flex flex-col items-center justify-center gap-1 z-10">
          <ImageOff size={16} className="text-[var(--color-mid-gray)]" />
          <span className="text-[10px] text-[var(--color-mid-gray)]">Failed to load</span>
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
