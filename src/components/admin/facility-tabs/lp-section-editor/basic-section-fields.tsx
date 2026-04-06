"use client"

import { ImageIcon } from "lucide-react"

/** Hero, Trust Bar (partial), CTA, and Location Map field groups */
export function HeroFields({
  config,
  set,
  inputCls,
  textareaCls,
  onPickAsset,
}: {
  config: Record<string, unknown>
  set: (key: string, val: unknown) => void
  inputCls: string
  textareaCls: string
  onPickAsset?: (field: string, arrayKey?: string, arrayIdx?: number) => void
}) {
  return (
    <>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Headline
        </label>
        <input
          className={inputCls}
          value={(config.headline as string) || ""}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="Main headline"
        />
      </div>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Subheadline
        </label>
        <textarea
          className={textareaCls}
          rows={2}
          value={(config.subheadline as string) || ""}
          onChange={(e) => set("subheadline", e.target.value)}
          placeholder="Supporting text"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            CTA Text
          </label>
          <input
            className={inputCls}
            value={(config.ctaText as string) || ""}
            onChange={(e) => set("ctaText", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            Badge Text
          </label>
          <input
            className={inputCls}
            value={(config.badgeText as string) || ""}
            onChange={(e) => set("badgeText", e.target.value)}
            placeholder="Optional badge"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            Background Image URL
          </label>
          <div className="flex gap-1">
            <input
              className={`${inputCls} flex-1`}
              value={(config.backgroundImage as string) || ""}
              onChange={(e) =>
                set("backgroundImage", e.target.value)
              }
              placeholder="https://..."
            />
            {onPickAsset && (
              <button
                onClick={() => onPickAsset("backgroundImage")}
                className="shrink-0 px-2 rounded-lg text-xs font-medium bg-black/[0.04] text-[#6B7280] hover:bg-black/[0.06]"
                title="Browse assets"
              >
                <ImageIcon size={14} />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            Style
          </label>
          <select
            className={inputCls}
            value={(config.style as string) || "dark"}
            onChange={(e) => set("style", e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>
    </>
  )
}

export function CtaFields({
  config,
  set,
  inputCls,
  textareaCls,
}: {
  config: Record<string, unknown>
  set: (key: string, val: unknown) => void
  inputCls: string
  textareaCls: string
}) {
  return (
    <>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Headline
        </label>
        <input
          className={inputCls}
          value={(config.headline as string) || ""}
          onChange={(e) => set("headline", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Subheadline
        </label>
        <textarea
          className={textareaCls}
          rows={2}
          value={(config.subheadline as string) || ""}
          onChange={(e) => set("subheadline", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            CTA Text
          </label>
          <input
            className={inputCls}
            value={(config.ctaText as string) || ""}
            onChange={(e) => set("ctaText", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            CTA URL
          </label>
          <input
            className={inputCls}
            value={(config.ctaUrl as string) || ""}
            onChange={(e) => set("ctaUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            Phone
          </label>
          <input
            className={inputCls}
            value={(config.phone as string) || ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">
            Style
          </label>
          <select
            className={inputCls}
            value={(config.style as string) || "gradient"}
            onChange={(e) => set("style", e.target.value)}
          >
            <option value="gradient">Dark Gradient</option>
            <option value="simple">Simple</option>
          </select>
        </div>
      </div>
    </>
  )
}

export function LocationMapFields({
  config,
  set,
  inputCls,
  textareaCls,
}: {
  config: Record<string, unknown>
  set: (key: string, val: unknown) => void
  inputCls: string
  textareaCls: string
}) {
  return (
    <>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Headline
        </label>
        <input
          className={inputCls}
          value={(config.headline as string) || ""}
          onChange={(e) => set("headline", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Address
        </label>
        <input
          className={inputCls}
          value={(config.address as string) || ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St, City, State"
        />
      </div>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Directions / Notes
        </label>
        <textarea
          className={textareaCls}
          rows={2}
          value={(config.directions as string) || ""}
          onChange={(e) => set("directions", e.target.value)}
          placeholder="Driving directions or access notes"
        />
      </div>
      <div>
        <label className="text-xs text-[#9CA3AF] mb-1 block">
          Google Maps Embed URL (optional)
        </label>
        <input
          className={inputCls}
          value={(config.googleMapsEmbed as string) || ""}
          onChange={(e) =>
            set("googleMapsEmbed", e.target.value)
          }
          placeholder="https://www.google.com/maps/embed?..."
        />
      </div>
    </>
  )
}
