"use client"

import { useState, useEffect } from "react"
import { X as XIcon, Loader2 } from "lucide-react"

export function AssetPickerModal({
  facilityId,
  adminKey,
  onSelect,
  onClose,
}: {
  facilityId: string
  adminKey: string
  onSelect: (url: string) => void
  onClose: () => void
}) {
  const [assets, setAssets] = useState<
    { id: string; url: string; metadata?: Record<string, unknown> }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/facility-assets?facilityId=${facilityId}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) =>
        setAssets(
          (data.assets || []).filter(
            (a: { type?: string; url?: string }) =>
              a.type === "photo" ||
              a.url?.match(/\.(jpg|jpeg|png|webp|gif)/i)
          )
        )
      )
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facilityId, adminKey])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-2xl max-h-[70vh] rounded-2xl border border-black/[0.08] bg-white overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08]">
          <h3 className="text-sm font-semibold text-[#111827]">
            Select from Assets
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF]">
            <XIcon size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
            </div>
          )}
          {!loading && assets.length === 0 && (
            <p className="text-sm text-center py-8 text-[#9CA3AF]">
              No images found. Upload some in the Assets tab first.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a.url)
                  onClose()
                }}
                className="rounded-lg overflow-hidden border-2 border-black/[0.08] hover:border-[#3B82F6] transition-colors aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={String(a.metadata?.alt || "")}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
