"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Trash2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  FileText,
  ExternalLink,
  Copy,
  X as XIcon,
  ImageIcon,
  Palette,
  Loader2,
} from "lucide-react"

/* ── Local Types ── */

interface LPSection {
  id: string
  section_type: string
  sort_order: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>
}

interface LandingPageRecord {
  id: string
  facility_id: string
  slug: string
  title: string
  status: string
  variation_ids?: string[]
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  theme?: Record<string, string>
  storedge_widget_url?: string
  sections?: LPSection[]
  created_at: string
  updated_at: string
  published_at?: string
}

/* ── Constants ── */

const SECTION_TYPE_META: Record<
  string,
  { label: string; icon: string; defaultConfig: Record<string, unknown> }
> = {
  hero: {
    label: "Hero",
    icon: "H",
    defaultConfig: {
      headline: "",
      subheadline: "",
      ctaText: "Reserve Now",
      ctaUrl: "#cta",
      badgeText: "",
      style: "dark",
    },
  },
  trust_bar: {
    label: "Trust Bar",
    icon: "T",
    defaultConfig: { items: [{ icon: "check", text: "" }] },
  },
  features: {
    label: "Features",
    icon: "F",
    defaultConfig: {
      headline: "",
      items: [{ icon: "check", title: "", desc: "" }],
    },
  },
  unit_types: {
    label: "Unit Types",
    icon: "U",
    defaultConfig: {
      headline: "Available Units",
      units: [{ name: "", size: "", price: "", features: [] }],
    },
  },
  gallery: {
    label: "Photo Gallery",
    icon: "G",
    defaultConfig: { headline: "Our Facility", images: [] },
  },
  testimonials: {
    label: "Testimonials",
    icon: "R",
    defaultConfig: {
      headline: "What Our Customers Say",
      items: [{ name: "", text: "", role: "", metric: "" }],
    },
  },
  faq: {
    label: "FAQ",
    icon: "Q",
    defaultConfig: {
      headline: "Frequently Asked Questions",
      items: [{ q: "", a: "" }],
    },
  },
  cta: {
    label: "Call to Action",
    icon: "C",
    defaultConfig: {
      headline: "",
      subheadline: "",
      ctaText: "Reserve Your Unit",
      ctaUrl: "#",
      phone: "",
      style: "gradient",
    },
  },
  location_map: {
    label: "Location & Map",
    icon: "M",
    defaultConfig: { headline: "Find Us", address: "", directions: "" },
  },
}

const PAGE_TEMPLATES: Record<
  string,
  { label: string; desc: string; sectionTypes: string[] }
> = {
  standard: {
    label: "Standard",
    desc: "Hero + Trust Bar + Features + Gallery + CTA",
    sectionTypes: ["hero", "trust_bar", "features", "gallery", "cta"],
  },
  minimal: {
    label: "Minimal",
    desc: "Hero + CTA -- quick and simple",
    sectionTypes: ["hero", "cta"],
  },
  full: {
    label: "Full",
    desc: "All 9 sections -- the works",
    sectionTypes: [
      "hero",
      "trust_bar",
      "features",
      "unit_types",
      "gallery",
      "testimonials",
      "faq",
      "cta",
      "location_map",
    ],
  },
  custom: {
    label: "Blank",
    desc: "Start from scratch",
    sectionTypes: [],
  },
}

/* ── Asset Picker Modal ── */

