'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Download, Sparkles, AlertTriangle, Edit3, RefreshCw,
  ImageIcon, Package, Star, Sunrise, Type, Pencil,
  Send, MoreHorizontal, Heart, MessageCircle, Bookmark, Globe,
  Copy, Check, ChevronRight, Eye, Wand2,
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

interface MetaAdContent {
  angle: string
  angleLabel: string
  primaryText: string
  headline: string
  description: string
  cta: string
  targetingNote: string
}

interface AdVariation {
  id: string
  facility_id: string
  brief_id: string | null
  created_at: string
  platform: string
  format: string
  angle: string
  content_json: MetaAdContent | Record<string, unknown>
  asset_urls: Record<string, string> | null
  status: string
  feedback: string | null
  version: number
}

interface Asset {
  id: string
  facility_id: string
  created_at: string
  type: string
  source: string
  url: string
  metadata: Record<string, unknown> | null
}

type AdFormat = 'instagram_post' | 'instagram_story' | 'facebook_feed' | 'google_display'
type StudioStep = 'copy' | 'image' | 'preview'

const AD_FORMATS: { id: AdFormat; label: string; width: number; height: number }[] = [
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'google_display', label: 'Google Display', width: 300, height: 250 },
]

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  ad_hero: <ImageIcon size={14} />,
  ad_hero_wide: <Sunrise size={14} />,
  lifestyle_moving: <Package size={14} />,
  lifestyle_organized: <Sparkles size={14} />,
  lifestyle_packing: <Package size={14} />,
  social_promo: <Type size={14} />,
  social_seasonal: <Star size={14} />,
  before_after: <RefreshCw size={14} />,
  text_ad: <Pencil size={14} />,
  story_bg: <ImageIcon size={14} />,
}

const ASPECT_LABELS: Record<string, string> = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '4:5': 'Portrait',
  '9:16': 'Story',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-white/[0.06] text-[#A1A1A6]',
  approved: 'bg-emerald-500/10 text-emerald-400',
  published: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
}

/* ── Ad Mockup Renderer ── */

