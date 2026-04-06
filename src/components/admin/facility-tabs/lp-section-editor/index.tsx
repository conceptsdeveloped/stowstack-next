"use client"

import { useState } from "react"
import {
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import {
  type LPSection,
  SECTION_TYPE_META,
  INPUT_CLS,
  TEXTAREA_CLS,
} from "../lp-builder-types"
import { HeroFields, CtaFields, LocationMapFields } from "./basic-section-fields"
import {
  TrustBarFields,
  FeaturesFields,
  UnitTypesFields,
  GalleryFields,
  TestimonialsFields,
  FaqFields,
} from "./list-section-fields"

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

  const listProps = { config, set, setItem, addItem, removeItem, inputCls, textareaCls, onPickAsset }

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
          {section.section_type === "hero" && (
            <HeroFields config={config} set={set} inputCls={inputCls} textareaCls={textareaCls} onPickAsset={onPickAsset} />
          )}
          {section.section_type === "trust_bar" && <TrustBarFields {...listProps} />}
          {section.section_type === "features" && <FeaturesFields {...listProps} />}
          {section.section_type === "unit_types" && <UnitTypesFields {...listProps} />}
          {section.section_type === "gallery" && <GalleryFields {...listProps} />}
          {section.section_type === "testimonials" && <TestimonialsFields {...listProps} />}
          {section.section_type === "faq" && <FaqFields {...listProps} />}
          {section.section_type === "cta" && (
            <CtaFields config={config} set={set} inputCls={inputCls} textareaCls={textareaCls} />
          )}
          {section.section_type === "location_map" && (
            <LocationMapFields config={config} set={set} inputCls={inputCls} textareaCls={textareaCls} />
          )}
        </div>
      )}
    </div>
  )
}
