'use client'

import { useState, useEffect } from 'react'
import {
  Layout, Pencil, ArrowDown, ArrowUp, Eye, MousePointer,
  Mail, MessageSquare,
} from 'lucide-react'
import type { FunnelConfig } from './types'
import { ARCHETYPE_FUNNELS } from './types'

/* ── Funnel Test Component ── */

export function FunnelTest({ copy, image, facilityName, variationId, adminKey, savedConfig, onSave }: {
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
            data-no-recolor="true"
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-2.5 py-1 text-[10px] rounded-lg border transition-colors ${
              showMetrics ? 'bg-[#1B4D3E] border-[#1B4D3E]' : 'border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
            }`}
            style={{ color: showMetrics ? '#FDFCFA' : '#2C2825', fontWeight: 900 }}
          >
            Metrics
          </button>
          {!editing ? (
            <button
              data-no-recolor="true"
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 text-[10px] rounded-lg border border-[var(--border-subtle)] transition-colors"
              style={{ color: '#2C2825', fontWeight: 900 }}
            >
              <Pencil size={10} className="inline mr-1" />Edit Funnel
            </button>
          ) : (
            <div className="flex gap-1">
              <button data-no-recolor="true" onClick={handleSave} disabled={saving} className="px-2.5 py-1 text-[10px] rounded-lg bg-[var(--color-gold)] disabled:opacity-40" style={{ color: '#FDFCFA', fontWeight: 900 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button data-no-recolor="true" onClick={() => setEditing(false)} className="px-2.5 py-1 text-[10px]" style={{ color: '#2C2825', fontWeight: 900 }}>Cancel</button>
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
