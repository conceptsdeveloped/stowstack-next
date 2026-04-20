'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import type { Asset, VideoTemplate, GenerationJob, StylePreset } from './types'
import TemplateSelector from './template-selector'
import GenerationControls from './generation-controls'
import JobList from './job-list'

export default function VideoGenerator({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [configured, setConfigured] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [styles, setStyles] = useState<StylePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('none')
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [generating, setGenerating] = useState(false)

  // Load templates and assets
  useEffect(() => {
    Promise.all([
      fetch('/api/generate-video', { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([videoData, assetData]) => {
      if (videoData.templates) {
        setTemplates(videoData.templates)
        setSelectedTemplate(videoData.templates[0]?.id || null)
      }
      setConfigured(videoData.configured || false)
      if (videoData.styles) setStyles(videoData.styles)
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length) setSelectedImage(photos[0].url)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facilityId, adminKey])

  const pollFalJob = useCallback((requestId: string, app: string) => {
    const startedAt = Date.now()
    const MAX_POLL_MS = 15 * 60 * 1000 // 15-minute hard cap
    const INTERVAL_MS = 3000

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/generate-video/status?requestId=${encodeURIComponent(requestId)}&app=${encodeURIComponent(app)}`,
          { headers: { 'X-Admin-Key': adminKey } },
        )
        const data = await res.json().catch(() => ({}))
        const status = data.status as string | undefined

        if (status === 'SUCCEEDED' && data.videoUrl) {
          setJobs(prev => prev.map(j =>
            j.taskId === requestId
              ? { ...j, status: 'SUCCEEDED', videoUrl: data.videoUrl as string, error: null }
              : j,
          ))
          return
        }
        if (status === 'FAILED') {
          setJobs(prev => prev.map(j =>
            j.taskId === requestId
              ? { ...j, status: 'FAILED', error: (data.error as string) || 'FAL reported error' }
              : j,
          ))
          return
        }
        if (Date.now() - startedAt > MAX_POLL_MS) {
          setJobs(prev => prev.map(j =>
            j.taskId === requestId
              ? { ...j, status: 'FAILED', error: 'Polling timeout (15m)' }
              : j,
          ))
          return
        }
        setTimeout(tick, INTERVAL_MS)
      } catch (err) {
        // Transient network errors — keep polling until the 15m cap.
        if (Date.now() - startedAt > MAX_POLL_MS) {
          const msg = err instanceof Error ? err.message : 'status poll failed'
          setJobs(prev => prev.map(j =>
            j.taskId === requestId ? { ...j, status: 'FAILED', error: msg } : j,
          ))
          return
        }
        setTimeout(tick, INTERVAL_MS)
      }
    }

    setTimeout(tick, INTERVAL_MS)
  }, [adminKey])

  const startGeneration = useCallback(async (overridePrompt?: string, overrideImage?: string) => {
    const templateId = selectedTemplate
    if (!templateId || generating) return
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setGenerating(true)
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId,
          facilityId,
          imageUrl: template.mode === 'image_to_video' ? (overrideImage || selectedImage) : undefined,
          customNotes: customNotes.trim() || undefined,
          promptOverride: overridePrompt || promptOverride.trim() || undefined,
          stylePreset: selectedStyle !== 'none' ? selectedStyle : undefined,
        }),
      })
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`)
      }

      if (data.videoUrl) {
        // Sync path (PixVerse or before_after) — video already done.
        setJobs(prev => [{
          taskId: `sync-${Date.now()}`,
          templateId,
          templateName: template.name,
          status: 'SUCCEEDED',
          videoUrl: data.videoUrl as string,
          error: null,
          prompt: (data.prompt as string) || overridePrompt || '',
          imageUrl: overrideImage || selectedImage || null,
          startedAt: Date.now(),
          provider: 'fal',
          statusUrl: null,
          responseUrl: null,
        }, ...prev])
      } else if (data.requestId && data.app) {
        // Async path (FAL queue) — add a RUNNING job; pollFalJob below
        // watches it to completion.
        const requestId = data.requestId as string
        const app = data.app as string
        setJobs(prev => [{
          taskId: requestId,
          templateId,
          templateName: template.name,
          status: 'RUNNING',
          videoUrl: null,
          error: null,
          prompt: (data.prompt as string) || overridePrompt || '',
          imageUrl: overrideImage || selectedImage || null,
          startedAt: Date.now(),
          provider: 'fal',
          statusUrl: app,
          responseUrl: null,
        }, ...prev])
        pollFalJob(requestId, app)
      } else if (data.error) {
        setJobs(prev => [{
          taskId: `fal-${Date.now()}`,
          templateId,
          templateName: template.name,
          status: 'FAILED',
          videoUrl: null,
          error: data.error as string,
          prompt: '',
          imageUrl: null,
          startedAt: Date.now(),
          provider: 'fal',
          statusUrl: null,
          responseUrl: null,
        }, ...prev])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video generation failed'
      setJobs(prev => [{
        taskId: `err-${Date.now()}`,
        templateId: templateId!,
        templateName: template?.name || 'Unknown',
        status: 'FAILED',
        videoUrl: null,
        error: msg,
        prompt: '',
        imageUrl: null,
        startedAt: Date.now(),
        provider: 'fal',
        statusUrl: null,
        responseUrl: null,
      }, ...prev])
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplate, generating, templates, adminKey, facilityId, selectedImage, customNotes, promptOverride, selectedStyle, pollFalJob])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setPromptOverride('')
  }

  const handleRetry = (job: GenerationJob) => {
    setSelectedTemplate(job.templateId)
    startGeneration(job.prompt || undefined, job.imageUrl || undefined)
  }

  const handleRegenerateWithPrompt = (job: GenerationJob, editedPrompt: string) => {
    setSelectedTemplate(job.templateId)
    startGeneration(editedPrompt, job.imageUrl || undefined)
  }

  const activeTemplate = templates.find(t => t.id === selectedTemplate)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-dark)]">AI Video Generator</h4>
        <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">Generate professional marketing videos using AI</p>
      </div>

      <TemplateSelector
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelect={handleTemplateSelect}
      />

      {activeTemplate && (
        <GenerationControls
          activeTemplate={activeTemplate}
          assets={assets}
          styles={styles}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          customNotes={customNotes}
          onCustomNotesChange={setCustomNotes}
          promptOverride={promptOverride}
          onPromptOverrideChange={setPromptOverride}
          generating={generating}
          onGenerate={() => startGeneration()}
        />
      )}

      <JobList
        jobs={jobs}
        adminKey={adminKey}
        generating={generating}
        onRetry={handleRetry}
        onRegenerateWithPrompt={handleRegenerateWithPrompt}
      />

      {/* Empty state when no jobs */}
      {jobs.length === 0 && activeTemplate && (
        <div className="text-center py-6">
          <p className="text-xs text-[var(--color-mid-gray)]">Your generated videos will appear here</p>
        </div>
      )}
    </div>
  )
}
