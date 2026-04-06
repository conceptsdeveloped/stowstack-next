'use client'

import {
  ImageIcon, MoreHorizontal, Heart, MessageCircle, Bookmark, Globe, Send,
} from 'lucide-react'
import type { AdFormat } from './types'

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
