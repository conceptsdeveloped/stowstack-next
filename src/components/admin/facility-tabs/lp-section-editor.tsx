"use client"

import { useState } from "react"
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
} from "lucide-react"
import {
  type LPSection,
  SECTION_TYPE_META,
  INPUT_CLS,
  TEXTAREA_CLS,
} from "./lp-builder-types"

export function SectionEditor({
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

  const inputCls = INPUT_CLS
  const textareaCls = TEXTAREA_CLS

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
