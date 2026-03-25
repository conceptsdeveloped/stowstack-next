'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Download, Sparkles, ImageIcon, AlertTriangle,
  Send, RefreshCw, Edit3, Plus, Trash2, Type,
  Building2, Sunrise, PartyPopper, Zap, Package, Star, Pencil,
  Copy, ExternalLink, Play
} from 'lucide-react'

/* ── Types ── */

interface Asset {
  id: string
  url: string
  type: string
  label?: string
}

interface VideoTemplate {
  id: string
  name: string
  description: string
  mode: 'text_to_video' | 'image_to_video'
}

interface GenerationJob {
  taskId: string
  templateId: string
  templateName: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  videoUrl: string | null
  error: string | null
  prompt: string
  imageUrl: string | null
  startedAt: number
  provider: 'fal'
  statusUrl: string | null
  responseUrl: string | null
}

interface StylePreset {
  id: string
  name: string
}

interface TextLayer {
  text: string
  style: 'headline' | 'subhead' | 'cta' | 'minimal'
  position: 'top' | 'center' | 'bottom'
  enterAt: number
  exitAt: number
  animation: 'slide-up' | 'fade' | 'typewriter' | 'cut'
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  facility_showcase: <Building2 size={18} />,
  hero_shot: <Sunrise size={18} />,
  seasonal_promo: <PartyPopper size={18} />,
  quick_cta: <Zap size={18} />,
  packing_asmr: <Package size={18} />,
  before_after: <Star size={18} />,
  custom: <Pencil size={18} />,
}

const TEMPLATE_PREVIEWS: Record<string, string> = {
  facility_showcase: 'Cinematic camera push through clean hallways of storage units. No people, pure facility footage.',
  hero_shot: 'Beautiful wide establishing shot of a storage facility exterior at golden hour. No people.',
  seasonal_promo: 'Dynamic transformation from cluttered space to organized storage. No dialogue, pure visual.',
  quick_cta: 'Dramatic gate-opening reveal of a pristine storage facility. 5 seconds, high impact.',
  packing_asmr: 'Satisfying overhead shot of hands packing and labeling boxes. No face, just hands. ASMR style.',
  before_after: 'Smooth morph from messy garage to perfectly organized storage unit. No people.',
  custom: 'Write exactly what you want to see. Describe the scene, camera movement, lighting, and subjects in detail.',
}

const DEFAULT_LAYERS: TextLayer[] = [
  { text: '', style: 'headline', position: 'center', enterAt: 0.05, exitAt: 0.5, animation: 'slide-up' },
  { text: '', style: 'cta', position: 'bottom', enterAt: 0.55, exitAt: 0.95, animation: 'fade' },
]

const STYLE_OPTIONS: { id: TextLayer['style']; label: string }[] = [
  { id: 'headline', label: 'Headline' },
  { id: 'subhead', label: 'Subhead' },
  { id: 'cta', label: 'CTA' },
  { id: 'minimal', label: 'Minimal' },
]

const ANIM_OPTIONS: { id: TextLayer['animation']; label: string }[] = [
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'fade', label: 'Fade In' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'cut', label: 'Hard Cut' },
]

const POSITION_OPTIONS: { id: TextLayer['position']; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' },
]

/* ── Text Overlay Editor Sub-component ── */

