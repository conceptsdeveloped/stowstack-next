'use client'

import { useState, useRef } from 'react'
import {
  Sparkles, Copy, Check, Smartphone, Layout,
} from 'lucide-react'
import type { AdFormat, AdVariation, MetaAdContent, GenerationJob, Asset, FunnelConfig, StudioStep } from './types'
import { AD_FORMATS, STATUS_BADGE } from './types'
import { AdMockup } from './ad-mockup'
import { FunnelTest } from './funnel-test'

export function PreviewStep({
  variations,
  selectedVariation,
  onSelectVariation,
  selectedCopy,
  selectedImage,
  onSelectImage,
  facilityName,
  adminKey,
  jobs,
  assets,
  onSetStep,
  onVariationsChange,
}: {
  variations: AdVariation[]
  selectedVariation: AdVariation | null
  onSelectVariation: (v: AdVariation) => void
  selectedCopy: Record<string, string>
  selectedImage: string | null
  onSelectImage: (url: string) => void
  facilityName: string
  adminKey: string
  jobs: GenerationJob[]
  assets: Asset[]
  onSetStep: (s: StudioStep) => void
  onVariationsChange: (updater: (prev: AdVariation[]) => AdVariation[]) => void
}) {
  const [activeFormat, setActiveFormat] = useState<AdFormat>('instagram_post')
  const [copied, setCopied] = useState(false)
  const [previewMode, setPreviewMode] = useState<'mockup' | 'funnel'>('mockup')
  const previewRef = useRef<HTMLDivElement>(null)

  function handleCopyPreview() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
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
              facilityName={facilityName}
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
                    onClick={() => onSelectVariation(v)}
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
                onClick={() => onSetStep('image')}
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
                  onClick={() => onSelectImage(job.imageUrl!)}
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
                  onClick={() => onSelectImage(img.url)}
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
            facilityName={facilityName}
            variationId={selectedVariation?.id || null}
            adminKey={adminKey}
            savedConfig={selectedVariation?.funnel_config || null}
            onSave={(config: FunnelConfig) => {
              if (selectedVariation) {
                onVariationsChange(prev => prev.map(v =>
                  v.id === selectedVariation.id ? { ...v, funnel_config: config } as AdVariation : v
                ))
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
