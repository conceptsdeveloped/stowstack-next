'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Edit3 } from 'lucide-react'
import type { VideoTemplate, Asset, StylePreset } from './types'
import { TEMPLATE_PREVIEWS } from './types'

interface GenerationControlsProps {
  activeTemplate: VideoTemplate
  assets: Asset[]
  styles: StylePreset[]
  selectedImage: string | null
  onSelectImage: (url: string) => void
  selectedStyle: string
  onSelectStyle: (style: string) => void
  customNotes: string
  onCustomNotesChange: (notes: string) => void
  promptOverride: string
  onPromptOverrideChange: (prompt: string) => void
  generating: boolean
  onGenerate: () => void
}

export default function GenerationControls({
  activeTemplate,
  assets,
  styles,
  selectedImage,
  onSelectImage,
  selectedStyle,
  onSelectStyle,
  customNotes,
  onCustomNotesChange,
  promptOverride,
  onPromptOverrideChange,
  generating,
  onGenerate,
}: GenerationControlsProps) {
  const [showPromptEditor, setShowPromptEditor] = useState(
    activeTemplate.id === 'custom'
  )

  return (
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
                  onClick={() => onSelectImage(a.url)}
                  className={`relative h-14 rounded-lg overflow-hidden transition-all ${
                    selectedImage === a.url ? 'ring-2 ring-[var(--color-gold)]' : 'hover:ring-1 hover:ring-white/20'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  onClick={() => onSelectStyle(style.id)}
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
            onChange={e => onCustomNotesChange(e.target.value)}
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
                onChange={e => onPromptOverrideChange(e.target.value)}
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
          onClick={onGenerate}
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
  )
}
