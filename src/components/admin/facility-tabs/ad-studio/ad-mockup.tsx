'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  ImageIcon, MoreHorizontal, Heart, MessageCircle, Bookmark, Globe, Send,
} from 'lucide-react'
import type { AdFormat } from './types'
import { getImageBrightness } from './image-brightness'

function useImageBrightness(imageUrl: string | null) {
  const [isDark, setIsDark] = useState(true) // default: assume dark image → dark pill
  useEffect(() => {
    if (!imageUrl) { setIsDark(true); return }
    getImageBrightness(imageUrl, 'bottom').then(({ isDark: d }) => setIsDark(d))
  }, [imageUrl])
  return isDark
}

// Splits headline into wrapped lines and gives each its own tight pill
function TightPill({ text, isDark, fontSize = '24px', style }: { text: string; isDark: boolean; fontSize?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<string[]>([text])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = `900 ${fontSize} Inter, system-ui, sans-serif`
    const maxWidth = container.parentElement?.clientWidth
      ? container.parentElement.clientWidth - 32 // 16px padding each side
      : 260

    const words = text.split(/\s+/)
    const result: string[] = []
    let currentLine = ''

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(test.toUpperCase()).width > maxWidth && currentLine) {
        result.push(currentLine)
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine) result.push(currentLine)
    setLines(result)
  }, [text, fontSize])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const bg = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'
  const color = isDark ? '#050505' : '#FFFFFF'
  const glow = isDark
    ? '0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.4), 0 0 8px rgba(255,255,255,0.6)'
    : '0 0 30px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.3), 0 0 8px rgba(0,0,0,0.5)'

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', ...style }}>
      {lines.map((line, i) => (
        <span key={i} style={{
          backgroundColor: bg,
          color,
          fontSize,
          fontWeight: 900,
          padding: '4px 7px',
          borderRadius: i === 0 && lines.length > 1 ? '4px 4px 2px 2px'
            : i === lines.length - 1 && lines.length > 1 ? '2px 2px 4px 4px'
            : '4px',
          lineHeight: 1.1,
          display: 'inline-block',
          textTransform: 'uppercase' as const,
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-ad-headline)',
          textShadow: glow,
          textAlign: 'center' as const,
          width: 'fit-content',
        }}>{line}</span>
      ))}
    </div>
  )
}

// Pill styles that adapt to image brightness
function pillStyles(isDarkImage: boolean, size: 'lg' | 'sm' = 'lg') {
  const bg = isDarkImage ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'
  const color = isDarkImage ? '#050505' : '#FFFFFF'
  const fontSize = size === 'lg' ? '24px' : '14px'
  const fontWeight = size === 'lg' ? 900 : 700
  return {
    backgroundColor: bg,
    color,
    fontSize,
    fontWeight,
    padding: size === 'lg' ? '6px 12px' : '3px 8px',
    borderRadius: '4px',
    lineHeight: size === 'lg' ? 1.0 : 1.4,
    display: 'inline-block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '-0.02em',
    width: 'fit-content' as const,
    fontFamily: size === 'lg' ? 'var(--font-ad-headline)' : 'var(--font-ad-body)',
    boxDecorationBreak: 'clone' as const,
    WebkitBoxDecorationBreak: 'clone' as const,
  }
}

