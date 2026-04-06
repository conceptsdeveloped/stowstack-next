"use client"

import { Trash2, ImageIcon } from "lucide-react"

/** Shared props for list section field components */
interface ListSectionProps {
  config: Record<string, unknown>
  set: (key: string, val: unknown) => void
  setItem: (arrayKey: string, idx: number, field: string, val: unknown) => void
  addItem: (arrayKey: string, template: Record<string, unknown>) => void
  removeItem: (arrayKey: string, idx: number) => void
  inputCls: string
  textareaCls: string
  onPickAsset?: (field: string, arrayKey?: string, arrayIdx?: number) => void
}

export function TrustBarFields({
  config,
  setItem,
  addItem,
  removeItem,
  inputCls,
}: ListSectionProps) {
  return (
    <>
      {((config.items as Record<string, string>[]) || []).map(
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
  )
}

export function FeaturesFields({
  config,
  set,
  setItem,
  addItem,
  removeItem,
  inputCls,
  textareaCls,
}: ListSectionProps) {
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
      {((config.items as Record<string, string>[]) || []).map(
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
  )
}

export function UnitTypesFields({
  config,
  set,
  setItem,
  addItem,
  removeItem,
  inputCls,
}: ListSectionProps) {
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
      {((config.units as Record<string, string>[]) || []).map(
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
  )
}

export function GalleryFields({
  config,
  set,
  setItem,
  addItem,
  removeItem,
  inputCls,
  onPickAsset,
}: ListSectionProps) {
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
      {((config.images as Record<string, string>[]) || []).map(
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
  )
}

export function TestimonialsFields({
  config,
  set,
  setItem,
  addItem,
  removeItem,
  inputCls,
  textareaCls,
}: ListSectionProps) {
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
      {((config.items as Record<string, string>[]) || []).map(
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
  )
}

export function FaqFields({
  config,
  set,
  setItem,
  addItem,
  removeItem,
  inputCls,
  textareaCls,
}: ListSectionProps) {
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
      {((config.items as Record<string, string>[]) || []).map(
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
  )
}