function AssetPickerModal({
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

/* ── Section Config Editor ── */

function SectionEditor({
  section,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
  onPickAsset,
}: {
  section: LPSection
  isFirst: boolean
  isLast: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (config: Record<string, any>) => void
  onRemove: () => void
  onMove: (dir: "up" | "down") => void
  onPickAsset?: (
    field: string,
    arrayKey?: string,
    arrayIdx?: number
  ) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const meta = SECTION_TYPE_META[section.section_type]
  const config = section.config

  const inputCls =
    "w-full h-9 px-3 rounded-lg text-sm outline-none transition-all bg-[#F9FAFB] border border-black/[0.08] text-[#111827] focus:border-[#3B82F6]/50 placeholder:text-[#9CA3AF]"
  const textareaCls =
    "w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none bg-[#F9FAFB] border border-black/[0.08] text-[#111827] focus:border-[#3B82F6]/50 placeholder:text-[#9CA3AF]"

  function set(key: string, val: unknown) {
    onUpdate({ ...config, [key]: val })
  }

  function setItem(
    arrayKey: string,
    idx: number,
    field: string,
    val: unknown
  ) {
    const arr = [...(config[arrayKey] || [])]
    arr[idx] = { ...arr[idx], [field]: val }
    onUpdate({ ...config, [arrayKey]: arr })
  }

  function addItem(arrayKey: string, template: Record<string, unknown>) {
    onUpdate({
      ...config,
      [arrayKey]: [...(config[arrayKey] || []), template],
    })
  }

  function removeItem(arrayKey: string, idx: number) {
    onUpdate({
      ...config,
      [arrayKey]: (config[arrayKey] || []).filter(
        (_: unknown, i: number) => i !== idx
      ),
    })
  }

  return (
    <div className="border border-black/[0.08] rounded-xl overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-black/[0.03]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center text-xs font-semibold">
            {meta?.icon || "?"}
          </span>
          <span className="text-sm font-medium text-[#111827]">
            {meta?.label || section.section_type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isFirst && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMove("up")
              }}
              className="p-1 rounded hover:bg-black/[0.04]"
            >
              <ChevronUp size={12} className="text-[#9CA3AF]" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMove("down")
              }}
              className="p-1 rounded hover:bg-black/[0.04]"
            >
              <ChevronDown size={12} className="text-[#9CA3AF]" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 rounded hover:bg-black/[0.04]"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
          {expanded ? (
            <ChevronUp size={14} className="text-[#9CA3AF]" />
          ) : (
            <ChevronDown size={14} className="text-[#9CA3AF]" />
          )}
        </div>
      </div>

      {/* Section config form */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-black/[0.08]">
          {/* Hero */}
          {section.section_type === "hero" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
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
                  value={config.subheadline || ""}
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
                    value={config.ctaText || ""}
                    onChange={(e) => set("ctaText", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] mb-1 block">
                    Badge Text
                  </label>
                  <input
                    className={inputCls}
                    value={config.badgeText || ""}
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
                      value={config.backgroundImage || ""}
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
                    value={config.style || "dark"}
                    onChange={(e) => set("style", e.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Trust Bar */}
          {section.section_type === "trust_bar" && (
            <>
              {(config.items || []).map(
                (item: Record<string, string>, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className={`${inputCls} w-20`}
                      value={item.icon || "check"}
                      onChange={(e) =>
                        setItem("items", i, "icon", e.target.value)
                      }
                    >
                      <option value="check">check</option>
                      <option value="star">star</option>
                      <option value="shield">shield</option>
                      <option value="clock">clock</option>
                      <option value="truck">truck</option>
                      <option value="building">building</option>
                    </select>
                    <input
                      className={`${inputCls} flex-1`}
                      value={item.text || ""}
                      onChange={(e) =>
                        setItem("items", i, "text", e.target.value)
                      }
                      placeholder="Trust item text"
                    />
                    <button
                      onClick={() => removeItem("items", i)}
                      className="text-red-400 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              )}
              <button
                onClick={() =>
                  addItem("items", { icon: "check", text: "" })
                }
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add item
              </button>
            </>
          )}

          {/* Features */}
          {section.section_type === "features" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              {(config.items || []).map(
                (item: Record<string, string>, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-black/[0.08]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#9CA3AF]">
                        Feature {i + 1}
                      </span>
                      <button
                        onClick={() => removeItem("items", i)}
                        className="text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      className={`${inputCls} mb-2`}
                      value={item.title || ""}
                      onChange={(e) =>
                        setItem("items", i, "title", e.target.value)
                      }
                      placeholder="Title"
                    />
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={item.desc || ""}
                      onChange={(e) =>
                        setItem("items", i, "desc", e.target.value)
                      }
                      placeholder="Description"
                    />
                  </div>
                )
              )}
              <button
                onClick={() =>
                  addItem("items", { icon: "check", title: "", desc: "" })
                }
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add feature
              </button>
            </>
          )}

          {/* Unit Types */}
          {section.section_type === "unit_types" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              {(config.units || []).map(
                (unit: Record<string, string>, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-black/[0.08]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#9CA3AF]">
                        Unit {i + 1}
                      </span>
                      <button
                        onClick={() => removeItem("units", i)}
                        className="text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        className={inputCls}
                        value={unit.name || ""}
                        onChange={(e) =>
                          setItem("units", i, "name", e.target.value)
                        }
                        placeholder="Name"
                      />
                      <input
                        className={inputCls}
                        value={unit.size || ""}
                        onChange={(e) =>
                          setItem("units", i, "size", e.target.value)
                        }
                        placeholder="Size (e.g. 10x10)"
                      />
                      <input
                        className={inputCls}
                        value={unit.price || ""}
                        onChange={(e) =>
                          setItem("units", i, "price", e.target.value)
                        }
                        placeholder="$XX"
                      />
                    </div>
                  </div>
                )
              )}
              <button
                onClick={() =>
                  addItem("units", {
                    name: "",
                    size: "",
                    price: "",
                    features: [],
                  })
                }
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add unit type
              </button>
            </>
          )}

          {/* Gallery */}
          {section.section_type === "gallery" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              {(config.images || []).map(
                (img: Record<string, string>, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      value={img.url || ""}
                      onChange={(e) =>
                        setItem("images", i, "url", e.target.value)
                      }
                      placeholder="Image URL"
                    />
                    {onPickAsset && (
                      <button
                        onClick={() =>
                          onPickAsset("url", "images", i)
                        }
                        className="shrink-0 px-2 py-1.5 rounded-lg bg-black/[0.04] text-[#6B7280] hover:bg-black/[0.06]"
                        title="Browse assets"
                      >
                        <ImageIcon size={12} />
                      </button>
                    )}
                    <input
                      className={`${inputCls} w-28`}
                      value={img.alt || ""}
                      onChange={(e) =>
                        setItem("images", i, "alt", e.target.value)
                      }
                      placeholder="Alt text"
                    />
                    <button
                      onClick={() => removeItem("images", i)}
                      className="text-red-400 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              )}
              <button
                onClick={() => addItem("images", { url: "", alt: "" })}
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add image
              </button>
            </>
          )}

          {/* Testimonials */}
          {section.section_type === "testimonials" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              {(config.items || []).map(
                (item: Record<string, string>, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-black/[0.08]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#9CA3AF]">
                        Review {i + 1}
                      </span>
                      <button
                        onClick={() => removeItem("items", i)}
                        className="text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        className={inputCls}
                        value={item.name || ""}
                        onChange={(e) =>
                          setItem("items", i, "name", e.target.value)
                        }
                        placeholder="Author name"
                      />
                      <input
                        className={inputCls}
                        value={item.role || ""}
                        onChange={(e) =>
                          setItem("items", i, "role", e.target.value)
                        }
                        placeholder="Role (e.g. 3yr tenant)"
                      />
                    </div>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={item.text || ""}
                      onChange={(e) =>
                        setItem("items", i, "text", e.target.value)
                      }
                      placeholder="Quote / review text"
                    />
                  </div>
                )
              )}
              <button
                onClick={() =>
                  addItem("items", {
                    name: "",
                    text: "",
                    role: "",
                    metric: "",
                  })
                }
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add testimonial
              </button>
            </>
          )}

          {/* FAQ */}
          {section.section_type === "faq" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              {(config.items || []).map(
                (item: Record<string, string>, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-black/[0.08]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#9CA3AF]">
                        Q{i + 1}
                      </span>
                      <button
                        onClick={() => removeItem("items", i)}
                        className="text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      className={`${inputCls} mb-2`}
                      value={item.q || ""}
                      onChange={(e) =>
                        setItem("items", i, "q", e.target.value)
                      }
                      placeholder="Question"
                    />
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={item.a || ""}
                      onChange={(e) =>
                        setItem("items", i, "a", e.target.value)
                      }
                      placeholder="Answer"
                    />
                  </div>
                )
              )}
              <button
                onClick={() => addItem("items", { q: "", a: "" })}
                className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80"
              >
                + Add question
              </button>
            </>
          )}

          {/* CTA */}
          {section.section_type === "cta" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
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
                  value={config.subheadline || ""}
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
                    value={config.ctaText || ""}
                    onChange={(e) => set("ctaText", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] mb-1 block">
                    CTA URL
                  </label>
                  <input
                    className={inputCls}
                    value={config.ctaUrl || ""}
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
                    value={config.phone || ""}
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
                    value={config.style || "gradient"}
                    onChange={(e) => set("style", e.target.value)}
                  >
                    <option value="gradient">Dark Gradient</option>
                    <option value="simple">Simple</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Location Map */}
          {section.section_type === "location_map" && (
            <>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Headline
                </label>
                <input
                  className={inputCls}
                  value={config.headline || ""}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Address
                </label>
                <input
                  className={inputCls}
                  value={config.address || ""}
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
                  value={config.directions || ""}
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
                  value={config.googleMapsEmbed || ""}
                  onChange={(e) =>
                    set("googleMapsEmbed", e.target.value)
                  }
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Landing Page Builder ── */

export default function LandingPageBuilder({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  const [pages, setPages] = useState<LandingPageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<LandingPageRecord | null>(
    null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [assetPicker, setAssetPicker] = useState<{
    field: string
    sectionId?: string
    arrayKey?: string
    arrayIdx?: number
  } | null>(null)

  const inputCls =
    "w-full h-9 px-3 rounded-lg text-sm outline-none transition-all bg-[#F9FAFB] border border-black/[0.08] text-[#111827] focus:border-[#3B82F6]/50 placeholder:text-[#9CA3AF]"

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/landing-pages?facilityId=${facilityId}`,
        {
          headers: { "X-Admin-Key": adminKey },
        }
      )
      if (!res.ok) throw new Error("Failed to fetch pages")
      const data = await res.json()
      setPages(data.pages || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  function createFromTemplate(templateKey: string) {
    const template = PAGE_TEMPLATES[templateKey]
    if (!template) return
    const sections: LPSection[] = template.sectionTypes.map((type, i) => ({
      id: crypto.randomUUID(),
      section_type: type,
      sort_order: i,
      config: JSON.parse(
        JSON.stringify(
          SECTION_TYPE_META[type]?.defaultConfig || {}
        )
      ),
    }))

    setEditingPage({
      id: "",
      facility_id: facilityId,
      slug: slugify("landing-page"),
      title: "New Landing Page",
      status: "draft",
      meta_title: "",
      meta_description: "",
      theme: {},
      storedge_widget_url: "",
      sections,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setShowTemplatePicker(false)
  }

  async function clonePage(pageId: string) {
    try {
      const res = await fetch("/api/landing-pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ cloneFrom: pageId }),
      })
      if (!res.ok) throw new Error("Clone failed")
      const data = await res.json()
      fetchPages()
      setEditingPage(data.page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  async function savePage() {
    if (!editingPage) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        facilityId,
        title: editingPage.title,
        slug: editingPage.slug,
        metaTitle: editingPage.meta_title,
        metaDescription: editingPage.meta_description,
        theme: editingPage.theme,
        status: editingPage.status,
        storedgeWidgetUrl: editingPage.storedge_widget_url,
        variationIds: editingPage.variation_ids || [],
        sections: (editingPage.sections || []).map((s, i) => ({
          sectionType: s.section_type,
          sortOrder: i,
          config: s.config,
        })),
      }

      const isNew = !editingPage.id
      const url = isNew
        ? "/api/landing-pages"
        : `/api/landing-pages?id=${editingPage.id}`
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok)
        throw new Error(data.error || data.fields?.slug || "Save failed")

      setEditingPage(data.page)
      fetchPages()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function publishPage() {
    if (!editingPage?.id) {
      await savePage()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/landing-pages?id=${editingPage.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({ status: "published" }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")
      setEditingPage({
        ...editingPage,
        status: "published",
        published_at: new Date().toISOString(),
      })
      fetchPages()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(id: string) {
    try {
      await fetch(`/api/landing-pages?id=${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      })
      fetchPages()
      if (editingPage?.id === id) setEditingPage(null)
    } catch {
      /* silent */
    }
  }

  async function openPageForEdit(pageId: string) {
    try {
      const res = await fetch(`/api/landing-pages?id=${pageId}`, {
        headers: { "X-Admin-Key": adminKey },
      })
      if (!res.ok) throw new Error("Failed to load page")
      const data = await res.json()
      setEditingPage(data.page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateSection(sectionId: string, config: Record<string, any>) {
    if (!editingPage) return
    setEditingPage({
      ...editingPage,
      sections: (editingPage.sections || []).map((s) =>
        s.id === sectionId ? { ...s, config } : s
      ),
    })
  }

  function removeSection(sectionId: string) {
    if (!editingPage) return
    setEditingPage({
      ...editingPage,
      sections: (editingPage.sections || []).filter(
        (s) => s.id !== sectionId
      ),
    })
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    if (!editingPage?.sections) return
    const sections = [...editingPage.sections]
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return
    ;[sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]]
    setEditingPage({
      ...editingPage,
      sections: sections.map((s, i) => ({ ...s, sort_order: i })),
    })
  }

  function addSection(sectionType: string) {
    if (!editingPage) return
    const meta = SECTION_TYPE_META[sectionType]
    if (!meta) return
    const newSection: LPSection = {
      id: crypto.randomUUID(),
      section_type: sectionType,
      sort_order: (editingPage.sections || []).length,
      config: JSON.parse(JSON.stringify(meta.defaultConfig)),
    }
    setEditingPage({
      ...editingPage,
      sections: [...(editingPage.sections || []), newSection],
    })
    setShowAddSection(false)
  }

  /* ── TEMPLATE PICKER ── */
  if (showTemplatePicker) {
    return (
      <div className="border border-black/[0.08] rounded-xl bg-white">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">
                Choose a Template
              </h3>
              <p className="text-sm text-[#9CA3AF]">
                Pick a starting layout for your landing page
              </p>
            </div>
            <button
              onClick={() => setShowTemplatePicker(false)}
              className="text-[#9CA3AF]"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {Object.entries(PAGE_TEMPLATES).map(([key, tmpl]) => (
              <button
                key={key}
                onClick={() => createFromTemplate(key)}
                className="p-5 rounded-xl border border-black/[0.08] text-left transition-all hover:border-[#3B82F6]/50 hover:bg-black/[0.03]"
              >
                <p className="text-sm font-semibold text-[#111827] mb-1">
                  {tmpl.label}
                </p>
                <p className="text-xs text-[#9CA3AF]">{tmpl.desc}</p>
              </button>
            ))}
          </div>

          {/* Clone from existing */}
          {pages.length > 0 && (
            <div className="border-t border-black/[0.08] pt-4">
              <p className="text-xs font-semibold text-[#6B7280] mb-3">
                Or clone an existing page
              </p>
              <div className="space-y-2">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => clonePage(p.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-black/[0.08] text-left hover:bg-black/[0.03] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#111827]">
                        {p.title}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        /lp/{p.slug}
                      </p>
                    </div>
                    <Copy size={14} className="text-[#9CA3AF]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── PAGE LIST VIEW ── */
  if (!editingPage) {
    return (
      <div className="space-y-4">
        <div className="border border-black/[0.08] rounded-xl bg-white">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-[#111827]">
                  Landing Pages
                </h3>
                <p className="text-sm text-[#9CA3AF]">
                  Ad-specific pages for this facility
                </p>
              </div>
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#111827] bg-[#3B82F6] hover:bg-[#3B82F6]/90 transition-colors"
              >
                <Plus size={14} /> Create Page
              </button>
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2
                  size={20}
                  className="animate-spin text-[#3B82F6]"
                />
              </div>
            )}

            {!loading && pages.length === 0 && (
              <div className="text-center py-12 rounded-xl border-2 border-dashed border-black/[0.08]">
                <FileText
                  size={32}
                  className="mx-auto mb-3 text-[#9CA3AF]"
                />
                <p className="text-sm font-medium text-[#111827] mb-1">
                  No landing pages yet
                </p>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  Create your first ad-specific landing page for this
                  facility
                </p>
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#111827] bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                >
                  <Plus size={14} /> Create Page
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 font-medium hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {pages.length > 0 && (
              <div className="space-y-2">
                {pages.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-black/[0.08] cursor-pointer hover:bg-black/[0.03] transition-all"
                    onClick={() => openPageForEdit(p.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#111827] truncate">
                          {p.title}
                        </p>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            p.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : p.status === "archived"
                                ? "bg-black/[0.04] text-[#9CA3AF]"
                                : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.variation_ids &&
                          p.variation_ids.length > 0 && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3B82F6]/10 text-[#3B82F6]">
                              {p.variation_ids.length} ad
                              {p.variation_ids.length > 1 ? "s" : ""}{" "}
                              linked
                            </span>
                          )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        /lp/{p.slug}
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        Created{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/lp/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-black/[0.04]"
                        title="Open preview"
                      >
                        <ExternalLink
                          size={14}
                          className="text-[#9CA3AF]"
                        />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clonePage(p.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/[0.04]"
                        title="Duplicate page"
                      >
                        <Copy size={14} className="text-[#9CA3AF]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePage(p.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/[0.04]"
                        title="Delete page"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── PAGE EDITOR VIEW ── */
  const sections = editingPage.sections || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setEditingPage(null)}
          className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft size={14} /> Back to pages
        </button>
        <div className="flex items-center gap-2">
          {editingPage.id && (
            <a
              href={`/lp/${editingPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/[0.08] text-[#6B7280] hover:bg-black/[0.04]"
            >
              Preview
            </a>
          )}
          <button
            onClick={savePage}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border border-black/[0.08] text-[#111827] hover:bg-black/[0.04] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={publishPage}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#111827] bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:opacity-40"
          >
            {editingPage.status === "published" ? "Published" : "Publish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Page settings */}
        <div className="border border-black/[0.08] rounded-xl p-5 bg-white">
          <h4 className="text-sm font-semibold text-[#111827] mb-3">
            Page Settings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] mb-1 block">
                Page Title
              </label>
              <input
                className={inputCls}
                value={editingPage.title}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    title: e.target.value,
                    slug: !editingPage.id
                      ? slugify(e.target.value)
                      : editingPage.slug,
                  })
                }
                placeholder="e.g. Climate Controlled -- Campaign A"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] mb-1 block">
                URL Slug
              </label>
              <div className="flex items-center gap-0">
                <span className="text-xs text-[#9CA3AF] px-2 py-2 rounded-l-lg border border-r-0 border-black/[0.08] bg-[#F9FAFB]">
                  /lp/
                </span>
                <input
                  className={`${inputCls} rounded-l-none`}
                  value={editingPage.slug}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      slug: slugify(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] mb-1 block">
                SEO Title
              </label>
              <input
                className={inputCls}
                value={editingPage.meta_title || ""}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    meta_title: e.target.value,
                  })
                }
                placeholder="Page title for search engines"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9CA3AF] mb-1 block">
                SEO Description
              </label>
              <input
                className={inputCls}
                value={editingPage.meta_description || ""}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    meta_description: e.target.value,
                  })
                }
                placeholder="Short description for search results"
              />
            </div>
          </div>

          {/* storEDGE Widget URL */}
          <div className="mt-3">
            <label className="text-xs font-medium text-[#9CA3AF] mb-1 block">
              storEDGE Widget URL
            </label>
            <input
              className={inputCls}
              value={editingPage.storedge_widget_url || ""}
              onChange={(e) =>
                setEditingPage({
                  ...editingPage,
                  storedge_widget_url: e.target.value,
                })
              }
              placeholder="https://www.storedge.com/widget/..."
            />
          </div>

          {/* Theme */}
          <div className="mt-4 pt-4 border-t border-black/[0.08]">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-[#9CA3AF]" />
              <span className="text-xs font-semibold text-[#111827]">
                Theme Customization
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      editingPage.theme?.primaryColor || "#10b981"
                    }
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        theme: {
                          ...editingPage.theme,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs text-[#9CA3AF]">
                    {editingPage.theme?.primaryColor || "#10b981"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      editingPage.theme?.accentColor || "#0f172a"
                    }
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        theme: {
                          ...editingPage.theme,
                          accentColor: e.target.value,
                        },
                      })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs text-[#9CA3AF]">
                    {editingPage.theme?.accentColor || "#0f172a"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">
                  Font
                </label>
                <select
                  className={inputCls}
                  value={editingPage.theme?.fontFamily || "system"}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      theme: {
                        ...editingPage.theme,
                        fontFamily: e.target.value,
                      },
                    })
                  }
                >
                  <option value="system">System Default</option>
                  <option value="inter">Inter</option>
                  <option value="dm-sans">DM Sans</option>
                  <option value="poppins">Poppins</option>
                </select>
              </div>
            </div>
            <button
              onClick={() =>
                setEditingPage({ ...editingPage, theme: {} })
              }
              className="text-xs text-[#9CA3AF] hover:text-red-400 transition-colors mt-2"
            >
              Reset to default
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="border border-black/[0.08] rounded-xl bg-white">
          <div className="p-5">
            <h4 className="text-sm font-semibold text-[#111827] mb-3">
              Sections ({sections.length})
            </h4>
            <div className="space-y-3">
              {sections
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((section, idx) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    isFirst={idx === 0}
                    isLast={idx === sections.length - 1}
                    onUpdate={(config) =>
                      updateSection(section.id, config)
                    }
                    onRemove={() => removeSection(section.id)}
                    onMove={(dir) => moveSection(section.id, dir)}
                    onPickAsset={(field, arrayKey, arrayIdx) =>
                      setAssetPicker({
                        sectionId: section.id,
                        field,
                        arrayKey,
                        arrayIdx,
                      })
                    }
                  />
                ))}
            </div>

            {/* Add section */}
            <div className="mt-4">
              {showAddSection ? (
                <div className="border border-black/[0.08] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[#111827]">
                      Add Section
                    </p>
                    <button
                      onClick={() => setShowAddSection(false)}
                      className="text-[#9CA3AF]"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(SECTION_TYPE_META).map(
                      ([type, meta]) => (
                        <button
                          key={type}
                          onClick={() => addSection(type)}
                          className="p-3 rounded-lg border border-black/[0.08] text-left transition-colors hover:border-[#3B82F6]/50 hover:bg-black/[0.03]"
                        >
                          <span className="w-6 h-6 rounded bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center text-xs font-semibold">
                            {meta.icon}
                          </span>
                          <p className="text-xs font-medium text-[#111827] mt-1">
                            {meta.label}
                          </p>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-black/[0.08] text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#3B82F6]/50 hover:text-[#3B82F6]"
                >
                  <Plus size={14} className="inline mr-1" /> Add Section
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Picker Modal */}
      {assetPicker && (
        <AssetPickerModal
          facilityId={facilityId}
          adminKey={adminKey}
          onClose={() => setAssetPicker(null)}
          onSelect={(url) => {
            if (!editingPage) return
            const { sectionId, field, arrayKey, arrayIdx } = assetPicker
            if (
              sectionId &&
              arrayKey !== undefined &&
              arrayIdx !== undefined
            ) {
              setEditingPage({
                ...editingPage,
                sections: (editingPage.sections || []).map((s) => {
                  if (s.id !== sectionId) return s
                  const arr = [...(s.config[arrayKey!] || [])]
                  arr[arrayIdx!] = {
                    ...arr[arrayIdx!],
                    [field]: url,
                  }
                  return {
                    ...s,
                    config: { ...s.config, [arrayKey!]: arr },
                  }
                }),
              })
            } else if (sectionId) {
              updateSection(sectionId, {
                ...(editingPage.sections || []).find(
                  (s) => s.id === sectionId
                )?.config,
                [field]: url,
              })
            }
          }}
        />
      )}
    </div>
  )
}
