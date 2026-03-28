'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Loader2, Plus, Trash2, Play, Pause, ChevronLeft, ChevronRight,
  ImageIcon, Send, Clock, Sparkles, Download, Hash, Type,
  Heart, MessageCircle, Share2, Bookmark, Search, X
} from 'lucide-react'

/* ── Types ── */

interface Asset {
  id: string
  url: string
  type: string
  label?: string
}

interface Slide {
  id: string
  imageUrl: string
  textOverlay: string
  subText: string
  duration: number
  kenBurns: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none'
  textPosition: 'top' | 'center' | 'bottom'
}

const KB_EFFECTS: Slide['kenBurns'][] = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'none']

const STORAGE_HOOKS = [
  "Running out of space? We've got you covered.",
  "Declutter your life. Store with confidence.",
  "Your stuff deserves a safe home too.",
  "Moving? We'll hold onto your things.",
  "Storage made simple. Reserve your unit today.",
  "Garage looking like a disaster? We can help.",
  "First month free -- limited units available.",
  "Climate-controlled units starting at $49/mo.",
  "Don't throw it away. Store it away.",
  "5-star rated storage in your neighborhood.",
]

const HASHTAG_SETS = [
  '#selfstorage #storageunit #moving #declutter #organization #movingtips',
  '#storagelife #packingtips #movingday #storagesolutions #organize #rental',
  '#ministorage #storagefacility #movingout #storageunits #cleanout #spacesaver',
]

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function getKenBurnsStyle(effect: Slide['kenBurns'], duration: number, playing: boolean): React.CSSProperties {
  if (!playing || effect === 'none') return {}
  const dur = `${duration}s`
  const base: React.CSSProperties = {
    animationDuration: dur,
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
  }
  switch (effect) {
    case 'zoom-in':
      return { ...base, animation: `kenBurnsZoomIn ${dur} ease-out forwards` }
    case 'zoom-out':
      return { ...base, animation: `kenBurnsZoomOut ${dur} ease-out forwards` }
    case 'pan-left':
      return { ...base, animation: `kenBurnsPanLeft ${dur} ease-out forwards` }
    case 'pan-right':
      return { ...base, animation: `kenBurnsPanRight ${dur} ease-out forwards` }
    default:
      return {}
  }
}

/* ── Component ── */

