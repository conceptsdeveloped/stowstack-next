"use client"

import { X as XIcon, Copy } from "lucide-react"
import { type LandingPageRecord, PAGE_TEMPLATES } from "./lp-builder-types"

export function TemplatePicker({
  pages,
  onSelectTemplate,
  onClonePage,
  onClose,
}: {
  pages: LandingPageRecord[]
  onSelectTemplate: (templateKey: string) => void
  onClonePage: (pageId: string) => void
  onClose: () => void
}) {
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
            onClick={onClose}
            className="text-[#9CA3AF]"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(PAGE_TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => onSelectTemplate(key)}
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
                  onClick={() => onClonePage(p.id)}
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
