import type React from "react"

export interface Asset {
  id: string
  url: string
  type: string
  label?: string
}

export interface VideoTemplate {
  id: string
  name: string
  description: string
  mode: 'text_to_video' | 'image_to_video'
}

export interface GenerationJob {
  taskId: string
  templateId: string
  templateName: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  videoUrl: string | null
  error: string | null
  prompt: string
  imageUrl: string | null
  startedAt: number
  provider: 'fal'
  statusUrl: string | null
  responseUrl: string | null
}

export interface StylePreset {
  id: string
  name: string
}

export interface TextLayer {
  text: string
  style: 'headline' | 'subhead' | 'cta' | 'minimal'
  position: 'top' | 'center' | 'bottom'
  enterAt: number
  exitAt: number
  animation: 'slide-up' | 'fade' | 'typewriter' | 'cut'
}

export const TEMPLATE_ICONS: Record<string, React.ReactNode> = {}

export const TEMPLATE_PREVIEWS: Record<string, string> = {
  facility_showcase: 'Cinematic camera push through clean hallways of storage units. No people, pure facility footage.',
  hero_shot: 'Beautiful wide establishing shot of a storage facility exterior at golden hour. No people.',
  seasonal_promo: 'Dynamic transformation from cluttered space to organized storage. No dialogue, pure visual.',
  quick_cta: 'Dramatic gate-opening reveal of a pristine storage facility. 5 seconds, high impact.',
  packing_asmr: 'Satisfying overhead shot of hands packing and labeling boxes. No face, just hands. ASMR style.',
  before_after: 'Smooth morph from messy garage to perfectly organized storage unit. No people.',
  custom: 'Write exactly what you want to see. Describe the scene, camera movement, lighting, and subjects in detail.',
}

export const DEFAULT_LAYERS: TextLayer[] = [
  { text: '', style: 'headline', position: 'center', enterAt: 0.05, exitAt: 0.5, animation: 'slide-up' },
  { text: '', style: 'cta', position: 'bottom', enterAt: 0.55, exitAt: 0.95, animation: 'fade' },
]

export const STYLE_OPTIONS: { id: TextLayer['style']; label: string }[] = [
  { id: 'headline', label: 'Headline' },
  { id: 'subhead', label: 'Subhead' },
  { id: 'cta', label: 'CTA' },
  { id: 'minimal', label: 'Minimal' },
]

export const ANIM_OPTIONS: { id: TextLayer['animation']; label: string }[] = [
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'fade', label: 'Fade In' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'cut', label: 'Hard Cut' },
]

export const POSITION_OPTIONS: { id: TextLayer['position']; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' },
]
