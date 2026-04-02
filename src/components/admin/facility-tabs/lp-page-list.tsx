"use client"

import {
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react"
import { type LandingPageRecord } from "./lp-builder-types"

export function PageList({
  pages,
  loading,
  error,
  onCreateNew,
  onOpenPage,
  onClonePage,
  onDeletePage,
  onDismissError,
}: {
  pages: LandingPageRecord[]
  loading: boolean
  error: string | null
  onCreateNew: () => void
  onOpenPage: (pageId: string) => void
  onClonePage: (pageId: string) => void
  onDeletePage: (pageId: string) => void
  onDismissError: () => void
}) {
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
              onClick={onCreateNew}
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
                onClick={onCreateNew}
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
                onClick={onDismissError}
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
                  onClick={() => onOpenPage(p.id)}
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
                        onClonePage(p.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-black/[0.04]"
                      title="Duplicate page"
                    >
                      <Copy size={14} className="text-[#9CA3AF]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeletePage(p.id)
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
