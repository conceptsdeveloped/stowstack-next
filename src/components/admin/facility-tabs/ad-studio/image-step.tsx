'use client'

import { useState } from 'react'
import {
  Loader2, Sparkles, AlertTriangle, Edit3,
  ImageIcon, Eye, ChevronRight,
} from 'lucide-react'
import type { ImageTemplate, GenerationJob, AdVariation, Asset, StudioStep } from './types'
import { TEMPLATE_ICONS, ASPECT_LABELS } from './types'

export function ImageStep({
  facilityId,
  adminKey,
  selectedVariation,
  selectedCopy,
  templates,
  assets,
  selectedImage,
  onSelectImage,
  onSetStep,
  jobs,
  onJobsChange,
}: {
  facilityId: string
  adminKey: string
  selectedVariation: AdVariation | null
  selectedCopy: Record<string, string>
  templates: ImageTemplate[]
  assets: Asset[]
  selectedImage: string | null
  onSelectImage: (url: string) => void
  onSetStep: (s: StudioStep) => void
  jobs: GenerationJob[]
  onJobsChange: (updater: (prev: GenerationJob[]) => GenerationJob[]) => void
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templates[0]?.id || null)
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')

  const activeTemplateObj = templates.find(t => t.id === selectedTemplate)

  // Build copy context for image generation
  function buildCopyContext(): string | undefined {
    if (!selectedVariation) return undefined
    const c = selectedVariation.content_json as Record<string, string>
    const parts = [
      c.headline && `Headline: ${c.headline}`,
      c.primaryText && `Primary text: ${c.primaryText}`,
      c.description && `Description: ${c.description}`,
      c.cta && `CTA: ${c.cta}`,
      c.angleLabel && `Angle: ${c.angleLabel}`,
    ].filter(Boolean)
    return parts.length ? parts.join('\n') : undefined
  }

  // Generate image
  async function generateImage(overridePrompt?: string) {
    if (!selectedTemplate || generating) return
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    setGenerating(true)
    const jobId = `img-${Date.now()}`
    onJobsChange(prev => [{
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
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId: selectedTemplate,
          facilityId,
          customNotes: customNotes.trim() || undefined,
          promptOverride: overridePrompt || promptOverride.trim() || undefined,
          copyContext: buildCopyContext(),
        }),
      })
      const data = await res.json()

      if (data.imageUrl) {
        onJobsChange(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'succeeded', imageUrl: data.imageUrl, prompt: data.prompt || j.prompt }
          : j
        ))
        // Auto-select this image for preview
        onSelectImage(data.imageUrl)
      } else {
        onJobsChange(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'failed', error: data.error || 'Generation failed' }
          : j
        ))
      }
    } catch (err) {
      onJobsChange(prev => prev.map(j => j.id === jobId
        ? { ...j, status: 'failed', error: err instanceof Error ? err.message : 'Network error' }
        : j
      ))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Selected copy preview */}
      {selectedVariation && (
        <div className="p-3 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
          <p className="text-[10px] text-[var(--color-gold)] font-medium mb-1">Paired with:</p>
          <p className="text-xs font-semibold text-[var(--color-dark)]">{selectedCopy.headline}</p>
          <p className="text-[11px] text-[var(--color-mid-gray)] line-clamp-1 mt-0.5">{selectedCopy.primaryText}</p>
        </div>
      )}

      {/* Existing images */}
      {assets.length > 0 && (
        <div>
          <label className="text-xs font-medium text-[var(--color-body-text)] block mb-2">Use Existing Image</label>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto">
            {assets.map(img => (
              <button
                key={img.id}
                onClick={() => { onSelectImage(img.url); onSetStep('preview') }}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  selectedImage === img.url
                    ? 'ring-2 ring-[var(--color-gold)]'
                    : 'ring-1 ring-[var(--border-subtle)] hover:ring-[var(--border-medium)]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-16 w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated images from this session */}
      {jobs.filter(j => j.status === 'succeeded').length > 0 && (
        <div>
          <label className="text-xs font-medium text-[var(--color-body-text)] block mb-2">Generated This Session</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {jobs.filter(j => j.status === 'succeeded' && j.imageUrl).map(job => (
              <button
                key={job.id}
                onClick={() => { onSelectImage(job.imageUrl!); onSetStep('preview') }}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  selectedImage === job.imageUrl
                    ? 'ring-2 ring-[var(--color-gold)]'
                    : 'ring-1 ring-[var(--border-subtle)] hover:ring-[var(--border-medium)]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.imageUrl!} alt="" className="h-20 w-full object-cover" />
                <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.5 rounded bg-black/60 text-white">{ASPECT_LABELS[job.aspect]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate new */}
      <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-elevated)] space-y-4">
            <label className="text-xs font-medium text-[var(--color-body-text)] block">Generate New Image</label>

            {/* Template grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setShowPromptEditor(false); setPromptOverride('') }}
                  className={`text-left p-2.5 border rounded-lg transition-all ${
                    selectedTemplate === t.id
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                      : 'border-[var(--border-subtle)] bg-[var(--color-light-gray)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[var(--color-body-text)]">{TEMPLATE_ICONS[t.id] || <ImageIcon size={14} />}</span>
                    <span className="text-[11px] font-semibold text-[var(--color-dark)] truncate">{t.name}</span>
                  </div>
                  <p className="text-[9px] text-[var(--color-mid-gray)] line-clamp-1">{t.description}</p>
                  <span className="inline-block mt-1 text-[8px] px-1 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">{ASPECT_LABELS[t.aspect] || t.aspect}</span>
                </button>
              ))}
            </div>

            {/* Notes + prompt override */}
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Custom Notes (optional)</label>
              <input
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g., Include a sunset, show climate-controlled units, spring theme..."
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>

            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
              >
                <Edit3 size={11} /> {showPromptEditor ? 'Hide' : 'Edit'} prompt directly
              </button>
              {showPromptEditor && (
                <textarea
                  value={promptOverride}
                  onChange={e => setPromptOverride(e.target.value)}
                  rows={3}
                  placeholder="Write your own image prompt..."
                  className="mt-2 w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                />
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={() => generateImage()}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> Generate {activeTemplateObj?.name || 'Image'}</>
              )}
            </button>
            <p className="text-[10px] text-[var(--color-mid-gray)]">Takes 10-30 seconds. Image auto-saves to facility assets.</p>
          </div>

      {/* Active generation jobs */}
      {jobs.filter(j => j.status === 'generating').length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {jobs.filter(j => j.status === 'generating').map(job => (
            <div key={job.id} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
              <div className="aspect-square flex items-center justify-center bg-[var(--color-light-gray)]">
                <div className="text-center">
                  <Loader2 size={24} className="animate-spin text-[var(--color-gold)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--color-mid-gray)]">Generating {job.templateName}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed jobs */}
      {jobs.filter(j => j.status === 'failed').map(job => (
        <div key={job.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-300">{job.error}</p>
              <button
                onClick={() => { setEditingPrompt(job.id); setEditedPrompt(job.prompt) }}
                className="flex items-center gap-1 text-[11px] text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] mt-1 transition-colors"
              >
                <Edit3 size={10} /> Edit prompt and retry
              </button>
            </div>
          </div>
          {editingPrompt === job.id && (
            <div className="mt-2 space-y-2">
              <textarea
                value={editedPrompt}
                onChange={e => setEditedPrompt(e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 border border-[var(--border-subtle)] rounded text-[11px] font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
              />
              <div className="flex gap-1.5">
                <button onClick={() => { generateImage(editedPrompt); setEditingPrompt(null) }} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors">
                  <Sparkles size={12} /> Retry
                </button>
                <button onClick={() => setEditingPrompt(null)} className="px-3 py-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Skip / go to preview */}
      {selectedImage && (
        <button
          onClick={() => onSetStep('preview')}
          className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border-subtle)] text-[var(--color-body-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-light-gray)] transition-colors"
        >
          <Eye size={14} /> Preview with Selected Image <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
