'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Download, Sparkles, AlertTriangle, Edit3, RefreshCw,
  ImageIcon, Package, Star, Sunrise, Type, Pencil
} from 'lucide-react'

/* ── Types ── */

interface ImageTemplate {
  id: string
  name: string
  description: string
  aspect: string
}

interface GenerationJob {
  id: string
  templateId: string
  templateName: string
  status: 'generating' | 'succeeded' | 'failed'
  imageUrl: string | null
  prompt: string
  error: string | null
  aspect: string
}

interface AdVariation {
  id: string
  platform: string
  angle: string
  status: string
  content_json: Record<string, unknown>
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  ad_hero: <ImageIcon size={16} />,
  ad_hero_wide: <Sunrise size={16} />,
  lifestyle_moving: <Package size={16} />,
  lifestyle_organized: <Sparkles size={16} />,
  lifestyle_packing: <Package size={16} />,
  social_promo: <Type size={16} />,
  social_seasonal: <Star size={16} />,
  before_after: <RefreshCw size={16} />,
  text_ad: <Pencil size={16} />,
  story_bg: <ImageIcon size={16} />,
}

const ASPECT_LABELS: Record<string, string> = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '4:5': 'Portrait',
  '9:16': 'Story',
}

/* ── Main Component ── */

export default function ImageGenerator({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [adVariations, setAdVariations] = useState<AdVariation[]>([])
  const [selectedVariation, setSelectedVariation] = useState<string>('')

  useEffect(() => {
    fetch('/api/generate-image', { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates)
          setSelectedTemplate(data.templates[0]?.id || null)
        }
        setConfigured(data.configured || false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Fetch ad variations for copy pairing
    fetch(`/api/facility-creatives?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.variations) setAdVariations(data.variations)
      })
      .catch(() => {})
  }, [adminKey, facilityId])

  async function generate(overridePrompt?: string) {
    if (!selectedTemplate || generating) return
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    setGenerating(true)
    const jobId = `img-${Date.now()}`
    setJobs(prev => [{
      id: jobId,
      templateId: selectedTemplate,
      templateName: template.name,
      status: 'generating',
      imageUrl: null,
      prompt: overridePrompt || promptOverride || '',
      error: null,
      aspect: template.aspect,
    }, ...prev])

    try {
      // Build copy context from selected variation
      let copyContext: string | undefined
      if (selectedVariation) {
        const variation = adVariations.find(v => v.id === selectedVariation)
        if (variation?.content_json) {
          const c = variation.content_json as Record<string, string>
          const parts = [
            c.headline && `Headline: ${c.headline}`,
            c.primaryText && `Primary text: ${c.primaryText}`,
            c.description && `Description: ${c.description}`,
            c.cta && `CTA: ${c.cta}`,
            c.angleLabel && `Angle: ${c.angleLabel}`,
          ].filter(Boolean)
          if (parts.length) copyContext = parts.join('\n')
        }
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId: selectedTemplate,
          facilityId,
          customNotes: customNotes.trim() || undefined,
          promptOverride: overridePrompt || promptOverride.trim() || undefined,
          copyContext,
        }),
      })
      const data = await res.json()

      if (data.imageUrl) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'succeeded', imageUrl: data.imageUrl, prompt: data.prompt || j.prompt } : j))
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', error: data.error || 'Generation failed' } : j))
      }
    } catch (err) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', error: err instanceof Error ? err.message : 'Network error' } : j))
    } finally {
      setGenerating(false)
    }
  }

  const activeTemplate = templates.find(t => t.id === selectedTemplate)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-dark)]">AI Image Generator</h4>
        <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">Generate ad creatives, lifestyle imagery, and social graphics</p>
      </div>

      {/* API key warning */}
      {!configured && (
        <div className="p-4 rounded-xl border border-dashed border-[var(--border-medium)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-dark)]">FAL.ai API Key Required</p>
              <p className="text-xs text-[var(--color-mid-gray)] mt-1">
                Add <code className="px-1 py-0.5 rounded bg-[var(--color-light-gray)] text-xs text-[var(--color-body-text)]">FAL_KEY</code> to your environment variables.
                Get one at <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-[var(--color-gold)] hover:underline">fal.ai</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template grid */}
      <div>
        <label className="text-xs font-medium text-[var(--color-body-text)] block mb-2">Choose Image Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t.id); setShowPromptEditor(false); setPromptOverride('') }}
              className={`text-left p-3 border rounded-xl transition-all ${
                selectedTemplate === t.id
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[var(--color-body-text)]">{TEMPLATE_ICONS[t.id] || <ImageIcon size={16} />}</span>
                <span className="text-xs font-semibold text-[var(--color-dark)] truncate">{t.name}</span>
              </div>
              <p className="text-[10px] text-[var(--color-mid-gray)] line-clamp-2">{t.description}</p>
              <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                {ASPECT_LABELS[t.aspect] || t.aspect}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      {activeTemplate && (
        <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-elevated)]">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Custom Notes (optional)</label>
              <input
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g., Include a sunset, show climate-controlled units, spring theme..."
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>

            {/* Pair with ad copy */}
            {adVariations.length > 0 && (
              <div>
                <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Pair with Ad Copy (optional)</label>
                <select
                  value={selectedVariation}
                  onChange={e => setSelectedVariation(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] appearance-none"
                >
                  <option value="">None — generate without copy context</option>
                  {adVariations
                    .filter(v => v.platform === 'meta_feed')
                    .map(v => {
                      const c = v.content_json as Record<string, string>
                      const label = c.headline || c.angleLabel || v.angle
                      const status = v.status === 'approved' ? ' ✓' : ''
                      return (
                        <option key={v.id} value={v.id}>
                          [{v.angle}] {label}{status}
                        </option>
                      )
                    })}
                </select>
                {selectedVariation && (() => {
                  const v = adVariations.find(a => a.id === selectedVariation)
                  if (!v) return null
                  const c = v.content_json as Record<string, string>
                  return (
                    <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)] space-y-1">
                      {c.headline && <p className="text-xs font-semibold text-[var(--color-dark)]">{c.headline}</p>}
                      {c.primaryText && <p className="text-[11px] text-[var(--color-body-text)] line-clamp-2">{c.primaryText}</p>}
                      {c.cta && <p className="text-[10px] text-[var(--color-gold)]">{c.cta}</p>}
                    </div>
                  )
                })()}
                <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">The image will be generated to complement this ad copy.</p>
              </div>
            )}

            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
              >
                <Edit3 size={11} /> {showPromptEditor ? 'Hide' : 'Edit'} prompt directly
              </button>
              {showPromptEditor && (
                <div className="mt-2">
                  <textarea
                    value={promptOverride}
                    onChange={e => setPromptOverride(e.target.value)}
                    rows={3}
                    placeholder="Write your own image prompt... Leave blank to use the AI-enhanced template prompt."
                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => generate()}
              disabled={generating || !configured}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> Generate {activeTemplate.name}</>
              )}
            </button>
            <p className="text-[10px] text-[var(--color-mid-gray)]">Takes 10-30 seconds. Image auto-saves to facility assets.</p>
          </div>
        </div>
      )}

      {/* Generated images */}
      {jobs.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-[var(--color-dark)] mb-3">Generated Images</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
                {/* Image area */}
                {job.status === 'generating' && (
                  <div className="aspect-square flex items-center justify-center bg-[var(--color-light-gray)]">
                    <div className="text-center">
                      <Loader2 size={24} className="animate-spin text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-mid-gray)]">Generating...</p>
                    </div>
                  </div>
                )}

                {job.status === 'succeeded' && job.imageUrl && (
                  <div className="relative">
                    <img src={job.imageUrl} alt={job.templateName} className="w-full aspect-square object-cover" />
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white">
                      {ASPECT_LABELS[job.aspect] || job.aspect}
                    </span>
                  </div>
                )}

                {job.status === 'failed' && (
                  <div className="aspect-square flex items-center justify-center bg-red-500/5">
                    <div className="text-center px-4">
                      <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
                      <p className="text-xs text-red-300">{job.error}</p>
                    </div>
                  </div>
                )}

                {/* Info + actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-body-text)]">{TEMPLATE_ICONS[job.templateId] || <ImageIcon size={14} />}</span>
                    <span className="text-xs font-medium text-[var(--color-dark)] flex-1 truncate">{job.templateName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      job.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{job.status}</span>
                  </div>

                  {job.status === 'succeeded' && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = job.imageUrl!
                          a.download = `${job.templateId}-${Date.now()}.webp`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => { setEditingPrompt(job.id); setEditedPrompt(job.prompt) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                      >
                        <RefreshCw size={12} /><span>Regenerate</span>
                      </button>
                    </div>
                  )}

                  {job.status === 'failed' && (
                    <button
                      onClick={() => { setEditingPrompt(job.id); setEditedPrompt(job.prompt) }}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                    >
                      <Edit3 size={11} /> Edit prompt and retry
                    </button>
                  )}

                  {/* Edit prompt for regeneration */}
                  {editingPrompt === job.id && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editedPrompt}
                        onChange={e => setEditedPrompt(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1.5 border border-[var(--border-subtle)] rounded text-[11px] font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { generate(editedPrompt); setEditingPrompt(null) }}
                          disabled={generating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
                        >
                          <Sparkles size={12} /> Regenerate
                        </button>
                        <button
                          onClick={() => setEditingPrompt(null)}
                          className="px-3 py-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Prompt preview */}
                  {editingPrompt !== job.id && job.prompt && (
                    <details className="text-[10px] text-[var(--color-mid-gray)]">
                      <summary className="cursor-pointer hover:text-[var(--color-body-text)] transition-colors">View prompt</summary>
                      <p className="mt-1 p-2 rounded text-xs whitespace-pre-wrap bg-[var(--color-light-gray)] text-[var(--color-body-text)]">{job.prompt}</p>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && activeTemplate && (
        <div className="text-center py-6">
          <p className="text-xs text-[var(--color-mid-gray)]">Your generated images will appear here</p>
        </div>
      )}
    </div>
  )
}
