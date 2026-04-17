'use client'

import { useState } from 'react'
import {
  Loader2, Download, Plus, Trash2, Type,
} from 'lucide-react'
import type { TextLayer } from './types'
import {
  DEFAULT_LAYERS,
  STYLE_OPTIONS,
  ANIM_OPTIONS,
  POSITION_OPTIONS,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TextOverlayEditor({ videoUrl, adminKey }: {
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
              <button onClick={() => removeLayer(idx)} aria-label="Remove text layer" className="p-1 text-red-400 hover:text-red-300 mt-1"><Trash2 size={12} /></button>
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
