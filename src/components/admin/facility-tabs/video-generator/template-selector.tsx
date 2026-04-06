'use client'

import { ImageIcon, Play, Building2, Sunrise, PartyPopper, Zap, Package, Star, Pencil } from 'lucide-react'
import type { VideoTemplate } from './types'
import type React from 'react'

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  facility_showcase: <Building2 size={18} />,
  hero_shot: <Sunrise size={18} />,
  seasonal_promo: <PartyPopper size={18} />,
  quick_cta: <Zap size={18} />,
  packing_asmr: <Package size={18} />,
  before_after: <Star size={18} />,
  custom: <Pencil size={18} />,
}

interface TemplateSelectorProps {
  templates: VideoTemplate[]
  selectedTemplate: string | null
  onSelect: (templateId: string) => void
}

export default function TemplateSelector({
  templates,
  selectedTemplate,
  onSelect,
}: TemplateSelectorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-body-text)] block mb-2">Choose a Video Type</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`text-left p-4 border rounded-xl transition-all ${
              selectedTemplate === template.id
                ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[var(--color-body-text)]">{TEMPLATE_ICONS[template.id] || <Play size={18} />}</span>
              <span className="text-sm font-semibold text-[var(--color-dark)]">{template.name}</span>
            </div>
            <p className="text-xs text-[var(--color-mid-gray)] leading-relaxed">{template.description}</p>
            {template.mode === 'image_to_video' && (
              <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)]">
                <ImageIcon size={9} className="inline mr-0.5" /> Uses facility photo
              </span>
            )}
          </button>
        ))}

        {/* Fallback if no templates loaded */}
        {templates.length === 0 && (
          <div className="col-span-full text-center py-8 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
            <Play size={24} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
            <p className="text-sm text-[var(--color-body-text)]">No templates available</p>
            <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">Check API configuration and try again</p>
          </div>
        )}
      </div>
    </div>
  )
}
