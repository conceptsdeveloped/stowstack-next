'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Upload, Trash2, X, ChevronDown, ChevronUp,
  Eye, EyeOff, Copy, Check, Tag, Sparkles, Star, Pencil,
  Maximize2,
} from 'lucide-react'
import { useAdmin } from '@/lib/admin-context'

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
    pacing?: string
    camera_movement?: string
    motion_language?: string
    transitions?: string
  }
  active: boolean
}

export default function StyleReferencesPage() {
  const { adminKey } = useAdmin()
  const [references, setReferences] = useState<StyleReference[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!adminKey) return
    fetchRefs()
  }, [adminKey])

  async function fetchRefs() {
    try {
      const res = await fetch('/api/style-references', {
        headers: { 'X-Admin-Key': adminKey! },
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || `Load failed (${res.status})`)
        return
      }
      if (data.references) setReferences(data.references)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load style references.')
    } finally {
      setLoading(false)
    }
  }

  async function uploadSingle(file: File) {
    const isVideo = file.type.startsWith('video/')
    const isLarge = file.size > 4 * 1024 * 1024
    if (isVideo || isLarge) {
      // Step 1: Upload to blob via streaming proxy
      const uploadRes = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', '/api/upload-token')
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.setRequestHeader('X-Admin-Key', adminKey!)
        xhr.setRequestHeader('X-Filename', file.name)
        xhr.responseType = 'text'
        xhr.timeout = 300000 // 5 minutes
        xhr.onload = () => {
          resolve(new Response(xhr.responseText || '', { status: xhr.status }))
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.ontimeout = () => reject(new Error('Upload timed out (5 min)'))
        xhr.send(file)
      })

      const uploadText = await uploadRes.text()
      if (!uploadText) throw new Error(`Upload returned empty response (status ${uploadRes.status})`)

      let uploadData: { url?: string; error?: string }
      try {
        uploadData = JSON.parse(uploadText)
      } catch {
        throw new Error(`Upload parse error: "${uploadText.slice(0, 200)}"`)
      }
      if (uploadRes.status !== 200 || !uploadData.url) {
        throw new Error(uploadData.error || `Upload failed (${uploadRes.status})`)
      }

      // Step 2: Send blob URL to analysis API (no large file in body)
      const formData = new FormData()
      formData.append('url', uploadData.url)
      if (title.trim()) formData.append('title', title.trim())
      if (tags.trim()) formData.append('tags', tags.trim())
      if (isVideo) formData.append('isVideo', 'true')

      const res = await fetch('/api/style-references', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey! },
        body: formData,
      })
      const analysisText = await res.text()
      if (!analysisText) throw new Error(`Video analysis returned empty response (status ${res.status}) — likely timed out. Try a shorter clip.`)
      let data: { reference?: StyleReference; error?: string }
      try {
        data = JSON.parse(analysisText)
      } catch {
        throw new Error(`Video analysis error (${res.status}): ${analysisText.slice(0, 300)}`)
      }
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed')
      return data.reference as StyleReference
    }

    // Small image files go directly via FormData
    const formData = new FormData()
    formData.append('image', file)
    if (title.trim()) formData.append('title', title.trim())
    if (tags.trim()) formData.append('tags', tags.trim())

    const res = await fetch('/api/style-references', {
      method: 'POST',
      headers: { 'X-Admin-Key': adminKey! },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Upload failed')
    return data.reference as StyleReference
  }

  async function handleUpload(files?: FileList | File[]) {
    setUploading(true)
    setError(null)

    try {
      if (urlInput.trim()) {
        // URL upload
        setUploadProgress('Analyzing URL...')
        const formData = new FormData()
        formData.append('url', urlInput.trim())
        if (title.trim()) formData.append('title', title.trim())
        if (tags.trim()) formData.append('tags', tags.trim())

        const res = await fetch('/api/style-references', {
          method: 'POST',
          headers: { 'X-Admin-Key': adminKey! },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setError(data.error || 'Upload failed')
          return
        }
        if (data.reference) {
          setReferences(prev => [data.reference, ...prev])
        }
      } else if (files && files.length > 0) {
        // File upload — process sequentially
        const fileArray = Array.from(files)
        const results: StyleReference[] = []

        for (let i = 0; i < fileArray.length; i++) {
          setUploadProgress(`Analyzing ${i + 1} of ${fileArray.length}: ${fileArray[i].name}`)
          try {
            const ref = await uploadSingle(fileArray[i])
            results.push(ref)
          } catch (err) {
            setError(`Failed on ${fileArray[i].name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }

        if (results.length > 0) {
          setReferences(prev => [...results, ...prev])
        }
      } else {
        setError('Provide image files or a URL.')
        setUploading(false)
        return
      }

      setTitle('')
      setTags('')
      setUrlInput('')
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch('/api/style-references', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey! },
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

  async function handleUpdateTitle(id: string, newTitle: string) {
    try {
      const res = await fetch('/api/style-references', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey! },
        body: JSON.stringify({ id, title: newTitle }),
      })
      const data = await res.json()
      if (data.reference) {
        setReferences(prev => prev.map(r => r.id === id ? data.reference : r))
      }
    } catch {
      setError('Failed to update title.')
    } finally {
      setEditingTitleId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/style-references', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey! },
        body: JSON.stringify({ id }),
      })
      setReferences(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Failed to delete reference.')
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCopyDirective(directive: string, id: string) {
    navigator.clipboard.writeText(directive)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleUpload(files)
  }

  const allTags = [...new Set(references.flatMap(r => r.tags))]
  const filtered = filterTag === 'all' ? references : references.filter(r => r.tags.includes(filterTag))
  const activeCount = references.filter(r => r.active).length

  if (!adminKey) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
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
        <div className="flex items-center gap-2 mb-1">
          <Star size={18} className="text-[var(--color-gold)]" />
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Creative Library</h2>
        </div>
        <p className="text-sm text-[var(--color-mid-gray)] max-w-2xl">
          Upload ads, campaigns, web pages, or any visual reference you admire. Claude extracts the style principles — composition, lighting, color, mood — and injects them into every image and video generated across all facilities. The pixels are never reused. Only the intelligence.
        </p>
        {activeCount > 0 && (
          <p className="text-xs text-[var(--color-gold)] mt-2">
            {activeCount} active reference{activeCount !== 1 ? 's' : ''} informing all creative generation.
          </p>
        )}
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
          dragOver
            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5'
            : 'border-[var(--border-medium)] hover:border-[var(--border-medium)]'
        }`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Title (optional — applies to all files in batch)</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Porsche 911 Print 1986, Anthropic Claude launch"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Tags (optional, comma-separated)</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g., typography, warm-light, editorial, porsche"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>
          </div>

          {/* URL input */}
          <div>
            <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Or paste a URL (web page, image, or PDF link)</label>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="e.g., https://example.com/great-ad-campaign"
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,video/*"
              multiple
              onChange={e => {
                const files = e.target.files
                if (files && files.length > 0) handleUpload(files)
                e.target.value = ''
              }}
              className="hidden"
            />
            <button
              onClick={() => {
                if (urlInput.trim()) {
                  handleUpload()
                } else {
                  fileInputRef.current?.click()
                }
              }}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
            >
              {uploading ? (
                <><Loader2 size={14} className="animate-spin" /> {uploadProgress || 'Analyzing...'}</>
              ) : (
                <><Upload size={14} /> {urlInput.trim() ? 'Analyze URL' : 'Upload & Analyze'}</>
              )}
            </button>
            {!uploading && (
              <p className="text-[11px] text-[var(--color-mid-gray)]">
                Images, videos, PDFs, or web pages. Select multiple files or drop them here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <Tag size={12} className="text-[var(--color-mid-gray)] mr-1" />
          <button
            onClick={() => setFilterTag('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterTag === 'all' ? 'bg-[var(--color-gold)] text-[var(--color-light)]' : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]'
            }`}
          >
            All ({references.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterTag === tag ? 'bg-[var(--color-gold)] text-[var(--color-light)]' : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-[var(--border-subtle)]">
          <Sparkles size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
          <p className="font-medium text-[var(--color-dark)]">Your creative library is empty</p>
          <p className="text-sm text-[var(--color-mid-gray)] mt-1 max-w-md mx-auto">
            Upload ads, campaigns, web pages, or any visual reference you admire. Claude will extract what makes them great and use those principles across all creative generation.
          </p>
        </div>
      )}

      {/* Reference grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(ref => {
            const expanded = expandedIds.has(ref.id)
            return (
              <div
                key={ref.id}
                className={`border rounded-xl overflow-hidden bg-[var(--bg-elevated)] transition-all ${
                  ref.active ? 'border-[var(--border-subtle)]' : 'border-[var(--border-subtle)] opacity-60'
                }`}
              >
                {/* Media — click to view full */}
                {(() => {
                  const isVid = ref.image_url.match(/\.(mp4|mov|webm|avi)/i) || ref.image_url.match(/video/i) || ref.tags.includes('video') || !!(ref.analysis as Record<string, unknown>).pacing
                  return (
                    <div
                      className="relative cursor-pointer group"
                      onClick={() => setLightboxUrl(ref.image_url)}
                    >
                      {isVid ? (
                        <video
                          src={ref.image_url}
                          className="w-full h-44 object-cover bg-[var(--color-light)]"
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                        />
                      ) : (
                        <img
                          src={ref.image_url}
                          alt={ref.title || 'Style reference'}
                          className="w-full h-44 object-cover bg-[var(--color-light)]"
                          onError={e => {
                            const el = e.target as HTMLImageElement
                            el.style.display = 'none'
                            el.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'h-44')
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {isVid && (
                        <span className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white font-medium">
                          Video
                        </span>
                      )}
                      {!ref.active && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-xs text-white/60 font-medium">Inactive</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Info */}
                <div className="p-4 space-y-3">
                  {/* Title — editable */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingTitleId === ref.id ? (
                        <div className="flex gap-1.5">
                          <input
                            value={editingTitleValue}
                            onChange={e => setEditingTitleValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateTitle(ref.id, editingTitleValue)
                              if (e.key === 'Escape') setEditingTitleId(null)
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-[var(--border-medium)] rounded text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]"
                          />
                          <button
                            onClick={() => handleUpdateTitle(ref.id, editingTitleValue)}
                            className="px-2 py-1 bg-[var(--color-gold)] text-[var(--color-light)] text-[10px] font-medium rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTitleId(null)}
                            className="px-2 py-1 text-[10px] text-[var(--color-mid-gray)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/title">
                          <p className="text-sm font-semibold text-[var(--color-dark)] truncate">
                            {ref.title || 'Untitled Reference'}
                          </p>
                          <button
                            onClick={() => {
                              setEditingTitleId(ref.id)
                              setEditingTitleValue(ref.title || '')
                            }}
                            className="opacity-0 group-hover/title:opacity-100 p-0.5 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-all"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(ref.id, !ref.active)}
                        className="p-1.5 rounded-lg text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                        title={ref.active ? 'Disable' : 'Enable'}
                      >
                        {ref.active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(ref.id)}
                        className="p-1.5 rounded-lg text-[var(--color-mid-gray)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {ref.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ref.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Style directive */}
                  {ref.analysis.style_directive && (
                    <div className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--color-gold)] font-medium mb-1">Style Directive</p>
                      <p className="text-xs text-[var(--color-dark)] leading-relaxed">
                        {ref.analysis.style_directive}
                      </p>
                      <button
                        onClick={() => handleCopyDirective(ref.analysis.style_directive!, ref.id)}
                        className="flex items-center gap-1 mt-2 text-[10px] text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                      >
                        {copiedId === ref.id ? (
                          <><Check size={10} className="text-emerald-400" /> Copied</>
                        ) : (
                          <><Copy size={10} /> Copy directive</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expand/collapse full analysis — independent per card */}
                  <button
                    onClick={() => toggleExpanded(ref.id)}
                    className="flex items-center gap-1 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                  >
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded ? 'Hide' : 'View'} full analysis
                  </button>

                  {expanded && (
                    <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                      {ref.analysis.composition && (
                        <AnalysisField label="Composition" value={ref.analysis.composition} />
                      )}
                      {ref.analysis.color_palette && (
                        <AnalysisField label="Color Palette" value={ref.analysis.color_palette} />
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
                      {ref.analysis.pacing && (
                        <AnalysisField label="Pacing" value={ref.analysis.pacing} />
                      )}
                      {ref.analysis.camera_movement && (
                        <AnalysisField label="Camera Movement" value={ref.analysis.camera_movement} />
                      )}
                      {ref.analysis.motion_language && (
                        <AnalysisField label="Motion Language" value={ref.analysis.motion_language} />
                      )}
                      {ref.analysis.transitions && (
                        <AnalysisField label="Transitions" value={ref.analysis.transitions} />
                      )}
                      {ref.analysis.effectiveness && (
                        <AnalysisField label="Why It Works" value={ref.analysis.effectiveness} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 rounded-lg bg-[var(--color-dark)]/10 text-white hover:bg-[var(--color-dark)]/20 transition-colors z-10"
          >
            <X size={20} />
          </button>
          {lightboxUrl.match(/\.(mp4|mov|webm|avi)/i) || lightboxUrl.match(/video/i) ? (
            <video
              src={lightboxUrl}
              className="max-w-full max-h-full rounded-lg"
              controls
              autoPlay
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightboxUrl}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AnalysisField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">{label}</p>
      <p className="text-xs text-[var(--color-body-text)] leading-relaxed mt-0.5">{value}</p>
    </div>
  )
}
