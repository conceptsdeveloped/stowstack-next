'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2, Sparkles, AlertTriangle, Edit3, RefreshCw,
  ImageIcon, Package, Star, Sunrise, Type, Pencil,
  Send, MoreHorizontal, Heart, MessageCircle, Bookmark, Globe,
  Copy, Check, ChevronRight, Eye, Wand2, ArrowDown, ArrowUp, Smartphone,
  Mail, MessageSquare, MousePointer, Layout,
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

interface FunnelConfig {
  landingHero: string
  landingFeatures: string[]
  postConversion: { channel: 'sms' | 'email'; message: string; timing: string }[]
  retargeting: string
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
  funnel_config?: FunnelConfig | null
  funnel_metrics?: Record<string, unknown> | null
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
  draft: 'bg-[var(--color-light-gray)] text-[var(--color-body-text)]',
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
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--color-light)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--color-gold)] rounded-full flex items-center justify-center text-white text-[9px] font-semibold">SS</div>
          <div>
            <p className="text-white text-[10px] font-semibold">{facilityName}</p>
            <p className="text-white/60 text-[8px]">Sponsored</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <p className="text-white text-lg font-semibold uppercase tracking-wide leading-none" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3" style={{ fontFamily: 'var(--font-ad-body)' }}>{primaryText}</p>
          <div className="flex justify-center pt-2">
            <div className="bg-white rounded-full px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-black" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</div>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'instagram_post') {
    return (
      <div className="w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-[var(--color-gold)] rounded-full flex items-center justify-center text-white text-[10px] font-semibold">SS</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--color-dark)]">{facilityName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-[10px] text-[var(--color-mid-gray)]">Sponsored</p>
          </div>
          <MoreHorizontal size={16} className="text-[var(--color-mid-gray)]" />
        </div>
        <div className="w-full aspect-square bg-[var(--color-light-gray)] relative">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-light)]">
              <ImageIcon size={32} className="text-[var(--color-mid-gray)]" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16">
            <p className="text-white text-xl font-semibold uppercase tracking-wide leading-none" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-3 py-2 text-[var(--color-dark)]">
          <Heart size={20} /><MessageCircle size={20} /><Send size={20} /><div className="flex-1" /><Bookmark size={20} />
        </div>
        <div className="px-3 pb-3">
          <p className="text-xs text-[var(--color-dark)]">
            <span className="font-semibold">{facilityName.toLowerCase().replace(/\s+/g, '')} </span>{primaryText}
          </p>
          {description && <p className="text-[10px] text-[var(--color-mid-gray)] mt-1" style={{ fontFamily: 'var(--font-ad-body)' }}>{description}</p>}
          <div className="mt-2">
            <span className="inline-block bg-[var(--color-gold)] text-[var(--color-light)] text-[10px] font-semibold px-3 py-1 rounded">{cta}</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'facebook_feed') {
    return (
      <div className="w-[400px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-[var(--color-gold)] rounded-full flex items-center justify-center text-white text-xs font-semibold">SS</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-dark)]">{facilityName}</p>
            <p className="text-[11px] text-[var(--color-mid-gray)]">Sponsored &middot; <Globe size={10} className="inline" /></p>
          </div>
          <MoreHorizontal size={18} className="text-[var(--color-mid-gray)]" />
        </div>
        <div className="px-3 pb-2"><p className="text-sm text-[var(--color-dark)]" style={{ fontFamily: 'var(--font-ad-body)' }}>{primaryText}</p></div>
        <div className="w-full aspect-[1.91/1] bg-[var(--color-light-gray)] relative">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-light)]">
              <ImageIcon size={32} className="text-[var(--color-mid-gray)]" />
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--color-light-gray)]">
          <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">storageads.com</p>
          <p className="text-sm font-semibold text-[var(--color-dark)] truncate" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-xs text-[var(--color-mid-gray)] truncate" style={{ fontFamily: 'var(--font-ad-body)' }}>{description}</p>
        </div>
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--color-light-gray)] text-[var(--color-dark)]" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          <div className="flex gap-4 text-[var(--color-mid-gray)]">
            <span className="text-xs">Like</span><span className="text-xs">Comment</span><span className="text-xs">Share</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'google_display') {
    return (
      <div className="w-[300px] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-[var(--bg-elevated)]">
        <div className="w-full h-[150px] bg-[var(--color-light-gray)] relative">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-light)]">
              <ImageIcon size={24} className="text-[var(--color-mid-gray)]" />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-semibold px-1 rounded">Ad</div>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="text-sm font-semibold leading-tight text-[var(--color-dark)]" style={{ fontFamily: 'var(--font-ad-headline)' }}>{headline}</p>
          <p className="text-[11px] text-[var(--color-mid-gray)] line-clamp-2">{description || primaryText}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[var(--color-mid-gray)]">{facilityName}</span>
            <button className="bg-[var(--color-gold)] text-[var(--color-light)] text-[10px] font-semibold px-3 py-1 rounded" style={{ fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/* ── Funnel Archetype Map ── */

const ARCHETYPE_FUNNELS: Record<string, {
  name: string
  landingHero: string
  landingFeatures: string[]
  postConversion: { channel: 'sms' | 'email'; message: string; timing: string }[]
  retargeting: string | null
  principle: string
}> = {
  social_proof: {
    name: 'The Trusted Choice',
    landingHero: 'Join [count] families who trust [Facility]. [Rating]★ rated.',
    landingFeatures: ['Review highlights', 'Move-in count this month', 'Years in business', 'storEDGE reservation embed'],
    postConversion: [
      { channel: 'sms', message: 'Your unit is reserved! Here\'s your access info.', timing: 'Immediate' },
      { channel: 'email', message: 'Welcome to [Facility] — here\'s what your neighbors say about us.', timing: 'Day 1' },
    ],
    retargeting: '"Still looking? [Rating]★ from [count] reviews. Your unit is waiting."',
    principle: 'Trust builds conversion. Lead with proof, reinforce with community.',
  },
  convenience: {
    name: 'The Easy Move',
    landingHero: '[Facility] on [Street] — 5 min from you. Reserve in 60 seconds.',
    landingFeatures: ['Map/proximity emphasis', 'No lease required', 'Online reservation', 'storEDGE embed with all sizes'],
    postConversion: [
      { channel: 'sms', message: 'Reserved! Your unit is at [Address]. Access code: [code].', timing: 'Immediate' },
      { channel: 'sms', message: 'Moving tip: here\'s what fits in your [size] unit.', timing: 'Day 2' },
    ],
    retargeting: '"[Facility] is 5 minutes away. $X/mo, no lease. Reserve now."',
    principle: 'Remove every friction point. Speed and proximity are the value.',
  },
  urgency: {
    name: 'The Last Chance',
    landingHero: '[X] units left at $X/mo. This rate won\'t last.',
    landingFeatures: ['Live availability count', 'Rate lock messaging', 'Countdown or scarcity indicator', 'storEDGE embed filtered to available'],
    postConversion: [
      { channel: 'sms', message: 'Locked in! Your $X/mo rate is secured.', timing: 'Immediate' },
      { channel: 'email', message: 'Smart move — rates are going up next month. You\'re set.', timing: 'Day 1' },
    ],
    retargeting: '"The [size] at $X/mo you looked at is still available — for now."',
    principle: 'Real urgency only. Inventory-backed scarcity, not manufactured fear.',
  },
  lifestyle: {
    name: 'The Fresh Start',
    landingHero: 'Finally, room to breathe. Climate-controlled from $X/mo.',
    landingFeatures: ['Emotional imagery — clean spaces, organized life', 'Climate-controlled emphasis', 'Before/after visualization', 'storEDGE embed with small/medium units'],
    postConversion: [
      { channel: 'email', message: 'What to store and what to let go — a simple guide.', timing: 'Day 2' },
      { channel: 'email', message: 'How [Facility] keeps your belongings safe.', timing: 'Day 5' },
      { channel: 'email', message: 'Your neighbors trust us — [Rating]★ from [count] reviews.', timing: 'Day 9' },
      { channel: 'email', message: 'Your space is waiting. Lock in $X/mo.', timing: 'Day 14' },
    ],
    retargeting: '"Still thinking about it? Your [size] at $X/mo is waiting."',
    principle: 'Sell the feeling, not the feature. Nurture over 2 weeks — no pressure.',
  },
}

/* ── Funnel Test Component ── */

function FunnelTest({ copy, image, facilityName, variationId, adminKey, savedConfig, onSave }: {
  copy: Record<string, string>
  image: string | null
  facilityName: string
  variationId: string | null
  adminKey: string
  savedConfig: FunnelConfig | null
  onSave: (config: FunnelConfig) => void
}) {
  const angle = copy.angle || 'lifestyle'
  const defaults = ARCHETYPE_FUNNELS[angle] || ARCHETYPE_FUNNELS.lifestyle
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)

  const [config, setConfig] = useState<FunnelConfig>(() => savedConfig || {
    landingHero: defaults.landingHero,
    landingFeatures: [...defaults.landingFeatures],
    postConversion: defaults.postConversion.map(p => ({ ...p })),
    retargeting: defaults.retargeting || '',
  })

  // Sync when variation changes
  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig)
    } else {
      const d = ARCHETYPE_FUNNELS[copy.angle || 'lifestyle'] || ARCHETYPE_FUNNELS.lifestyle
      setConfig({
        landingHero: d.landingHero,
        landingFeatures: [...d.landingFeatures],
        postConversion: d.postConversion.map(p => ({ ...p })),
        retargeting: d.retargeting || '',
      })
    }
  }, [variationId, savedConfig, copy.angle])

  async function handleSave() {
    if (!variationId) return
    setSaving(true)
    try {
      await fetch('/api/facility-creatives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ variationId, funnel_config: config }),
      })
      onSave(config)
      setEditing(false)
    } catch { /* */ } finally {
      setSaving(false)
    }
  }

  function fillVars(text: string) {
    return text
      .replace(/\[Facility\]/g, facilityName)
      .replace(/\[count\]/g, '247').replace(/\[Rating\]/g, '4.8')
      .replace(/\[Street\]/g, 'Main St').replace(/\[Address\]/g, '123 Main St')
      .replace(/\[X\]/g, '49').replace(/\[code\]/g, '4829')
      .replace(/\[size\]/g, '10×10')
  }

  function updatePostConversion(index: number, field: string, value: string) {
    setConfig(prev => ({
      ...prev,
      postConversion: prev.postConversion.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }))
  }

  function addPostConversion() {
    setConfig(prev => ({
      ...prev,
      postConversion: [...prev.postConversion, { channel: 'email' as const, message: '', timing: '' }],
    }))
  }

  function removePostConversion(index: number) {
    setConfig(prev => ({
      ...prev,
      postConversion: prev.postConversion.filter((_, i) => i !== index),
    }))
  }

  function movePostConversion(index: number, direction: -1 | 1) {
    setConfig(prev => {
      const arr = [...prev.postConversion]
      const target = index + direction
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return { ...prev, postConversion: arr }
    })
  }

  // Simulated metrics (will be real once tracking is wired)
  const metrics = {
    impressions: null as number | null,
    clicks: null as number | null,
    pageViews: null as number | null,
    reservationStarts: null as number | null,
    reservationCompletes: null as number | null,
    moveIns: null as number | null,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Layout size={14} className="text-[var(--color-gold)]" />
        <p className="text-xs font-semibold text-[var(--color-dark)]">Funnel: {defaults.name}</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] uppercase">{angle}</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-colors ${
              showMetrics ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-[var(--border-subtle)] text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]'
            }`}
          >
            Metrics
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
            >
              <Pencil size={10} className="inline mr-1" />Edit Funnel
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-[var(--color-gold)] text-[var(--color-light)] disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="px-2.5 py-1 text-[10px] text-[var(--color-mid-gray)]">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Funnel Metrics Panel */}
      {showMetrics && (
        <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
          <p className="text-xs font-semibold text-[var(--color-dark)] mb-3">Funnel Performance</p>
          <div className="space-y-2">
            {[
              { label: 'Impressions', value: metrics.impressions, next: metrics.clicks, nextLabel: 'CTR' },
              { label: 'Clicks', value: metrics.clicks, next: metrics.pageViews, nextLabel: 'Page Views' },
              { label: 'Page Views', value: metrics.pageViews, next: metrics.reservationStarts, nextLabel: 'Conv. Rate' },
              { label: 'Reservations Started', value: metrics.reservationStarts, next: metrics.reservationCompletes, nextLabel: 'Completion' },
              { label: 'Reservations Complete', value: metrics.reservationCompletes, next: metrics.moveIns, nextLabel: 'Show-up' },
              { label: 'Move-Ins', value: metrics.moveIns, next: null, nextLabel: null },
            ].map((step, i) => {
              const rate = step.value && step.next ? ((step.next / step.value) * 100).toFixed(1) + '%' : null
              return (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-body-text)]">{step.label}</span>
                    <span className="text-[11px] font-medium text-[var(--color-dark)]">
                      {step.value !== null ? step.value.toLocaleString() : '—'}
                    </span>
                  </div>
                  {step.next !== null && step.nextLabel && (
                    <div className="flex items-center gap-2 ml-4 mt-0.5">
                      <div className="h-3 border-l border-dashed border-[var(--border-medium)]" />
                      <span className="text-[10px] text-[var(--color-mid-gray)]">{step.nextLabel}: {rate || '—'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {metrics.impressions === null && (
            <p className="text-[10px] text-[var(--color-mid-gray)] mt-3 italic">No performance data yet. Metrics will populate once the campaign is live and events are flowing.</p>
          )}
        </div>
      )}

      {/* Step 1: Ad */}
      <div className="relative">
        <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-white text-[10px] font-semibold">1</div>
            <span className="text-xs font-semibold text-[var(--color-dark)]">Ad Impression</span>
            <span className="text-[10px] text-[var(--color-mid-gray)] ml-auto">Meta / Google</span>
          </div>
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image && <img src={image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-dark)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-ad-headline)' }}>{copy.headline || 'Headline'}</p>
              <p className="text-[11px] text-[var(--color-body-text)] mt-1 line-clamp-2" style={{ fontFamily: 'var(--font-ad-body)' }}>{copy.primaryText || 'Primary text'}</p>
              <p className="text-[10px] text-[var(--color-gold)] mt-1">{copy.cta || 'Learn More'} →</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center py-1"><ArrowDown size={16} className="text-[var(--color-gold)]" /></div>
      </div>

      {/* Step 2: Landing Page */}
      <div className="relative">
        <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-white text-[10px] font-semibold">2</div>
            <span className="text-xs font-semibold text-[var(--color-dark)]">Landing Page</span>
            <span className="text-[10px] text-[var(--color-mid-gray)] ml-auto">storageads.com/{facilityName.toLowerCase().replace(/\s+/g, '-')}</span>
          </div>
          <div className="border border-[var(--border-medium)] rounded-lg p-3 bg-[var(--color-light)]">
            {editing ? (
              <div className="space-y-2">
                <label className="text-[10px] text-[var(--color-mid-gray)] uppercase">Hero Text</label>
                <input
                  value={config.landingHero}
                  onChange={e => setConfig(prev => ({ ...prev, landingHero: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[var(--border-medium)] rounded text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]"
                />
                <label className="text-[10px] text-[var(--color-mid-gray)] uppercase mt-2 block">Features (one per line)</label>
                <textarea
                  value={config.landingFeatures.join('\n')}
                  onChange={e => setConfig(prev => ({ ...prev, landingFeatures: e.target.value.split('\n') }))}
                  rows={4}
                  className="w-full px-2 py-1.5 border border-[var(--border-medium)] rounded text-[11px] bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--color-dark)] mb-2" style={{ fontFamily: 'var(--font-ad-headline)' }}>
                  {fillVars(config.landingHero)}
                </p>
                <div className="space-y-1.5">
                  {config.landingFeatures.filter(Boolean).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--color-gold)] shrink-0" />
                      <span className="text-[11px] text-[var(--color-body-text)]">{f}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <MousePointer size={12} className="text-[var(--color-gold)]" />
                <span className="text-[10px] text-[var(--color-gold)] font-medium">→ storEDGE embed: Reserve / Move-In</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center py-1"><ArrowDown size={16} className="text-[var(--color-gold)]" /></div>
      </div>

      {/* Step 3: Conversion */}
      <div className="relative">
        <div className="border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-semibold">3</div>
            <span className="text-xs font-semibold text-emerald-400">Reservation Complete</span>
            <span className="text-[10px] text-emerald-400/60 ml-auto">Event fires → CAPI</span>
          </div>
          <p className="text-[11px] text-emerald-300/80">Full attribution: ad click → page view → reservation start → complete</p>
        </div>
        <div className="flex justify-center py-1"><ArrowDown size={16} className="text-emerald-500" /></div>
      </div>

      {/* Step 4: Post-conversion */}
      <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-white text-[10px] font-semibold">4</div>
          <span className="text-xs font-semibold text-[var(--color-dark)]">Post-Conversion Sequence</span>
          {editing && (
            <button onClick={addPostConversion} className="ml-auto text-[10px] text-[var(--color-gold)] hover:text-[var(--color-blue)]">+ Add Step</button>
          )}
        </div>
        <div className="space-y-2.5">
          {config.postConversion.map((msg, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {msg.channel === 'sms' ? (
                  <MessageSquare size={13} className="text-green-400" />
                ) : (
                  <Mail size={13} className="text-[var(--color-blue)]" />
                )}
              </div>
              {editing ? (
                <div className="flex-1 space-y-1">
                  <div className="flex gap-1.5 items-center">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => movePostConversion(i, -1)}
                        disabled={i === 0}
                        className="p-0.5 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] disabled:opacity-20 disabled:cursor-default"
                      >
                        <ArrowUp size={10} />
                      </button>
                      <button
                        onClick={() => movePostConversion(i, 1)}
                        disabled={i === config.postConversion.length - 1}
                        className="p-0.5 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] disabled:opacity-20 disabled:cursor-default"
                      >
                        <ArrowDown size={10} />
                      </button>
                    </div>
                    <select
                      value={msg.channel}
                      onChange={e => updatePostConversion(i, 'channel', e.target.value)}
                      className="px-1.5 py-1 text-[10px] bg-[var(--color-light-gray)] border border-[var(--border-medium)] rounded text-[var(--color-dark)]"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                    <input
                      value={msg.timing}
                      onChange={e => updatePostConversion(i, 'timing', e.target.value)}
                      placeholder="e.g., Immediate, Day 2"
                      className="flex-1 px-2 py-1 text-[10px] bg-[var(--color-light-gray)] border border-[var(--border-medium)] rounded text-[var(--color-dark)] placeholder-[var(--color-mid-gray)]"
                    />
                    <button onClick={() => removePostConversion(i)} className="text-[var(--color-mid-gray)] hover:text-red-400 text-[10px] shrink-0">×</button>
                  </div>
                  <input
                    value={msg.message}
                    onChange={e => updatePostConversion(i, 'message', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] bg-[var(--color-light-gray)] border border-[var(--border-medium)] rounded text-[var(--color-dark)]"
                  />
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[var(--color-body-text)] uppercase">{msg.channel}</span>
                    <span className="text-[10px] text-[var(--color-mid-gray)]">{msg.timing}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-dark)] mt-0.5">{fillVars(msg.message)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Retargeting */}
      <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Eye size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">Retargeting (if no conversion)</span>
          <span className="text-[10px] text-amber-400/60 ml-auto">Day 3 + Day 7</span>
        </div>
        {editing ? (
          <input
            value={config.retargeting}
            onChange={e => setConfig(prev => ({ ...prev, retargeting: e.target.value }))}
            className="w-full px-2 py-1.5 text-[11px] bg-amber-500/5 border border-amber-500/20 rounded text-amber-300 placeholder-amber-400/40 focus:outline-none"
            placeholder="Retargeting ad copy..."
          />
        ) : (
          <p className="text-[11px] text-amber-300/80 italic">{fillVars(config.retargeting)}</p>
        )}
      </div>

      {/* Funnel principle */}
      <div className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
        <p className="text-[10px] text-[var(--color-mid-gray)] uppercase tracking-wide font-medium mb-1">Funnel Principle</p>
        <p className="text-xs text-[var(--color-body-text)] italic">{defaults.principle}</p>
      </div>
    </div>
  )
}

/* ── Step Indicator ── */

function StepIndicator({ current, onStep }: { current: StudioStep; onStep: (s: StudioStep) => void }) {
  const steps: { key: StudioStep; label: string; num: number }[] = [
    { key: 'copy', label: 'Select Copy', num: 1 },
    { key: 'image', label: 'Generate Image', num: 2 },
    { key: 'preview', label: 'Preview & Publish', num: 3 },
  ]
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onStep(s.key)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              current === s.key
                ? 'bg-[var(--color-gold)] text-[var(--color-light)]'
                : 'text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
              current === s.key ? 'bg-[var(--color-dark)]/20' : 'bg-[var(--color-light-gray)]'
            }`}>{s.num}</span>
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.label.split(' ')[0]}</span>
          </button>
          {i < steps.length - 1 && <ChevronRight size={12} className="text-[var(--color-mid-gray)] shrink-0" />}
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ── */