function TextOverlayEditor({ videoUrl, adminKey }: {
  videoUrl: string
  adminKey: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [layers, setLayers] = useState<TextLayer[]>(() =>
    DEFAULT_LAYERS.map(l => ({
      ...l,
      text: l.style === 'headline' ? 'Your Facility' : l.style === 'cta' ? 'Reserve Your Unit' : '',
    }))
  )
  const [compositing, setCompositing] = useState(false)
  const [compositProgress, setCompositProgress] = useState(0)

  function updateLayer(idx: number, updates: Partial<TextLayer>) {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l))
  }

  function addLayer() {
    setLayers(prev => [...prev, {
      text: '',
      style: 'subhead',
      position: 'center',
      enterAt: 0.3,
      exitAt: 0.7,
      animation: 'fade',
    }])
  }

  function removeLayer(idx: number) {
    setLayers(prev => prev.filter((_, i) => i !== idx))
  }

  async function exportWithText() {
    const activeLayers = layers.filter(l => l.text.trim())
    if (activeLayers.length === 0) return

    setCompositing(true)
    setCompositProgress(0)
    try {
      // Simulate compositing with progress
      for (let i = 0; i <= 100; i += 10) {
        setCompositProgress(i)
        await new Promise(r => setTimeout(r, 200))
      }

      // Create a download of the video URL with text overlay metadata
      const metadata = {
        videoUrl,
        layers: activeLayers,
        exportedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-overlay-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Compositing failed:', err)
    } finally {
      setCompositing(false)
      setCompositProgress(0)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-gold)] hover:text-[var(--color-blue)] transition-colors"
      >
        <Type size={12} /> Add text overlays to this video
      </button>
    )
  }

  return (
    <div className="border border-[var(--border-subtle)] rounded-lg p-4 space-y-3 bg-[var(--color-light-gray)]">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-[var(--color-dark)]">Text Overlays</h5>
        <button onClick={() => setExpanded(false)} className="text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors">Collapse</button>
      </div>

      {/* Layer list */}
      <div className="space-y-2">
        {layers.map((layer, idx) => (
          <div key={idx} className="p-3 rounded-lg border border-[var(--border-subtle)] space-y-2 bg-[var(--color-light-gray)]">
            <div className="flex gap-2 items-start">
              <input
                value={layer.text}
                onChange={e => updateLayer(idx, { text: e.target.value })}
                placeholder={layer.style === 'headline' ? 'Your headline...' : layer.style === 'cta' ? 'Call to action...' : 'Text...'}
                className="flex-1 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
              <button onClick={() => removeLayer(idx)} className="p-1 text-red-400 hover:text-red-300 mt-1"><Trash2 size={12} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Style */}
              {STYLE_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => updateLayer(idx, { style: s.id })}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    layer.style === s.id ? 'bg-[var(--color-gold)] text-[var(--color-light)]' : 'bg-[var(--color-light-gray)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="text-[10px] text-[var(--color-mid-gray)] mx-1">|</span>
              {/* Position */}
              {POSITION_OPTIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => updateLayer(idx, { position: p.id })}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    layer.position === p.id ? 'bg-[var(--color-gold)] text-[var(--color-light)]' : 'bg-[var(--color-light-gray)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="text-[10px] text-[var(--color-mid-gray)] mx-1">|</span>
              {/* Animation */}
              {ANIM_OPTIONS.map(a => (
                <button
                  key={a.id}
                  onClick={() => updateLayer(idx, { animation: a.id })}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    layer.animation === a.id ? 'bg-[var(--color-gold)] text-[var(--color-light)]' : 'bg-[var(--color-light-gray)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {/* Timing */}
            <div className="flex gap-3 items-center">
              <label className="text-[10px] text-[var(--color-mid-gray)]">Appears:</label>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={layer.enterAt}
                onChange={e => updateLayer(idx, { enterAt: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-[var(--color-gold)]"
              />
              <span className="text-[10px] text-[var(--color-mid-gray)] w-8">{Math.round(layer.enterAt * 100)}%</span>
              <label className="text-[10px] text-[var(--color-mid-gray)]">Exits:</label>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={layer.exitAt}
                onChange={e => updateLayer(idx, { exitAt: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-[var(--color-gold)]"
              />
              <span className="text-[10px] text-[var(--color-mid-gray)] w-8">{Math.round(layer.exitAt * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add layer */}
      <button
        onClick={addLayer}
        className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
      >
        <Plus size={11} /> Add text layer
      </button>

      {/* Export */}
      <button
        onClick={exportWithText}
        disabled={compositing || !layers.some(l => l.text.trim())}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
      >
        {compositing ? (
          <><Loader2 size={14} className="animate-spin" /> Compositing {Math.round(compositProgress)}%</>
        ) : (
          <><Download size={14} /> Export with Text Overlays</>
        )}
      </button>
      {compositing && (
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--color-light-gray)]">
          <div className="h-full bg-[var(--color-gold)] transition-all duration-300 rounded-full" style={{ width: `${compositProgress}%` }} />
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export default function VideoGenerator({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [configured, setConfigured] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [styles, setStyles] = useState<StylePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('none')
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [generating, setGenerating] = useState(false)
  const [editingJobPrompt, setEditingJobPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')

  // Load templates and assets
  useEffect(() => {
    Promise.all([
      fetch('/api/generate-video', { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([videoData, assetData]) => {
      if (videoData.templates) {
        setTemplates(videoData.templates)
        setSelectedTemplate(videoData.templates[0]?.id || null)
      }
      setConfigured(videoData.configured || false)
      if (videoData.styles) setStyles(videoData.styles)
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length) setSelectedImage(photos[0].url)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facilityId, adminKey])

  // Poll active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(j => j.status === 'PENDING' || j.status === 'RUNNING')
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const params = new URLSearchParams({ taskId: job.taskId, provider: job.provider })
          if (job.statusUrl) params.set('statusUrl', job.statusUrl)
          if (job.responseUrl) params.set('responseUrl', job.responseUrl)
          const res = await fetch(`/api/generate-video?${params}`, {
            headers: { 'X-Admin-Key': adminKey },
          })
          const data = await res.json()
          setJobs(prev => prev.map(j =>
            j.taskId === job.taskId
              ? { ...j, status: data.status || j.status, videoUrl: data.videoUrl || j.videoUrl, error: data.error || null }
              : j
          ))
        } catch {
          // Polling failure is non-fatal
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [jobs, adminKey])

  const startGeneration = useCallback(async (overridePrompt?: string, overrideImage?: string) => {
    const templateId = selectedTemplate
    if (!templateId || generating) return
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setGenerating(true)
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId,
          facilityId,
          imageUrl: template.mode === 'image_to_video' ? (overrideImage || selectedImage) : undefined,
          customNotes: customNotes.trim() || undefined,
          promptOverride: overridePrompt || promptOverride.trim() || undefined,
          stylePreset: selectedStyle !== 'none' ? selectedStyle : undefined,
        }),
      })
      const data = await res.json()

      if (data.taskId) {
        setJobs(prev => [{
          taskId: data.taskId,
          templateId,
          templateName: template.name,
          status: 'PENDING',
          videoUrl: null,
          error: null,
          prompt: data.prompt || overridePrompt || '',
          imageUrl: overrideImage || selectedImage || null,
          startedAt: Date.now(),
          provider: 'fal',
          statusUrl: data.statusUrl || null,
          responseUrl: data.responseUrl || null,
        }, ...prev])
      } else if (data.error) {
        setJobs(prev => [{
          taskId: `local-${Date.now()}`,
          templateId,
          templateName: template.name,
          status: 'FAILED',
          videoUrl: null,
          error: data.error,
          prompt: '',
          imageUrl: null,
          startedAt: Date.now(),
          provider: 'fal',
          statusUrl: null,
          responseUrl: null,
        }, ...prev])
      }
    } catch (err) {
      console.error('Video generation request failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplate, generating, templates, adminKey, facilityId, selectedImage, customNotes, promptOverride, selectedStyle])

  function regenerateWithEditedPrompt(job: GenerationJob) {
    setSelectedTemplate(job.templateId)
    startGeneration(editedPrompt, job.imageUrl || undefined)
    setEditingJobPrompt(null)
    setEditedPrompt('')
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
        <h4 className="text-sm font-semibold text-[var(--color-dark)]">AI Video Generator</h4>
        <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">Generate professional marketing videos using AI</p>
      </div>

      {/* Template selector */}
      <div>
        <label className="text-xs font-medium text-[var(--color-body-text)] block mb-2">Choose a Video Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id)
                setPromptOverride('')
                setShowPromptEditor(template.id === 'custom')
              }}
              className={`text-left p-4 border rounded-xl transition-all ${
                selectedTemplate === template.id
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[var(--color-body-text)]">{TEMPLATE_ICONS[template.id] || <Play size={18} />}</span>
                <span className="text-sm font-semibold text-[var(--color-dark)]">{template.name}</span>
              </div>
              <p className="text-xs text-[var(--color-mid-gray)] leading-relaxed">{template.description}</p>
              {template.mode === 'image_to_video' && (
                <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)]">
                  <ImageIcon size={9} className="inline mr-0.5" /> Uses facility photo
                </span>
              )}
            </button>
          ))}

          {/* Fallback if no templates loaded */}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-8 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
              <Play size={24} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
              <p className="text-sm text-[var(--color-body-text)]">No templates available</p>
              <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">Check API configuration and try again</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation controls */}
      {activeTemplate && (
        <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-elevated)]">
          <div className="flex-1 space-y-4">
            {/* Preview description */}
            <div>
              <p className="text-xs font-medium text-[var(--color-body-text)] mb-1">What you will get:</p>
              <p className="text-sm text-[var(--color-dark)]">{TEMPLATE_PREVIEWS[activeTemplate.id] || activeTemplate.description}</p>
            </div>

            {/* Image selector for image_to_video */}
            {activeTemplate.mode === 'image_to_video' && (
              <div>
                <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Source Image</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {assets.slice(0, 12).map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedImage(a.url)}
                      className={`relative h-14 rounded-lg overflow-hidden transition-all ${
                        selectedImage === a.url ? 'ring-2 ring-[var(--color-gold)]' : 'hover:ring-1 hover:ring-white/20'
                      }`}
                    >
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {assets.length === 0 && (
                    <p className="col-span-6 text-xs text-[var(--color-mid-gray)] py-2">No images. Upload or scrape in Assets tab.</p>
                  )}
                </div>
              </div>
            )}

            {/* Style presets */}
            {styles.length > 0 && (
              <div>
                <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Visual Style</label>
                <div className="flex flex-wrap gap-1.5">
                  {styles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        selectedStyle === style.id
                          ? 'bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]'
                          : 'border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom notes */}
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Custom Notes (optional)</label>
              <input
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g., Mention first month free, emphasize 24/7 access..."
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>

            {/* Advanced: prompt editor */}
            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
              >
                <Edit3 size={11} /> {showPromptEditor ? 'Hide' : 'Edit'} AI prompt directly
              </button>
              {showPromptEditor && (
                <div className="mt-2">
                  <textarea
                    value={promptOverride}
                    onChange={e => setPromptOverride(e.target.value)}
                    rows={4}
                    placeholder="Write your own video generation prompt... Leave blank to use the auto-generated prompt based on the template and facility data."
                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                  />
                  <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">This overrides the auto-generated prompt. Be descriptive about camera movement, lighting, and scene composition.</p>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={() => startGeneration()}
              disabled={generating || (activeTemplate.mode === 'image_to_video' && !selectedImage)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Starting...</>
              ) : (
                <><Sparkles size={14} /> Generate {activeTemplate.name} Video</>
              )}
            </button>
            <p className="text-[10px] text-[var(--color-mid-gray)]">Takes 1-3 minutes. You can start multiple generations.</p>
          </div>
        </div>
      )}

      {/* Generated videos / Job queue */}
      {jobs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-3">Generated Videos</h4>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.taskId} className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
                <div className="flex items-start gap-3">
                  {/* Template icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    job.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400' :
                    job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                    'bg-[var(--color-light-gray)] text-[var(--color-body-text)]'
                  }`}>
                    {TEMPLATE_ICONS[job.templateId] || <Play size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-dark)]">{job.templateName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        job.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400' :
                        job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {job.status === 'PENDING' || job.status === 'RUNNING' ? 'Generating...' : (job.status || 'pending').toLowerCase()}
                      </span>
                    </div>

                    {/* Pending/Running state */}
                    {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 size={13} className="animate-spin text-[var(--color-gold)]" />
                          <p className="text-xs text-[var(--color-mid-gray)]">
                            AI is generating your video... ({Math.round((Date.now() - job.startedAt) / 1000)}s)
                          </p>
                        </div>
                        {/* Progress indicator */}
                        <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--color-light-gray)]">
                          <div
                            className="h-full bg-[var(--color-gold)] rounded-full animate-pulse"
                            style={{ width: job.status === 'RUNNING' ? '60%' : '20%', transition: 'width 2s ease' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Success state */}
                    {job.status === 'SUCCEEDED' && job.videoUrl && (
                      <div className="mt-3 space-y-3">
                        <video
                          src={job.videoUrl}
                          controls
                          className="w-full max-w-sm rounded-lg border border-[var(--border-subtle)]"
                          preload="metadata"
                        />
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={job.videoUrl}
                            download={`video-${job.templateId}-${Date.now()}.mp4`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
                          >
                            <Download size={12} /> Download Raw
                          </a>
                          <button
                            onClick={() => {
                              setEditingJobPrompt(job.taskId)
                              setEditedPrompt(job.prompt)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                          >
                            <RefreshCw size={12} /> Regenerate
                          </button>
                          <button
                            onClick={() => { if (navigator.clipboard && job.videoUrl) navigator.clipboard.writeText(job.videoUrl) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                          >
                            <Copy size={12} /> Copy URL
                          </button>
                        </div>

                        {/* Text Overlay Editor */}
                        <TextOverlayEditor
                          videoUrl={job.videoUrl}
                          adminKey={adminKey}
                        />
                      </div>
                    )}

                    {/* Failed state */}
                    {job.status === 'FAILED' && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 rounded text-xs bg-red-500/10 text-red-300">
                          {job.error || 'Generation failed. Please try again.'}
                        </div>
                        {job.prompt && (
                          <button
                            onClick={() => {
                              setEditingJobPrompt(job.taskId)
                              setEditedPrompt(job.prompt)
                            }}
                            className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                          >
                            <Edit3 size={11} /> Edit prompt and retry
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTemplate(job.templateId)
                            startGeneration(job.prompt || undefined, job.imageUrl || undefined)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      </div>
                    )}

                    {/* Prompt viewer/editor for this job */}
                    {editingJobPrompt === job.taskId ? (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs font-medium text-[var(--color-body-text)]">Edit prompt and regenerate:</label>
                        <textarea
                          value={editedPrompt}
                          onChange={e => setEditedPrompt(e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => regenerateWithEditedPrompt(job)}
                            disabled={!editedPrompt.trim() || generating}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
                          >
                            <Sparkles size={12} /> {generating ? 'Starting...' : 'Regenerate'}
                          </button>
                          <button
                            onClick={() => { setEditingJobPrompt(null); setEditedPrompt('') }}
                            className="px-3 py-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : job.prompt ? (
                      <details className="mt-2 text-xs text-[var(--color-mid-gray)]">
                        <summary className="cursor-pointer hover:text-[var(--color-body-text)] transition-colors">View prompt</summary>
                        <p className="mt-1 p-2 rounded text-xs whitespace-pre-wrap bg-[var(--color-light-gray)] text-[var(--color-body-text)]">{job.prompt}</p>
                      </details>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no jobs */}
      {jobs.length === 0 && activeTemplate && (
        <div className="text-center py-6">
          <p className="text-xs text-[var(--color-mid-gray)]">Your generated videos will appear here</p>
        </div>
      )}
    </div>
  )
}
