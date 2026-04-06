'use client'

import { useState } from 'react'
import {
  Loader2, Download, Sparkles,
  RefreshCw, Edit3, Copy, Play,
  Building2, Sunrise, PartyPopper, Zap, Package, Star, Pencil,
} from 'lucide-react'
import type { GenerationJob } from './types'
import TextOverlayEditor from './text-overlay-editor'
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

interface JobListProps {
  jobs: GenerationJob[]
  adminKey: string
  generating: boolean
  onRetry: (job: GenerationJob) => void
  onRegenerateWithPrompt: (job: GenerationJob, editedPrompt: string) => void
}

export default function JobList({
  jobs,
  adminKey,
  generating,
  onRetry,
  onRegenerateWithPrompt,
}: JobListProps) {
  const [editingJobPrompt, setEditingJobPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')

  if (jobs.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--color-dark)] mb-3">Generated Videos</h4>
      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.taskId} className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
            <div className="flex items-start gap-3">
              {/* Template icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                job.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400' :
                job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                'bg-[var(--color-light-gray)] text-[var(--color-body-text)]'
              }`}>
                {TEMPLATE_ICONS[job.templateId] || <Play size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-dark)]">{job.templateName}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    job.status === 'SUCCEEDED' ? 'bg-emerald-500/20 text-emerald-400' :
                    job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {job.status === 'PENDING' || job.status === 'RUNNING' ? 'Generating...' : (job.status || 'pending').toLowerCase()}
                  </span>
                </div>

                {/* Pending/Running state */}
                {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin text-[var(--color-gold)]" />
                      <p className="text-xs text-[var(--color-mid-gray)]">
                        AI is generating your video...
                      </p>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--color-light-gray)]">
                      <div
                        className="h-full bg-[var(--color-gold)] rounded-full animate-pulse"
                        style={{ width: job.status === 'RUNNING' ? '60%' : '20%', transition: 'width 2s ease' }}
                      />
                    </div>
                  </div>
                )}

                {/* Success state */}
                {job.status === 'SUCCEEDED' && job.videoUrl && (
                  <div className="mt-3 space-y-3">
                    <video
                      src={job.videoUrl}
                      controls
                      className="w-full max-w-sm rounded-lg border border-[var(--border-subtle)]"
                      preload="metadata"
                    />
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={job.videoUrl}
                        download={`video-${job.templateId}-${job.taskId}.mp4`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors"
                      >
                        <Download size={12} /> Download Raw
                      </a>
                      <button
                        onClick={() => {
                          setEditingJobPrompt(job.taskId)
                          setEditedPrompt(job.prompt)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                      >
                        <RefreshCw size={12} /> Regenerate
                      </button>
                      <button
                        onClick={() => { if (navigator.clipboard && job.videoUrl) navigator.clipboard.writeText(job.videoUrl) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                      >
                        <Copy size={12} /> Copy URL
                      </button>
                    </div>

                    {/* Text Overlay Editor */}
                    <TextOverlayEditor
                      videoUrl={job.videoUrl}
                      adminKey={adminKey}
                    />
                  </div>
                )}

                {/* Failed state */}
                {job.status === 'FAILED' && (
                  <div className="mt-2 space-y-2">
                    <div className="p-2 rounded text-xs bg-red-500/10 text-red-300">
                      {job.error || 'Generation failed. Please try again.'}
                    </div>
                    {job.prompt && (
                      <button
                        onClick={() => {
                          setEditingJobPrompt(job.taskId)
                          setEditedPrompt(job.prompt)
                        }}
                        className="flex items-center gap-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                      >
                        <Edit3 size={11} /> Edit prompt and retry
                      </button>
                    )}
                    <button
                      onClick={() => onRetry(job)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  </div>
                )}

                {/* Prompt viewer/editor for this job */}
                {editingJobPrompt === job.taskId ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-[var(--color-body-text)]">Edit prompt and regenerate:</label>
                    <textarea
                      value={editedPrompt}
                      onChange={e => setEditedPrompt(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onRegenerateWithPrompt(job, editedPrompt)
                          setEditingJobPrompt(null)
                          setEditedPrompt('')
                        }}
                        disabled={!editedPrompt.trim() || generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
                      >
                        <Sparkles size={12} /> {generating ? 'Starting...' : 'Regenerate'}
                      </button>
                      <button
                        onClick={() => { setEditingJobPrompt(null); setEditedPrompt('') }}
                        className="px-3 py-1.5 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : job.prompt ? (
                  <details className="mt-2 text-xs text-[var(--color-mid-gray)]">
                    <summary className="cursor-pointer hover:text-[var(--color-body-text)] transition-colors">View prompt</summary>
                    <p className="mt-1 p-2 rounded text-xs whitespace-pre-wrap bg-[var(--color-light-gray)] text-[var(--color-body-text)]">{job.prompt}</p>
                  </details>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