export default function TikTokCreator({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [caption, setCaption] = useState('')
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [engagementCounts] = useState(() => ({
    heart: Math.floor(Math.random() * 500) + 100,
    comment: Math.floor(Math.random() * 80) + 10,
    share: Math.floor(Math.random() * 40) + 5,
    bookmark: Math.floor(Math.random() * 60) + 8,
  }))

  // Load assets
  useEffect(() => {
    fetch(`/api/facility-assets?facilityId=${facilityId}`, {
      headers: { 'X-Admin-Key': adminKey },
    })
      .then(r => r.json())
      .then(data => {
        const photos = (data.assets || []).filter((a: Asset) => a.type === 'photo')
        setAssets(photos)

        // Auto-generate initial slideshow
        if (photos.length > 0) {
          const initial = photos.slice(0, 5).map((a: Asset, i: number) => ({
            id: generateId(),
            imageUrl: a.url,
            textOverlay: i === 0 ? 'Your Facility' : '',
            subText: '',
            duration: 2,
            kenBurns: KB_EFFECTS[i % KB_EFFECTS.length],
            textPosition: 'bottom' as const,
          }))
          setSlides(initial)
        }
      })
      .catch(() => { setError('Failed to load assets. Please try refreshing the page.') })
      .finally(() => setLoading(false))
  }, [facilityId, adminKey])

  // Playback
  const advanceSlide = useCallback(() => {
    setActiveSlideIdx(prev => {
      const next = prev + 1
      if (next >= slides.length) {
        setPlaying(false)
        return 0
      }
      return next
    })
  }, [slides.length])

  useEffect(() => {
    if (playing && slides.length > 0) {
      const currentSlide = slides[activeSlideIdx]
      timerRef.current = setTimeout(advanceSlide, currentSlide.duration * 1000)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, activeSlideIdx, slides, advanceSlide])

  function togglePlay() {
    if (playing) {
      setPlaying(false)
    } else {
      if (activeSlideIdx >= slides.length - 1) setActiveSlideIdx(0)
      setPlaying(true)
    }
  }

  function addSlide(imageUrl: string) {
    setSlides(prev => [...prev, {
      id: generateId(),
      imageUrl,
      textOverlay: '',
      subText: '',
      duration: 2,
      kenBurns: KB_EFFECTS[prev.length % KB_EFFECTS.length],
      textPosition: 'bottom',
    }])
  }

  function removeSlide(idx: number) {
    setSlides(prev => prev.filter((_, i) => i !== idx))
    if (activeSlideIdx >= slides.length - 1) setActiveSlideIdx(Math.max(0, slides.length - 2))
  }

  function updateSlide(idx: number, updates: Partial<Slide>) {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s))
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= slides.length) return
    setSlides(prev => {
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = copy[newIdx]
      copy[newIdx] = temp
      return copy
    })
    setActiveSlideIdx(newIdx)
  }

  async function autoGenerate() {
    setGenerating(true)
    try {
      const images = assets.slice(0, 6)
      if (images.length === 0) return

      const hookText = STORAGE_HOOKS[Math.floor(Math.random() * STORAGE_HOOKS.length)]
      const headline = 'Your Storage Solution'
      const cta = 'Reserve Your Unit Today'

      const newSlides: Slide[] = [
        {
          id: generateId(),
          imageUrl: images[0].url,
          textOverlay: headline,
          subText: '',
          duration: 2.5,
          kenBurns: 'zoom-in',
          textPosition: 'center',
        },
        ...images.slice(1, -1).map((img, i) => ({
          id: generateId(),
          imageUrl: img.url,
          textOverlay: [
            'Clean, Secure Units',
            '24/7 Access Available',
            'Climate Controlled',
            'Month-to-Month Leases',
            'Drive-Up Access',
          ][i % 5],
          subText: '',
          duration: 2,
          kenBurns: KB_EFFECTS[(i + 1) % KB_EFFECTS.length] as Slide['kenBurns'],
          textPosition: 'bottom' as const,
        })),
        {
          id: generateId(),
          imageUrl: images[images.length - 1].url,
          textOverlay: cta,
          subText: hookText.slice(0, 80),
          duration: 3,
          kenBurns: 'zoom-out',
          textPosition: 'center',
        },
      ]

      setSlides(newSlides)
      setActiveSlideIdx(0)
      setCaption(`${hookText}\n\n${HASHTAG_SETS[Math.floor(Math.random() * HASHTAG_SETS.length)]}`)
    } finally {
      setGenerating(false)
    }
  }

  async function exportVideo() {
    if (slides.length === 0 || exporting) return
    setExporting(true)
    try {
      // Create a canvas-based export
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      // Draw current slide as a preview frame
      const activeSlide = slides[activeSlideIdx]
      if (activeSlide) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Image load failed'))
          img.src = activeSlide.imageUrl
        })

        // Draw image covering canvas
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)

        // Gradient overlay
        const gradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height)
        gradient.addColorStop(0, 'rgba(0,0,0,0)')
        gradient.addColorStop(1, 'rgba(0,0,0,0.7)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Text overlay
        if (activeSlide.textOverlay) {
          ctx.fillStyle = 'white'
          ctx.font = 'bold 64px sans-serif'
          ctx.textAlign = 'center'
          const y = activeSlide.textPosition === 'top' ? 300 :
                    activeSlide.textPosition === 'center' ? canvas.height / 2 :
                    canvas.height - 400
          ctx.fillText(activeSlide.textOverlay, canvas.width / 2, y)
        }
      }

      // Convert to blob and download
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png')
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tiktok-slideshow-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0)
  const activeSlide = slides[activeSlideIdx]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ken Burns keyframes */}
      <style>{`
        @keyframes kenBurnsZoomIn {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        @keyframes kenBurnsZoomOut {
          from { transform: scale(1.15); }
          to { transform: scale(1); }
        }
        @keyframes kenBurnsPanLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-5%); }
        }
        @keyframes kenBurnsPanRight {
          from { transform: translateX(0); }
          to { transform: translateX(5%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">TikTok Content Creator</h4>
          <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">Build slideshows for organic TikTok posting</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={autoGenerate}
            disabled={generating || assets.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Auto-Generate
          </button>
          <span className="flex items-center gap-1 text-xs text-[var(--color-mid-gray)]">
            <Clock size={12} /> {totalDuration.toFixed(1)}s
          </span>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="text-center py-12 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <ImageIcon size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">
            {assets.length === 0
              ? 'No images available. Upload images in the Assets tab first.'
              : 'Click "Auto-Generate" to create a slideshow, or add slides manually below.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: TikTok Preview */}
          <div className="space-y-3">
            <div className="flex justify-center">
              {/* 9:16 TikTok phone frame */}
              <div className="w-full max-w-[270px] h-[480px] bg-black rounded-[24px] overflow-hidden relative shadow-2xl flex-shrink-0 border-2 border-[var(--color-dark)]/10">
                {/* Slide image with Ken Burns */}
                {activeSlide && (
                  <div className="absolute inset-0 overflow-hidden" key={activeSlide.id + '-' + activeSlideIdx}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeSlide.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      style={getKenBurnsStyle(activeSlide.kenBurns, activeSlide.duration, playing)}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                {/* TikTok UI chrome - top bar */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-[10px] font-semibold">Following</span>
                    <span className="text-white text-[10px] font-semibold border-b border-white pb-0.5">For You</span>
                  </div>
                  <Search size={14} className="text-white/80" />
                </div>

                {/* Progress bar */}
                <div className="absolute top-8 left-3 right-3 flex gap-0.5">
                  {slides.map((_, i) => (
                    <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i <= activeSlideIdx ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>

                {/* Slide counter */}
                <div className="absolute top-11 right-3 bg-black/50 rounded-full px-2 py-0.5">
                  <span className="text-white text-[9px] font-medium">{activeSlideIdx + 1}/{slides.length}</span>
                </div>

                {/* Text overlay */}
                {activeSlide && (activeSlide.textOverlay || activeSlide.subText) && (
                  <div className={`absolute left-0 right-0 px-5 ${
                    activeSlide.textPosition === 'top' ? 'top-16' :
                    activeSlide.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' :
                    'bottom-24'
                  }`}>
                    {activeSlide.textOverlay && (
                      <p
                        className={`text-white font-semibold leading-tight ${
                          activeSlide.textOverlay.length > 30 ? 'text-base' : 'text-lg'
                        }`}
                        style={{
                          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                          ...(playing ? { animation: 'fadeInUp 0.4s ease-out forwards' } : {}),
                        }}
                      >
                        {activeSlide.textOverlay}
                      </p>
                    )}
                    {activeSlide.subText && (
                      <p
                        className="text-white/80 text-xs mt-1"
                        style={{
                          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                          ...(playing ? { animation: 'fadeInUp 0.4s ease-out 0.2s forwards', opacity: 0 } : {}),
                        }}
                      >
                        {activeSlide.subText}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom TikTok chrome */}
                <div className="absolute bottom-3 left-3 right-12">
                  <p className="text-white text-[10px] font-semibold">@yourstoragefacility</p>
                  <p className="text-white/70 text-[9px] mt-0.5 line-clamp-2">{caption.split('\n')[0] || 'Your caption here...'}</p>
                </div>

                {/* Right side engagement icons */}
                <div className="absolute right-2 bottom-16 flex flex-col gap-4 items-center">
                  <div className="text-center">
                    <Heart size={20} className="text-white mx-auto" />
                    <p className="text-white text-[8px] mt-0.5">{engagementCounts.heart}</p>
                  </div>
                  <div className="text-center">
                    <MessageCircle size={20} className="text-white mx-auto" />
                    <p className="text-white text-[8px] mt-0.5">{engagementCounts.comment}</p>
                  </div>
                  <div className="text-center">
                    <Share2 size={20} className="text-white mx-auto" />
                    <p className="text-white text-[8px] mt-0.5">{engagementCounts.share}</p>
                  </div>
                  <div className="text-center">
                    <Bookmark size={20} className="text-white mx-auto" />
                    <p className="text-white text-[8px] mt-0.5">{engagementCounts.bookmark}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))}
                disabled={playing}
                className="p-2 rounded-lg hover:bg-[var(--color-light-gray)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} className="text-[var(--color-body-text)]" />
              </button>
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
              >
                {playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Preview</>}
              </button>
              <button
                onClick={() => setActiveSlideIdx(Math.min(slides.length - 1, activeSlideIdx + 1))}
                disabled={playing}
                className="p-2 rounded-lg hover:bg-[var(--color-light-gray)] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} className="text-[var(--color-body-text)]" />
              </button>
            </div>
          </div>

          {/* Right: Slide editor */}
          <div className="space-y-4">
            {/* Caption & Hashtags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--color-body-text)]">Caption & Hashtags</label>
                <span className="text-[10px] text-[var(--color-mid-gray)]">{caption.length}/2200</span>
              </div>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                maxLength={2200}
                placeholder="Write your TikTok caption... #selfstorage #moving"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
              />
            </div>

            {/* Hashtag quick-insert */}
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] flex items-center gap-1 mb-1.5">
                <Hash size={11} /> Quick Hashtag Sets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HASHTAG_SETS.map((set, i) => (
                  <button
                    key={i}
                    onClick={() => setCaption(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n\n') + set)}
                    className="text-[10px] px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)] transition-colors truncate max-w-[200px]"
                  >
                    {set}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage hooks */}
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] flex items-center gap-1 mb-1.5">
                <Type size={11} /> Storage Hooks (tap to use as headline)
              </label>
              <div className="grid grid-cols-1 gap-1 max-h-[120px] overflow-y-auto pr-1">
                {STORAGE_HOOKS.map((hook, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (activeSlide) {
                        updateSlide(activeSlideIdx, { textOverlay: hook })
                      }
                    }}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-dark)] hover:border-[var(--color-gold)]/30 transition-colors"
                  >
                    {hook}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--color-body-text)]">Slides ({slides.length})</label>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    onClick={() => { setPlaying(false); setActiveSlideIdx(idx) }}
                    className={`flex gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
                      idx === activeSlideIdx
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt=""
                      className="w-14 h-14 object-cover rounded flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Headline input */}
                      <input
                        value={slide.textOverlay}
                        onChange={e => updateSlide(idx, { textOverlay: e.target.value })}
                        placeholder="Headline text..."
                        className="w-full text-xs px-1.5 py-0.5 rounded bg-transparent text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] border-none outline-none focus:bg-[var(--color-light-gray)]"
                        onClick={e => e.stopPropagation()}
                      />
                      {/* Subtext input */}
                      <input
                        value={slide.subText}
                        onChange={e => updateSlide(idx, { subText: e.target.value })}
                        placeholder="Subtext..."
                        className="w-full text-[10px] px-1.5 py-0.5 rounded bg-transparent text-[var(--color-body-text)] placeholder-[var(--color-mid-gray)] border-none outline-none focus:bg-[var(--color-light-gray)]"
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex gap-1.5 items-center">
                        {/* Duration */}
                        <select
                          value={slide.duration}
                          onChange={e => updateSlide(idx, { duration: parseFloat(e.target.value) })}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] border-none outline-none"
                        >
                          {[1, 1.5, 2, 2.5, 3, 4, 5].map(d => (
                            <option key={d} value={d}>{d}s</option>
                          ))}
                        </select>
                        {/* Ken Burns */}
                        <select
                          value={slide.kenBurns}
                          onChange={e => updateSlide(idx, { kenBurns: e.target.value as Slide['kenBurns'] })}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] border-none outline-none"
                        >
                          <option value="zoom-in">Zoom In</option>
                          <option value="zoom-out">Zoom Out</option>
                          <option value="pan-left">Pan Left</option>
                          <option value="pan-right">Pan Right</option>
                          <option value="none">Static</option>
                        </select>
                        {/* Text Position */}
                        <select
                          value={slide.textPosition}
                          onChange={e => updateSlide(idx, { textPosition: e.target.value as Slide['textPosition'] })}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] border-none outline-none"
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                        </select>
                        <div className="flex-1" />
                        {/* Move controls */}
                        <button onClick={e => { e.stopPropagation(); moveSlide(idx, -1) }} disabled={idx === 0} className="p-0.5 text-[var(--color-mid-gray)] disabled:opacity-20 hover:text-[var(--color-dark)]"><ChevronLeft size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); moveSlide(idx, 1) }} disabled={idx === slides.length - 1} className="p-0.5 text-[var(--color-mid-gray)] disabled:opacity-20 hover:text-[var(--color-dark)]"><ChevronRight size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); removeSlide(idx) }} className="p-0.5 text-red-400 hover:text-red-300"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add slide from assets */}
            <div>
              <label className="text-xs font-medium text-[var(--color-body-text)] block mb-1.5">Add Image</label>
              {assets.filter(a => !slides.some(s => s.imageUrl === a.url)).length === 0 ? (
                <p className="text-[10px] text-[var(--color-mid-gray)]">All available images are in the slideshow.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-24 overflow-y-auto">
                  {assets.filter(a => !slides.some(s => s.imageUrl === a.url)).map(a => (
                    <button
                      key={a.id}
                      onClick={() => addSlide(a.url)}
                      className="relative h-10 rounded overflow-hidden hover:ring-2 hover:ring-[var(--color-gold)] transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Plus size={12} className="text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export & Publish */}
            <div className="space-y-2">
              <button
                onClick={exportVideo}
                disabled={exporting || slides.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
              >
                {exporting ? (
                  <><Loader2 size={14} className="animate-spin" /> Exporting...</>
                ) : (
                  <><Download size={14} /> Export Video ({totalDuration.toFixed(0)}s)</>
                )}
              </button>
              <button
                onClick={() => {
                  const msg = `Slideshow ready! ${slides.length} slides, ${totalDuration}s total.\n\nGo to the Publish tab and select TikTok to post this content.`
                  alert(msg)
                }}
                disabled={slides.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-light-gray)] text-[var(--color-dark)] text-sm font-medium rounded-lg hover:bg-[var(--color-light-gray)] disabled:opacity-40 transition-colors border border-[var(--border-subtle)]"
              >
                <Send size={14} /> Publish as Carousel ({slides.length} slides)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