function AdMockup({ format, image, copy, facilityName }: {
  format: AdFormat
  image: string | null
  copy: Record<string, string>
  facilityName: string
}) {
  const headline = copy.headline || 'Your Headline Here'
  const primaryText = copy.primaryText || 'Your ad copy will appear here.'
  const description = copy.description || ''
  const cta = copy.cta || 'Learn More'

  if (format === 'instagram_story') {
    return (
      <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
        {image ? (
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#0A0A0A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-[9px] font-bold">SS</div>
          <div>
            <p className="text-white text-[10px] font-semibold">{facilityName}</p>
            <p className="text-white/60 text-[8px]">Sponsored</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <p className="text-white text-sm font-bold leading-tight" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3" style={{ fontFamily: 'var(--font-ad-body)' }}>{primaryText}</p>
          <div className="flex justify-center pt-2">
            <div className="bg-white rounded-full px-5 py-1.5 text-[10px] font-bold text-black" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</div>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'instagram_post') {
    return (
      <div className="w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[#111111]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-[10px] font-bold">SS</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F5F5F7]">{facilityName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-[10px] text-[#6E6E73]">Sponsored</p>
          </div>
          <MoreHorizontal size={16} className="text-[#6E6E73]" />
        </div>
        <div className="w-full aspect-square bg-[#1a1a1a] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
              <ImageIcon size={32} className="text-[#6E6E73]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-white text-base font-bold" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-3 py-2 text-[#F5F5F7]">
          <Heart size={20} /><MessageCircle size={20} /><Send size={20} /><div className="flex-1" /><Bookmark size={20} />
        </div>
        <div className="px-3 pb-3">
          <p className="text-xs text-[#F5F5F7]">
            <span className="font-semibold">{facilityName.toLowerCase().replace(/\s+/g, '')} </span>{primaryText}
          </p>
          {description && <p className="text-[10px] text-[#6E6E73] mt-1" style={{ fontFamily: 'var(--font-ad-body)' }}>{description}</p>}
          <div className="mt-2">
            <span className="inline-block bg-[#3B82F6] text-white text-[10px] font-semibold px-3 py-1 rounded">{cta}</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'facebook_feed') {
    return (
      <div className="w-[400px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[#111111]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-xs font-bold">SS</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#F5F5F7]">{facilityName}</p>
            <p className="text-[11px] text-[#6E6E73]">Sponsored &middot; <Globe size={10} className="inline" /></p>
          </div>
          <MoreHorizontal size={18} className="text-[#6E6E73]" />
        </div>
        <div className="px-3 pb-2"><p className="text-sm text-[#F5F5F7]" style={{ fontFamily: 'var(--font-ad-body)' }}>{primaryText}</p></div>
        <div className="w-full aspect-[1.91/1] bg-[#1a1a1a] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
              <ImageIcon size={32} className="text-[#6E6E73]" />
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] uppercase text-[#6E6E73]">storageads.com</p>
          <p className="text-sm font-semibold text-[#F5F5F7] truncate" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-xs text-[#6E6E73] truncate" style={{ fontFamily: 'var(--font-ad-body)' }}>{description}</p>
        </div>
        <div className="px-3 py-2 border-t border-white/[0.06] flex items-center justify-between">
          <button className="px-4 py-1.5 text-xs font-semibold rounded bg-white/[0.06] text-[#F5F5F7]" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          <div className="flex gap-4 text-[#6E6E73]">
            <span className="text-xs">Like</span><span className="text-xs">Comment</span><span className="text-xs">Share</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'google_display') {
    return (
      <div className="w-[300px] border border-white/[0.06] rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-[#111111]">
        <div className="w-full h-[150px] bg-[#1a1a1a] relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
              <ImageIcon size={24} className="text-[#6E6E73]" />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">Ad</div>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="text-sm font-bold leading-tight text-[#F5F5F7]" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-[11px] text-[#6E6E73] line-clamp-2">{description || primaryText}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[#6E6E73]">{facilityName}</span>
            <button className="bg-[#3B82F6] text-white text-[10px] font-semibold px-3 py-1 rounded" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/* ── Step Indicator ── */

function StepIndicator({ current, onStep }: { current: StudioStep; onStep: (s: StudioStep) => void }) {
  const steps: { key: StudioStep; label: string; num: number }[] = [
    { key: 'copy', label: 'Select Copy', num: 1 },
    { key: 'image', label: 'Generate Image', num: 2 },
    { key: 'preview', label: 'Preview & Publish', num: 3 },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <button
            onClick={() => onStep(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              current === s.key
                ? 'bg-[#3B82F6] text-white'
                : 'text-[#6E6E73] hover:text-[#A1A1A6] hover:bg-white/[0.04]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              current === s.key ? 'bg-white/20' : 'bg-white/[0.06]'
            }`}>{s.num}</span>
            {s.label}
          </button>
          {i < steps.length - 1 && <ChevronRight size={12} className="text-[#6E6E73]" />}
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ── */

export default function AdStudio({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  // Step state
  const [step, setStep] = useState<StudioStep>('copy')

  // Copy state
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [selectedVariation, setSelectedVariation] = useState<AdVariation | null>(null)

  // Image state
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')

  // Asset state
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Preview state
  const [activeFormat, setActiveFormat] = useState<AdFormat>('instagram_post')
  const [copied, setCopied] = useState(false)

  // Loading
  const [loading, setLoading] = useState(true)

  const previewRef = useRef<HTMLDivElement>(null)

  // Fetch all data on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/generate-image', { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-creatives?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()).catch(() => ({ assets: [] })),
    ]).then(([imageData, creativeData, assetData]) => {
      if (imageData.templates) {
        setTemplates(imageData.templates)
        setSelectedTemplate(imageData.templates[0]?.id || null)
      }
      if (creativeData.variations?.length) {
        const metaVariations = creativeData.variations.filter(
          (v: AdVariation) => v.platform === 'meta_feed' && v.status !== 'rejected'
        )
        setVariations(metaVariations)
        if (metaVariations.length) setSelectedVariation(metaVariations[0])
      }
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length > 0) setSelectedImage(photos[0].url)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facilityId, adminKey])

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
        setJobs(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'succeeded', imageUrl: data.imageUrl, prompt: data.prompt || j.prompt }
          : j
        ))
        // Auto-select this image for preview
        setSelectedImage(data.imageUrl)
      } else {
        setJobs(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'failed', error: data.error || 'Generation failed' }
          : j
        ))
      }
    } catch (err) {
      setJobs(prev => prev.map(j => j.id === jobId
        ? { ...j, status: 'failed', error: err instanceof Error ? err.message : 'Network error' }
        : j
      ))
    } finally {
      setGenerating(false)
    }
  }

  function handleCopyPreview() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeTemplateObj = templates.find(t => t.id === selectedTemplate)
  const selectedCopy = (selectedVariation?.content_json || {}) as Record<string, string>
  const facilityName = 'Storage Facility' // TODO: pass from parent

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#F5F5F7]">Ad Studio</h4>
          <p className="text-xs text-[#6E6E73] mt-0.5">Select copy, generate images, preview as mockup</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} onStep={setStep} />

      {/* ─── STEP 1: SELECT COPY ─── */}
      {step === 'copy' && (
        <div className="space-y-4">
          {variations.length === 0 ? (
            <div className="text-center py-12 border border-white/[0.06] rounded-xl bg-[#111111]">
              <Wand2 size={32} className="mx-auto mb-3 text-[#6E6E73]" />
              <p className="font-medium text-[#F5F5F7]">No ad copy yet</p>
              <p className="text-sm text-[#6E6E73] mt-1">Generate ad variations in the Creative Studio tab first, then return here to build complete ads.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#A1A1A6]">Select the ad copy this image will be paired with. The image generator will design visuals to complement your chosen copy.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variations.map(v => {
                  const c = v.content_json as MetaAdContent
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`w-full text-left p-4 border rounded-xl transition-all ${
                        selectedVariation?.id === v.id
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-white/[0.06] bg-[#111111] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-white/[0.06] text-[#A1A1A6]">
                          {c.angleLabel || v.angle}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ''}`}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#F5F5F7] mb-1">{c.headline}</p>
                      <p className="text-[11px] text-[#6E6E73] line-clamp-2">{c.primaryText}</p>
                      {c.cta && <p className="text-[10px] text-[#3B82F6] mt-1.5">{c.cta}</p>}
                    </button>
                  )
                })}
              </div>
              {selectedVariation && (
                <button
                  onClick={() => setStep('image')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Next: Generate Image <ChevronRight size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── STEP 2: GENERATE / SELECT IMAGE ─── */}
      {step === 'image' && (
        <div className="space-y-6">
          {/* Selected copy preview */}
          {selectedVariation && (
            <div className="p-3 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/5">
              <p className="text-[10px] text-[#3B82F6] font-medium mb-1">Paired with:</p>
              <p className="text-xs font-semibold text-[#F5F5F7]">{selectedCopy.headline}</p>
              <p className="text-[11px] text-[#6E6E73] line-clamp-1 mt-0.5">{selectedCopy.primaryText}</p>
            </div>
          )}

          {/* Existing images */}
          {assets.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#A1A1A6] block mb-2">Use Existing Image</label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                {assets.map(img => (
                  <button
                    key={img.id}
                    onClick={() => { setSelectedImage(img.url); setStep('preview') }}
                    className={`relative rounded-lg overflow-hidden transition-all ${
                      selectedImage === img.url
                        ? 'ring-2 ring-[#3B82F6]'
                        : 'ring-1 ring-white/[0.06] hover:ring-white/[0.12]'
                    }`}
                  >
                    <img src={img.url} alt="" className="h-16 w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generated images from this session */}
          {jobs.filter(j => j.status === 'succeeded').length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#A1A1A6] block mb-2">Generated This Session</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {jobs.filter(j => j.status === 'succeeded' && j.imageUrl).map(job => (
                  <button
                    key={job.id}
                    onClick={() => { setSelectedImage(job.imageUrl!); setStep('preview') }}
                    className={`relative rounded-lg overflow-hidden transition-all ${
                      selectedImage === job.imageUrl
                        ? 'ring-2 ring-[#3B82F6]'
                        : 'ring-1 ring-white/[0.06] hover:ring-white/[0.12]'
                    }`}
                  >
                    <img src={job.imageUrl!} alt="" className="h-20 w-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.5 rounded bg-black/60 text-white">{ASPECT_LABELS[job.aspect]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate new */}
          <div className="border border-white/[0.06] rounded-xl p-5 bg-[#111111] space-y-4">
            <label className="text-xs font-medium text-[#A1A1A6] block">Generate New Image</label>

            {/* Template grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setShowPromptEditor(false); setPromptOverride('') }}
                  className={`text-left p-2.5 border rounded-lg transition-all ${
                    selectedTemplate === t.id
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[#A1A1A6]">{TEMPLATE_ICONS[t.id] || <ImageIcon size={14} />}</span>
                    <span className="text-[11px] font-semibold text-[#F5F5F7] truncate">{t.name}</span>
                  </div>
                  <p className="text-[9px] text-[#6E6E73] line-clamp-1">{t.description}</p>
                  <span className="inline-block mt-1 text-[8px] px-1 py-0.5 rounded bg-white/[0.06] text-[#A1A1A6]">{ASPECT_LABELS[t.aspect] || t.aspect}</span>
                </button>
              ))}
            </div>

            {/* Notes + prompt override */}
            <div>
              <label className="text-xs font-medium text-[#A1A1A6] block mb-1.5">Custom Notes (optional)</label>
              <input
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g., Include a sunset, show climate-controlled units, spring theme..."
                className="w-full px-3 py-2 border border-white/[0.06] rounded-lg text-sm bg-white/[0.03] text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="flex items-center gap-1.5 text-xs text-[#6E6E73] hover:text-[#A1A1A6] transition-colors"
              >
                <Edit3 size={11} /> {showPromptEditor ? 'Hide' : 'Edit'} prompt directly
              </button>
              {showPromptEditor && (
                <textarea
                  value={promptOverride}
                  onChange={e => setPromptOverride(e.target.value)}
                  rows={3}
                  placeholder="Write your own image prompt..."
                  className="mt-2 w-full px-3 py-2 border border-white/[0.06] rounded-lg text-xs font-mono bg-white/[0.03] text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#3B82F6] resize-none"
                />
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={() => generateImage()}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> Generate {activeTemplateObj?.name || 'Image'}</>
              )}
            </button>
            <p className="text-[10px] text-[#6E6E73]">Takes 10-30 seconds. Image auto-saves to facility assets.</p>
          </div>

          {/* Active generation jobs */}
          {jobs.filter(j => j.status === 'generating').length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {jobs.filter(j => j.status === 'generating').map(job => (
                <div key={job.id} className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#111111]">
                  <div className="aspect-square flex items-center justify-center bg-white/[0.03]">
                    <div className="text-center">
                      <Loader2 size={24} className="animate-spin text-[#3B82F6] mx-auto mb-2" />
                      <p className="text-xs text-[#6E6E73]">Generating {job.templateName}...</p>
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
                    className="flex items-center gap-1 text-[11px] text-[#6E6E73] hover:text-[#A1A1A6] mt-1 transition-colors"
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
                    className="w-full px-2 py-1.5 border border-white/[0.06] rounded text-[11px] font-mono bg-white/[0.03] text-[#F5F5F7] focus:outline-none focus:border-[#3B82F6] resize-none"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={() => { generateImage(editedPrompt); setEditingPrompt(null) }} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors">
                      <Sparkles size={12} /> Retry
                    </button>
                    <button onClick={() => setEditingPrompt(null)} className="px-3 py-1.5 text-xs text-[#6E6E73] hover:text-[#A1A1A6] transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Skip / go to preview */}
          {selectedImage && (
            <button
              onClick={() => setStep('preview')}
              className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.06] text-[#A1A1A6] text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <Eye size={14} /> Preview with Selected Image <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* ─── STEP 3: PREVIEW & PUBLISH ─── */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Format selector */}
          <div className="flex flex-wrap gap-2">
            {AD_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFormat(f.id)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  activeFormat === f.id
                    ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                    : 'border-white/[0.06] text-[#A1A1A6] hover:bg-white/[0.04]'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] ${activeFormat === f.id ? 'text-blue-200' : 'text-[#6E6E73]'}`}>
                  {f.width}x{f.height}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Live preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#F5F5F7]">Live Preview</h4>
              <div className="flex justify-center" ref={previewRef}>
                <AdMockup
                  format={activeFormat}
                  image={selectedImage}
                  copy={selectedCopy}
                  facilityName={facilityName}
                />
              </div>
              <button
                onClick={handleCopyPreview}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/[0.06] text-[#A1A1A6] text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                {copied ? (
                  <><Check size={14} className="text-emerald-400" /> Preview Captured</>
                ) : (
                  <><Copy size={14} /> Copy Preview</>
                )}
              </button>
            </div>

            {/* Right: Controls */}
            <div className="space-y-5">
              {/* Copy selector */}
              <div>
                <h4 className="text-sm font-semibold text-[#F5F5F7] mb-2">Ad Copy</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {variations.map(v => {
                    const c = v.content_json as MetaAdContent
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariation(v)}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          selectedVariation?.id === v.id
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                            : 'border-white/[0.06] bg-[#111111] hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-white/[0.06] text-[#A1A1A6]">{c.angleLabel || v.angle}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ''}`}>{v.status}</span>
                        </div>
                        <p className="text-xs font-medium text-[#F5F5F7] truncate">{c.headline}</p>
                        <p className="text-[11px] text-[#6E6E73] line-clamp-1 mt-0.5">{c.primaryText}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Image selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-[#F5F5F7]">Image</h4>
                  <button
                    onClick={() => setStep('image')}
                    className="ml-auto flex items-center gap-1 text-[11px] text-[#3B82F6] hover:text-blue-400 transition-colors"
                  >
                    <Sparkles size={10} /> Generate New
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {/* Session-generated images first */}
                  {jobs.filter(j => j.status === 'succeeded' && j.imageUrl).map(job => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedImage(job.imageUrl!)}
                      className={`relative rounded-lg overflow-hidden transition-all ${
                        selectedImage === job.imageUrl
                          ? 'ring-2 ring-[#3B82F6]'
                          : 'ring-1 ring-white/[0.06] hover:ring-white/[0.12]'
                      }`}
                    >
                      <img src={job.imageUrl!} alt="" className="h-16 w-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 text-[7px] px-1 rounded bg-[#3B82F6]/80 text-white">AI</span>
                    </button>
                  ))}
                  {/* Facility assets */}
                  {assets.map(img => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.url)}
                      className={`relative rounded-lg overflow-hidden transition-all ${
                        selectedImage === img.url
                          ? 'ring-2 ring-[#3B82F6]'
                          : 'ring-1 ring-white/[0.06] hover:ring-white/[0.12]'
                      }`}
                    >
                      <img src={img.url} alt="" className="h-16 w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </button>
                  ))}
                  {assets.length === 0 && jobs.filter(j => j.status === 'succeeded').length === 0 && (
                    <p className="col-span-4 text-center text-xs text-[#6E6E73] py-4">No images available. Go back to generate one.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
