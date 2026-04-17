"use client"

import { useState } from "react"
import { Plus, ArrowLeft, X as XIcon, Palette } from "lucide-react"
import {
  type LPSection,
  type LandingPageRecord,
  SECTION_TYPE_META,
  INPUT_CLS,
} from "./lp-builder-types"
import { SectionEditor } from "./lp-section-editor/index"
import { AssetPickerModal } from "./lp-asset-picker-modal"

export function PageEditor({
  facilityId,
  adminKey,
  editingPage,
  saving,
  error,
  onUpdatePage,
  onSave,
  onPublish,
  onBack,
  onDismissError,
}: {
  facilityId: string
  adminKey: string
  editingPage: LandingPageRecord
  saving: boolean
  error: string | null
  onUpdatePage: (page: LandingPageRecord) => void
  onSave: () => void
  onPublish: () => void
  onBack: () => void
  onDismissError: () => void
}) {
  const [showAddSection, setShowAddSection] = useState(false)
  const [assetPicker, setAssetPicker] = useState<{
    field: string
    sectionId?: string
    arrayKey?: string
    arrayIdx?: number
  } | null>(null)

  const inputCls = INPUT_CLS
  const sections = editingPage.sections || []

  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateSection(sectionId: string, config: Record<string, any>) {
    onUpdatePage({
      ...editingPage,
      sections: (editingPage.sections || []).map((s) =>
        s.id === sectionId ? { ...s, config } : s
      ),
    })
  }

  function removeSection(sectionId: string) {
    onUpdatePage({
      ...editingPage,
      sections: (editingPage.sections || []).filter(
        (s) => s.id !== sectionId
      ),
    })
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    if (!editingPage.sections) return
    const sects = [...editingPage.sections]
    const idx = sects.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sects.length) return
    ;[sects[idx], sects[newIdx]] = [sects[newIdx], sects[idx]]
    onUpdatePage({
      ...editingPage,
      sections: sects.map((s, i) => ({ ...s, sort_order: i })),
    })
  }

  function addSection(sectionType: string) {
    const meta = SECTION_TYPE_META[sectionType]
    if (!meta) return
    const newSection: LPSection = {
      id: crypto.randomUUID(),
      section_type: sectionType,
      sort_order: sections.length,
      config: JSON.parse(JSON.stringify(meta.defaultConfig)),
    }
    onUpdatePage({
      ...editingPage,
      sections: [...sections, newSection],
    })
    setShowAddSection(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft size={14} /> Back to pages
        </button>
        <div className="flex items-center gap-2">
          {editingPage.id && (
            <a
              href={`/lp/${editingPage.slug}${editingPage.status === "published" ? "" : "?preview=1"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/[0.08] text-[#6B7280] hover:bg-black/[0.04]"
            >
              Preview
            </a>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border border-black/[0.08] text-[#111827] hover:bg-black/[0.04] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={onPublish}
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
            onClick={onDismissError}
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
                  onUpdatePage({
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
                    onUpdatePage({
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
                  onUpdatePage({
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
                  onUpdatePage({
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
                onUpdatePage({
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
                      onUpdatePage({
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
                      onUpdatePage({
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
                    onUpdatePage({
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
                onUpdatePage({ ...editingPage, theme: {} })
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
                      aria-label="Close add section"
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
            const { sectionId, field, arrayKey, arrayIdx } = assetPicker
            if (
              sectionId &&
              arrayKey !== undefined &&
              arrayIdx !== undefined
            ) {
              onUpdatePage({
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
