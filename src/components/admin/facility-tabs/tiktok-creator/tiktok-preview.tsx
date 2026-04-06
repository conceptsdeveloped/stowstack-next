'use client'

import {
  Play, Pause, ChevronLeft, ChevronRight,
  Heart, MessageCircle, Share2, Bookmark, Search,
} from 'lucide-react'

/* ── Types ── */

interface Slide {
  id: string
  imageUrl: string
  textOverlay: string
  subText: string
  duration: number
  kenBurns: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none'
  textPosition: 'top' | 'center' | 'bottom'
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

export function TikTokPreview({
  slides,
  activeSlideIdx,
  setActiveSlideIdx,
  playing,
  togglePlay,
  caption,
  engagementCounts,
}: {
  slides: Slide[]
  activeSlideIdx: number
  setActiveSlideIdx: (idx: number) => void
  playing: boolean
  togglePlay: () => void
  caption: string
  engagementCounts: { heart: number; comment: number; share: number; bookmark: number }
}) {
  const activeSlide = slides[activeSlideIdx]

  return (
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
  )
}