export default function AdStudio({ facilityId, adminKey, facilityName }: {
  facilityId: string
  adminKey: string
  facilityName?: string
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
  const [previewMode, setPreviewMode] = useState<'mockup' | 'funnel'>('mockup')

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
  const resolvedFacilityName = facilityName || 'Storage Facility'

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
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">Ad Studio</h4>
          <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">Select copy, generate images, preview as mockup</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} onStep={setStep} />

      {/* ─── STEP 1: SELECT COPY ─── */}
      {step === 'copy' && (
        <div className="space-y-4">
          {variations.length === 0 ? (
            <div className="text-center py-12 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
              <Wand2 size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
              <p className="font-medium text-[var(--color-dark)]">No ad copy yet</p>
              <p className="text-sm text-[var(--color-mid-gray)] mt-1">Generate ad variations in the Creative Studio tab first, then return here to build complete ads.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-body-text)]">Select the ad copy this image will be paired with. The image generator will design visuals to complement your chosen copy.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variations.map(v => {
                  const c = v.content_json as MetaAdContent
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`w-full text-left p-4 border rounded-xl transition-all ${
                        selectedVariation?.id === v.id
                          ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                          {c.angleLabel || v.angle}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ''}`}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--color-dark)] mb-1">{c.headline}</p>
                      <p className="text-[11px] text-[var(--color-mid-gray)] line-clamp-2">{c.primaryText}</p>
                      {c.cta && <p className="text-[10px] text-[var(--color-gold)] mt-1.5">{c.cta}</p>}
                    </button>
                  )
                })}
              </div>
              {selectedVariation && (
                <button
                  onClick={() => setStep('image')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
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
                    onClick={() => { setSelectedImage(img.url); setStep('preview') }}
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
                    onClick={() => { setSelectedImage(job.imageUrl!); setStep('preview') }}
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
              onClick={() => setStep('preview')}
              className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border-subtle)] text-[var(--color-body-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-light-gray)] transition-colors"
            >
              <Eye size={14} /> Preview with Selected Image <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* ─── STEP 3: PREVIEW & PUBLISH ─── */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Mode toggle: Mockup vs Funnel */}
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode('mockup')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                previewMode === 'mockup'
                  ? 'bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]'
                  : 'border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
              }`}
            >
              <Smartphone size={13} /> Ad Mockup
            </button>
            <button
              onClick={() => setPreviewMode('funnel')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                previewMode === 'funnel'
                  ? 'bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]'
                  : 'border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
              }`}
            >
              <Layout size={13} /> Test Funnel
            </button>
          </div>

          {/* Format selector — only show in mockup mode */}
          {previewMode === 'mockup' && <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {AD_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFormat(f.id)}
                className={`shrink-0 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${
                  activeFormat === f.id
                    ? 'bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]'
                    : 'border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]'
                }`}
              >
                {f.label}
                <span className={`ml-1 sm:ml-1.5 text-[9px] sm:text-[10px] hidden sm:inline ${activeFormat === f.id ? 'text-[var(--color-blue)]' : 'text-[var(--color-mid-gray)]'}`}>
                  {f.width}x{f.height}
                </span>
              </button>
            ))}
          </div>}

          {/* ── MOCKUP VIEW ── */}
          {previewMode === 'mockup' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Live preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">Live Preview</h4>
              <div className="flex justify-center" ref={previewRef}>
                <AdMockup
                  format={activeFormat}
                  image={selectedImage}
                  copy={selectedCopy}
                  facilityName={resolvedFacilityName}
                />
              </div>
              <button
                onClick={handleCopyPreview}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-subtle)] text-[var(--color-body-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-light-gray)] transition-colors"
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
                <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-2">Ad Copy</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {variations.map(v => {
                    const c = v.content_json as MetaAdContent
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariation(v)}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          selectedVariation?.id === v.id
                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--color-light-gray)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-[var(--color-light-gray)] text-[var(--color-body-text)]">{c.angleLabel || v.angle}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[v.status] || ''}`}>{v.status}</span>
                        </div>
                        <p className="text-xs font-medium text-[var(--color-dark)] truncate">{c.headline}</p>
                        <p className="text-[11px] text-[var(--color-mid-gray)] line-clamp-1 mt-0.5">{c.primaryText}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Image selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-[var(--color-dark)]">Image</h4>
                  <button
                    onClick={() => setStep('image')}
                    className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-gold)] hover:text-[var(--color-blue)] transition-colors"
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
                          ? 'ring-2 ring-[var(--color-gold)]'
                          : 'ring-1 ring-[var(--border-subtle)] hover:ring-[var(--border-medium)]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={job.imageUrl!} alt="" className="h-16 w-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 text-[7px] px-1 rounded bg-[var(--color-gold)]/80 text-[var(--color-light)]">AI</span>
                    </button>
                  ))}
                  {/* Facility assets */}
                  {assets.map(img => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.url)}
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
                  {assets.length === 0 && jobs.filter(j => j.status === 'succeeded').length === 0 && (
                    <p className="col-span-4 text-center text-xs text-[var(--color-mid-gray)] py-4">No images available. Go back to generate one.</p>
                  )}
                </div>
              </div>
            </div>
          </div>}

          {/* ── FUNNEL VIEW ── */}
          {previewMode === 'funnel' && (
            <div className="max-w-xl">
              <FunnelTest
                copy={selectedCopy}
                image={selectedImage}
                facilityName={resolvedFacilityName}
                variationId={selectedVariation?.id || null}
                adminKey={adminKey}
                savedConfig={selectedVariation?.funnel_config || null}
                onSave={(config) => {
                  if (selectedVariation) {
                    setVariations(prev => prev.map(v =>
                      v.id === selectedVariation.id ? { ...v, funnel_config: config } as AdVariation : v
                    ))
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
