"use client"

import { useState } from "react"
import {
  Copy,
  ExternalLink,
  ClipboardList,
  Trash2,
  MousePointerClick,
  CheckCircle2,
  ChevronRight,
  Download,
} from "lucide-react"
import type { UTMLink } from "./types"

const PROD_URL = "https://storageads.com"

function buildDestinationUrl(link: UTMLink) {
  let dest = PROD_URL
  if (link.landing_page_slug)
    dest = `${PROD_URL}/lp/${link.landing_page_slug}`
  const params = new URLSearchParams()
  if (link.utm_source) params.set("utm_source", link.utm_source)
  if (link.utm_medium) params.set("utm_medium", link.utm_medium)
  if (link.utm_campaign) params.set("utm_campaign", link.utm_campaign)
  if (link.utm_content) params.set("utm_content", link.utm_content)
  if (link.utm_term) params.set("utm_term", link.utm_term)
  const qs = params.toString()
  return qs ? `${dest}?${qs}` : dest
}

interface UTMLinkCardProps {
  link: UTMLink
  onDelete: (id: string) => void
  onDuplicate: (link: UTMLink) => void
}

export { buildDestinationUrl }

export default function UTMLinkCard({
  link,
  onDelete,
  onDuplicate,
}: UTMLinkCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedType, setCopiedType] = useState<
    "tracking" | "destination" | null
  >(null)

  const trackingUrl = `${PROD_URL}/api/r?c=${link.short_code}`
  const destinationUrl = buildDestinationUrl(link)

  const copyToClipboard = (
    val: string,
    type: "tracking" | "destination"
  ) => {
    navigator.clipboard.writeText(val)
    setCopiedType(type)
    setTimeout(() => {
      setCopiedType(null)
    }, 2000)
  }

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)] transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5"
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform text-[var(--color-mid-gray)] ${isExpanded ? "rotate-90" : ""}`}
                />
                <p className="text-sm font-medium text-[var(--color-dark)]">
                  {link.label}
                </p>
              </button>
              {link.landing_page_title && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                  {link.landing_page_title}
                </span>
              )}
            </div>

            {/* UTM params badges */}
            <div className="flex flex-wrap gap-1.5 mb-2 ml-5">
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                {link.utm_source}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                {link.utm_medium}
              </span>
              {link.utm_campaign && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                  {link.utm_campaign}
                </span>
              )}
              {link.utm_content && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  {link.utm_content}
                </span>
              )}
              {link.utm_term && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                  {link.utm_term}
                </span>
              )}
            </div>

            {/* Tracking URL */}
            <div className="text-xs font-mono text-[var(--color-mid-gray)] truncate ml-5">
              {trackingUrl}
            </div>
          </div>

          {/* Stats + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right mr-1">
              <div className="flex items-center gap-1">
                <MousePointerClick
                  size={13}
                  className="text-[var(--color-mid-gray)]"
                />
                <span className="text-sm font-semibold text-[var(--color-dark)]">
                  {link.click_count || 0}
                </span>
              </div>
              <p className="text-xs text-[var(--color-mid-gray)]">clicks</p>
            </div>

            <button
              onClick={() => copyToClipboard(trackingUrl, "tracking")}
              className={`p-1.5 rounded-lg transition-colors ${
                copiedType === "tracking"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "hover:bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"
              }`}
              title="Copy tracking URL (with click counter)"
            >
              {copiedType === "tracking" ? (
                <CheckCircle2 size={15} />
              ) : (
                <Copy size={15} />
              )}
            </button>

            <button
              onClick={() =>
                copyToClipboard(destinationUrl, "destination")
              }
              className={`p-1.5 rounded-lg transition-colors ${
                copiedType === "destination"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "hover:bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"
              }`}
              title="Copy direct destination URL (no redirect)"
            >
              {copiedType === "destination" ? (
                <CheckCircle2 size={15} />
              ) : (
                <ExternalLink size={15} />
              )}
            </button>

            <button
              onClick={() => onDuplicate(link)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"
              title="Duplicate link"
            >
              <ClipboardList size={15} />
            </button>

            <button
              onClick={() => onDelete(link.id)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-[var(--color-mid-gray)] hover:text-red-400"
              title="Delete link"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex gap-4 mt-2 text-xs text-[var(--color-mid-gray)] ml-5">
          <span>
            Created{" "}
            {new Date(link.created_at || "").toLocaleDateString()}
          </span>
          {link.last_clicked_at && (
            <span>
              Last click{" "}
              {new Date(link.last_clicked_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Expanded panel: full URLs + short code + QR code */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3 bg-[var(--color-light)]/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* URLs */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                  Tracking URL (counts clicks)
                </p>
                <div className="p-2 rounded text-xs font-mono break-all bg-[var(--color-light)] text-[var(--color-body-text)] border border-[var(--border-subtle)]">
                  {trackingUrl}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                  Destination URL (direct, no tracking)
                </p>
                <div className="p-2 rounded text-xs font-mono break-all bg-[var(--color-light)] text-[var(--color-body-text)] border border-[var(--border-subtle)]">
                  {destinationUrl}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                  Short Code
                </p>
                <div className="p-2 rounded text-xs font-mono bg-[var(--color-light)] text-[var(--color-gold)] border border-[var(--border-subtle)]">
                  {link.short_code}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">
                QR Code (for print / signage)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}&bgcolor=ffffff&color=000000&margin=8`}
                alt="QR Code"
                className="w-[120px] h-[120px] rounded border bg-white p-1"
                style={{ imageRendering: "pixelated" }}
              />
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(trackingUrl)}&bgcolor=ffffff&color=000000&margin=16&format=png`}
                download={`qr-${link.short_code}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 text-[var(--color-gold)] hover:text-[var(--color-gold)]/80"
              >
                <Download size={12} />
                Download high-res QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
