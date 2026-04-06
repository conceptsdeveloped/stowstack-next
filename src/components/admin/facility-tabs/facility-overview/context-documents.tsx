"use client"

import { useState } from "react"
import { Loader2, FileText, Trash2, Plus } from "lucide-react"
import { CONTEXT_TYPES, type ContextDoc } from "./types"

export function ContextDocuments({
  facilityId,
  adminKey,
  contextDocs,
  setContextDocs,
}: {
  facilityId: string
  adminKey: string
  contextDocs: ContextDoc[]
  setContextDocs: React.Dispatch<React.SetStateAction<ContextDoc[]>>
}) {
  const [addingDoc, setAddingDoc] = useState(false)
  const [newDocType, setNewDocType] = useState("competitor_info")
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocContent, setNewDocContent] = useState("")
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  async function addContextDoc() {
    if (!newDocTitle.trim()) return
    try {
      const res = await fetch("/api/facility-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          type: newDocType,
          title: newDocTitle.trim(),
          content: newDocContent.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.doc) setContextDocs((prev) => [data.doc, ...prev])
      setNewDocTitle("")
      setNewDocContent("")
      setAddingDoc(false)
    } catch {
      // Silently fail — user can retry
    }
  }

  async function deleteDoc(docId: string) {
    setDeletingDocId(docId)
    try {
      await fetch("/api/facility-context", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ docId }),
      })
      setContextDocs((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      // Silently fail
    } finally {
      setDeletingDocId(null)
    }
  }

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--color-gold)]" />
            <h4 className="text-sm font-semibold text-[var(--color-dark)]">
              Business Context
            </h4>
          </div>
          <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
            Upload competitor info, pricing sheets, branding docs — anything
            that informs the marketing strategy
          </p>
        </div>
        <button
          onClick={() => setAddingDoc(!addingDoc)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors flex-shrink-0"
        >
          <Plus size={12} /> Add Context
        </button>
      </div>

      {/* Add new doc form */}
      {addingDoc && (
        <div className="px-5 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
                Type
              </label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
              >
                {CONTEXT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
                Title
              </label>
              <input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g., Local competitor analysis"
                className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
              Content
            </label>
            <textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              rows={4}
              placeholder="Paste competitor info, pricing details, market notes, branding guidelines, or any business context that should inform the marketing plan..."
              className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addContextDoc}
              disabled={!newDocTitle.trim()}
              className="px-4 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setAddingDoc(false)}
              className="px-4 py-1.5 text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {contextDocs.length > 0 ? (
        <div
          className={`px-5 pb-4 space-y-2 ${addingDoc ? "" : "border-t border-[var(--border-subtle)] pt-3"}`}
        >
          {contextDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-light-gray)]"
            >
              <FileText size={16} className="text-[var(--color-mid-gray)] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {doc.title}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                    {CONTEXT_TYPES.find((t) => t.id === doc.type)?.label ||
                      doc.type}
                  </span>
                </div>
                {doc.content && (
                  <p className="text-xs text-[var(--color-mid-gray)] mt-1 line-clamp-2">
                    {doc.content}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteDoc(doc.id)}
                disabled={deletingDocId === doc.id}
                className="p-1 text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
              >
                {deletingDocId === doc.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        !addingDoc && (
          <div className="px-5 pb-4 border-t border-[var(--border-subtle)] pt-3">
            <p className="text-xs text-[var(--color-mid-gray)] text-center py-4">
              No context documents yet. Add competitor info, pricing sheets,
              or branding guides to improve marketing plan quality.
            </p>
          </div>
        )
      )}
    </div>
  )
}