export function AdMockup({ format, image, copy, facilityName }: {
  format: AdFormat
  image: string | null
  copy: Record<string, string>
  facilityName: string
}) {
  const headline = copy.headline || 'Your Headline Here'
  const primaryText = copy.primaryText || 'Your ad copy will appear here.'
  const description = copy.description || ''
  const cta = copy.cta || 'Learn More'
  const isDarkImage = useImageBrightness(image)

  if (format === 'instagram_story') {
    return (
      <div data-ad-mockup="true" className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--color-light)]" />
        )}
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#8C2332] rounded-full flex items-center justify-center" style={{ color: '#FFFFFF', fontSize: '9px', fontWeight: 900 }}>SA</div>
          <div>
            <p style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>{facilityName}</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '8px' }}>Sponsored</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 flex flex-col items-center">
          <TightPill text={headline} isDark={isDarkImage} />
          <TightPill text={primaryText} isDark={isDarkImage} fontSize="11px" />
          <div className="flex justify-center pt-1">
            <div className="bg-white rounded-full px-5 py-1.5" style={{ color: '#050505', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{cta}</div>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'instagram_post') {
    return (
      <div data-ad-mockup="true" className="w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-[#8C2332] rounded-full flex items-center justify-center" style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 900 }}>SA</div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-dark)' }}>{facilityName.toLowerCase().replace(/\s+/g, '')}</p>
            <p style={{ fontSize: '10px', color: 'var(--color-mid-gray)' }}>Sponsored</p>
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
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
            <TightPill text={headline} isDark={isDarkImage} fontSize="26px" />
          </div>
        </div>
        <div className="flex items-center gap-4 px-3 py-2 text-[var(--color-dark)]">
          <Heart size={20} /><MessageCircle size={20} /><Send size={20} /><div className="flex-1" /><Bookmark size={20} />
        </div>
        <div className="px-3 pb-3">
          <p style={{ fontSize: '12px', color: 'var(--color-dark)' }}>
            <span style={{ fontWeight: 900 }}>{facilityName.toLowerCase().replace(/\s+/g, '')} </span>
            <span style={{ fontWeight: 700 }}>{primaryText}</span>
          </p>
          {description && <p style={{ fontSize: '10px', color: 'var(--color-mid-gray)', marginTop: '4px' }}>{description}</p>}
          <div className="mt-2">
            <span className="inline-block bg-[#8C2332] px-3 py-1 rounded" style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 900 }}>{cta}</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'facebook_feed') {
    return (
      <div data-ad-mockup="true" className="w-full max-w-[400px] rounded-xl overflow-hidden shadow-2xl bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-[#8C2332] rounded-full flex items-center justify-center" style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 900 }}>SA</div>
          <div className="flex-1">
            <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-dark)' }}>{facilityName}</p>
            <p style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Sponsored &middot; <Globe size={10} className="inline" /></p>
          </div>
          <MoreHorizontal size={18} className="text-[var(--color-mid-gray)]" />
        </div>
        <div className="px-3 pb-2"><p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-dark)', fontFamily: 'var(--font-ad-body)' }}>{primaryText}</p></div>
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
          <p style={{ fontSize: '10px', textTransform: 'uppercase' as const, color: 'var(--color-mid-gray)' }}>storageads.com</p>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-dark)', fontFamily: 'var(--font-ad-headline)' }} className="truncate">{headline}</p>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-mid-gray)', fontFamily: 'var(--font-ad-body)' }} className="truncate">{description}</p>
        </div>
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button className="px-4 py-1.5 rounded bg-[var(--color-light-gray)]" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--color-dark)', fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          <div className="flex gap-4" style={{ color: 'var(--color-mid-gray)', fontSize: '12px', fontWeight: 700 }}>
            <span>Like</span><span>Comment</span><span>Share</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'google_display') {
    return (
      <div data-ad-mockup="true" className="w-full max-w-[300px] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-2xl bg-[var(--bg-elevated)]">
        <div className="w-full h-[150px] bg-[var(--color-light-gray)] relative">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-light)]">
              <ImageIcon size={24} className="text-[var(--color-mid-gray)]" />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-yellow-400 rounded px-1" style={{ color: '#050505', fontSize: '8px', fontWeight: 900 }}>Ad</div>
        </div>
        <div className="p-3 space-y-1.5">
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-dark)', fontFamily: 'var(--font-ad-headline)', lineHeight: 1.3 }}>{headline}</p>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-mid-gray)' }} className="line-clamp-2">{description || primaryText}</p>
          <div className="flex items-center justify-between pt-1">
            <span style={{ fontSize: '10px', color: 'var(--color-mid-gray)' }}>{facilityName}</span>
            <button className="bg-[#2C3E6B] px-3 py-1 rounded" style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-ad-headline)' }}>{cta}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
