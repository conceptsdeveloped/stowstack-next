'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Upload, Trash2, X, ChevronDown, ChevronUp,
  Eye, EyeOff, Copy, Check, Tag, Sparkles,
} from 'lucide-react'

interface StyleReference {
  id: string
  facility_id: string | null
  created_at: string
  image_url: string
  title: string | null
  tags: string[]
  analysis: {
    composition?: string
    color_palette?: string
    lighting?: string
    typography?: string
    mood?: string
    effectiveness?: string
    style_directive?: string
  }
  active: boolean
}

export default function StyleReferences({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [references, setReferences] = useState<StyleReference[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [filterTag, setFilterTag] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetchRefs()
  }, [facilityId, adminKey])

  async function fetchRefs() {
    try {
      const res = await fetch(`/api/style-references?facilityId=${facilityId}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      const data = await res.json()
      if (data.references) setReferences(data.references)
    } catch {
      setError('Failed to load style references.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      if (!isGlobal) formData.append('facilityId', facilityId)
      if (title.trim()) formData.append('title', title.trim())
      if (tags.trim()) formData.append('tags', tags.trim())

      const res = await fetch('/api/style-references', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Upload failed')
        return
      }
      if (data.reference) {
        setReferences(prev => [data.reference, ...prev])
        setTitle('')
        setTags('')
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch('/api/style-references', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id, active }),
      })
      const data = await res.json()
      if (data.reference) {
        setReferences(prev => prev.map(r => r.id === id ? data.reference : r))
      }
    } catch {
      setError('Failed to update reference.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/style-references', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id }),
      })
      setReferences(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Failed to delete reference.')
    }
  }

  function handleCopyDirective(directive: string, id: string) {
    navigator.clipboard.writeText(directive)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleUpload(file)
  }

  const allTags = [...new Set(references.flatMap(r => r.tags))]
  const filtered = filterTag === 'all' ? references : references.filter(r => r.tags.includes(filterTag))
  const activeCount = references.filter(r => r.active).length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-[#F5F5F7]">Style References</h4>
        <p className="text-xs text-[#6E6E73] mt-1">
          Upload images of great ads. Claude Vision extracts style principles and injects them into your image and video generation.
          {activeCount > 0 && <span className="text-[#3B82F6]"> {activeCount} active reference{activeCount !== 1 ? 's' : ''} informing generation.</span>}
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
          dragOver
            ? 'border-[#3B82F6] bg-[#3B82F6]/5'
            : 'border-white/[0.08] hover:border-white/[0.15]'
        }`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#A1A1A6] block mb-1.5">Title (optional)</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Porsche 911 Print 1986"
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-white/[0.03] text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#A1A1A6] block mb-1.5">Tags (optional, comma-separated)</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g., typography, warm-light, editorial"
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-white/[0.03] text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[#A1A1A6] cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={e => setIsGlobal(e.target.checked)}
                className="rounded border-white/[0.12] bg-white/[0.03]"
              />
              Apply to all facilities (global)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.target.value = ''
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {uploading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Upload size={14} /> Upload & Analyze</>
              )}
            </button>
            <p className="text-[10px] text-[#6E6E73]">
              {uploading ? 'Claude Vision is extracting style principles...' : 'Drop an image here or click to upload'}
            </p>
          </div>
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <Tag size={12} className="text-[#6E6E73] mr-1" />
          <button
            onClick={() => setFilterTag('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterTag === 'all' ? 'bg-[#3B82F6] text-white' : 'text-[#6E6E73] hover:bg-white/[0.04]'
            }`}
          >
            All ({references.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterTag === tag ? 'bg-[#3B82F6] text-white' : 'text-[#6E6E73] hover:bg-white/[0.04]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Reference grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-white/[0.06]">
          <Sparkles size={32} className="mx-auto mb-3 text-[#6E6E73]" />
          <p className="font-medium text-[#F5F5F7]">No style references yet</p>
          <p className="text-sm text-[#6E6E73] mt-1 max-w-md mx-auto">
            Upload images of ads, campaigns, or visual styles you admire. Claude will extract what makes them great and use those principles when generating your creative.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ref => {
            const expanded = expandedId === ref.id
            return (
              <div
                key={ref.id}
                className={`border rounded-xl overflow-hidden bg-[#111111] transition-all ${
                  ref.active ? 'border-white/[0.06]' : 'border-white/[0.04] opacity-60'
                }`}
              >
                {/* Image */}
                <div className="relative">
                  <img
                    src={ref.image_url}
                    alt={ref.title || 'Style reference'}
                    className="w-full h-40 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {!ref.active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-xs text-white/60 font-medium">Inactive</span>
                    </div>
                  )}
                  {ref.facility_id === null && (
                    <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded bg-[#3B82F6]/80 text-white font-medium">
                      Global
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F5F5F7] truncate">
                        {ref.title || 'Untitled Reference'}
                      </p>
                      <p className="text-[10px] text-[#6E6E73] mt-0.5">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(ref.id, !ref.active)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#A1A1A6] hover:bg-white/[0.04] transition-colors"
                        title={ref.active ? 'Disable' : 'Enable'}
                      >
                        {ref.active ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(ref.id)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {ref.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ref.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#A1A1A6]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Style directive */}
                  {ref.analysis.style_directive && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[10px] text-[#3B82F6] font-medium mb-1">Style Directive</p>
                      <p className="text-[11px] text-[#F5F5F7] leading-relaxed">
                        {ref.analysis.style_directive}
                      </p>
                      <button
                        onClick={() => handleCopyDirective(ref.analysis.style_directive!, ref.id)}
                        className="flex items-center gap-1 mt-1.5 text-[10px] text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
                      >
                        {copiedId === ref.id ? (
                          <><Check size={10} className="text-emerald-400" /> Copied</>
                        ) : (
                          <><Copy size={10} /> Copy directive</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expand/collapse full analysis */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : ref.id)}
                    className="flex items-center gap-1 text-[11px] text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
                  >
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded ? 'Hide' : 'View'} full analysis
                  </button>

                  {expanded && (
                    <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                      {ref.analysis.composition && (
                        <AnalysisField label="Composition" value={ref.analysis.composition} />
                      )}
                      {ref.analysis.color_palette && (
                        <AnalysisField label="Color" value={ref.analysis.color_palette} />
                      )}
                      {ref.analysis.lighting && (
                        <AnalysisField label="Lighting" value={ref.analysis.lighting} />
                      )}
                      {ref.analysis.typography && (
                        <AnalysisField label="Typography" value={ref.analysis.typography} />
                      )}
                      {ref.analysis.mood && (
                        <AnalysisField label="Mood" value={ref.analysis.mood} />
                      )}
                      {ref.analysis.effectiveness && (
                        <AnalysisField label="Why it works" value={ref.analysis.effectiveness} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AnalysisField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#6E6E73]">{label}</p>
      <p className="text-[11px] text-[#A1A1A6] leading-relaxed mt-0.5">{value}</p>
    </div>
  )
}
