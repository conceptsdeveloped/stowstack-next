'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Plus, RefreshCw, Zap, Users, MessageSquare,
  Mail, Smartphone, ChevronDown, ChevronUp, Pause, Play,
  SkipForward, UserCheck, Trash2, Clock,
  CheckCircle2, AlertCircle, Send, X,
} from 'lucide-react'

/* ── Types ── */

interface NurtureStep {
  step_number: number
  delay_minutes: number
  channel: 'sms' | 'email'
  subject: string | null
  body: string
  send_window: { start: string; end: string } | null
}

interface NurtureSequence {
  id: string
  facility_id: string
  name: string
  trigger_type: string
  status: 'active' | 'paused' | 'archived'
  steps: NurtureStep[] | string
  exit_conditions: string[]
  created_at: string
  updated_at: string
}

interface NurtureEnrollment {
  id: string
  sequence_id: string
  facility_id: string
  lead_id: string | null
  tenant_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'converted' | 'unsubscribed' | 'failed'
  enrolled_at: string
  next_send_at: string | null
  completed_at: string | null
  exit_reason: string | null
  metadata: Record<string, unknown>
}

interface NurtureMessage {
  id: string
  enrollment_id: string
  step_number: number
  channel: 'sms' | 'email'
  to_address: string
  subject: string | null
  body: string
  status: string
  external_id: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  error_message: string | null
  created_at: string
}

interface SequenceTemplate {
  key: string
  name: string
  trigger_type: string
  stepCount: number
}

interface NurtureStats {
  totalSequences: number
  activeEnrollments: number
  converted: number
  totalMessages: number
  smsSent: number
  emailSent: number
  deliveryRate: number
}

/* ── Constants ── */

const TRIGGER_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  landing_page_abandon: { label: 'Landing Page Abandon', icon: '\u{1F6AA}', color: 'text-orange-500' },
  reservation_abandon: { label: 'Reservation Abandon', icon: '\u{1F6D2}', color: 'text-red-500' },
  post_move_in: { label: 'Post Move-In', icon: '\u{1F3E0}', color: 'text-emerald-500' },
  win_back: { label: 'Win-Back', icon: '\u{1F504}', color: 'text-[var(--color-blue)]' },
  post_audit: { label: 'Post Audit', icon: '\u{1F4CB}', color: 'text-violet-500' },
  custom: { label: 'Custom', icon: '\u{2699}\u{FE0F}', color: 'text-[var(--color-body-text)]' },
}

const CHANNEL_CONFIG = {
  sms: { label: 'SMS', color: 'text-green-500', bg: 'bg-green-500/10' },
  email: { label: 'Email', color: 'text-[var(--color-blue)]', bg: 'bg-[var(--color-blue)]/10' },
} as const

const STATUS_CONFIG = {
  active: { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  paused: { label: 'Paused', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  completed: { label: 'Completed', bg: 'bg-[var(--color-blue)]/10', text: 'text-[var(--color-blue)]' },
  converted: { label: 'Converted', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  unsubscribed: { label: 'Unsubscribed', bg: 'bg-[var(--color-mid-gray)]/10', text: 'text-[var(--color-mid-gray)]' },
  failed: { label: 'Failed', bg: 'bg-red-500/10', text: 'text-red-400' },
  archived: { label: 'Archived', bg: 'bg-[var(--color-mid-gray)]/10', text: 'text-[var(--color-mid-gray)]' },
} as const

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) return `${Math.round(minutes / 60)}hr`
  return `${Math.round(minutes / 1440)}d`
}

function parseSteps(steps: NurtureStep[] | string): NurtureStep[] {
  return typeof steps === 'string' ? JSON.parse(steps) : steps
}

/* ── Sub-components ── */

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)]">{label}</p>
      <p className={`text-lg font-bold ${accent || 'text-[var(--color-dark)]'}`}>{value}</p>
    </div>
  )
}

type SubView = 'sequences' | 'enrollments' | 'messages'

/* ── Main Component ── */

export default function LeadNurtureEngine({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [templates, setTemplates] = useState<SequenceTemplate[]>([])
  const [sequences, setSequences] = useState<NurtureSequence[]>([])
  const [enrollments, setEnrollments] = useState<NurtureEnrollment[]>([])
  const [messages, setMessages] = useState<NurtureMessage[]>([])
  const [stats, setStats] = useState<NurtureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subView, setSubView] = useState<SubView>('sequences')
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null)
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' })

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/nurture-sequences?facilityId=${facilityId}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTemplates(data.templates || [])
      setSequences(data.sequences || [])
      setEnrollments(data.enrollments || [])
      setMessages(data.recentMessages || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nurture data')
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  async function createFromTemplate(templateKey: string) {
    try {
      const res = await fetch('/api/nurture-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'create_from_template', facilityId, templateKey }),
      })
      if (!res.ok) throw new Error('Failed to create sequence from template')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence from template')
    }
  }

  async function enrollLead(sequenceId: string) {
    if (!enrollForm.email && !enrollForm.phone) {
      setError('Email or phone required')
      return
    }
    try {
      const res = await fetch('/api/nurture-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          action: 'enroll',
          sequenceId,
          facilityId,
          contactName: enrollForm.name,
          contactEmail: enrollForm.email,
          contactPhone: enrollForm.phone,
        }),
      })
      if (!res.ok) throw new Error('Failed to enroll lead')
      setShowEnrollModal(null)
      setEnrollForm({ name: '', email: '', phone: '' })
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll lead')
    }
  }

  async function updateEnrollment(enrollmentId: string, action: string) {
    try {
      const res = await fetch('/api/nurture-sequences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ enrollmentId, action }),
      })
      if (!res.ok) throw new Error(`Failed to ${action} enrollment`)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} enrollment`)
    }
  }

  async function deleteItem(id: string, type: 'sequence' | 'enrollment') {
    if (!confirm(`Delete this ${type}?`)) return
    try {
      const res = await fetch(`/api/nurture-sequences?id=${id}&type=${type}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to delete ${type}`)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${type}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-gold)]" />
        <span className="ml-3 text-[var(--color-body-text)]">Loading nurture engine...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-dark)]">Lead Nurture Engine</h2>
            <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
              Automated SMS + email follow-up sequences for leads and tenants
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--color-light-gray)] transition-colors"
          >
            <RefreshCw size={14} className="text-[var(--color-body-text)]" />
          </button>
        </div>
      </div>

      {/* Metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          <MetricCard label="Sequences" value={String(stats.totalSequences)} />
          <MetricCard label="Active" value={String(stats.activeEnrollments)} accent="text-emerald-500" />
          <MetricCard label="Converted" value={String(stats.converted)} accent="text-[var(--color-gold)]" />
          <MetricCard label="Messages" value={String(stats.totalMessages)} />
          <MetricCard label="SMS Sent" value={String(stats.smsSent)} accent="text-green-500" />
          <MetricCard label="Emails Sent" value={String(stats.emailSent)} accent="text-[var(--color-gold)]" />
          <MetricCard
            label="Delivery"
            value={`${stats.deliveryRate}%`}
            accent={stats.deliveryRate > 80 ? 'text-emerald-500' : 'text-amber-500'}
          />
        </div>
      )}

      {/* Sub-view tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)]">
        {([
          ['sequences', 'Sequences', Zap],
          ['enrollments', `Enrollments (${enrollments.filter(e => e.status === 'active').length})`, Users],
          ['messages', `Message Log (${messages.length})`, MessageSquare],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubView(key as SubView)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              subView === key
                ? 'bg-[var(--color-gold)] text-[var(--color-light)] shadow-lg'
                : 'text-[var(--color-body-text)] hover:text-[var(--color-dark)]'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Sequences View ── */}
      {subView === 'sequences' && (
        <div className="space-y-4">
          {/* Template setup cards (no sequences yet) */}
          {templates.length > 0 && sequences.length === 0 && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              <h3 className="text-sm font-bold mb-3 text-[var(--color-dark)]">
                Get Started — Pick a Sequence Template
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map(t => {
                  const trigger = TRIGGER_TYPES[t.trigger_type] || { label: t.trigger_type, icon: '\u{2699}\u{FE0F}', color: 'text-[var(--color-body-text)]' }
                  return (
                    <button
                      key={t.key}
                      onClick={() => createFromTemplate(t.key)}
                      className="p-3 rounded-lg border border-[var(--border-subtle)] text-left transition-colors hover:bg-[var(--color-light-gray)]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{trigger.icon}</span>
                        <span className={`text-xs font-bold ${trigger.color}`}>{trigger.label}</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--color-dark)]">{t.name}</p>
                      <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">{t.stepCount} steps · SMS + Email</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add template buttons (when sequences exist) */}
          {sequences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {templates
                .filter(t => !sequences.find(s => s.trigger_type === t.trigger_type))
                .map(t => (
                  <button
                    key={t.key}
                    onClick={() => createFromTemplate(t.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-xs font-medium hover:bg-[var(--color-gold)]/80 transition-colors"
                  >
                    <Plus size={12} /> Add {t.name}
                  </button>
                ))}
            </div>
          )}

          {/* Sequence cards */}
          {sequences.map(seq => {
            const trigger = TRIGGER_TYPES[seq.trigger_type] || { label: seq.trigger_type, icon: '\u{2699}\u{FE0F}', color: 'text-[var(--color-body-text)]' }
            const seqEnrollments = enrollments.filter(e => e.sequence_id === seq.id)
            const activeCount = seqEnrollments.filter(e => e.status === 'active').length
            const steps = parseSteps(seq.steps)
            const isExpanded = expandedSeq === seq.id
            const seqStatus = STATUS_CONFIG[seq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active

            return (
              <div key={seq.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
                {/* Sequence header */}
                <button
                  onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <span className="text-lg">{trigger.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-[var(--color-dark)]">{seq.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${seqStatus.bg} ${seqStatus.text}`}>
                        {seqStatus.label}
                      </span>
                      <span className="text-xs text-[var(--color-mid-gray)]">{steps.length} steps</span>
                    </div>
                    <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
                      {activeCount} active · {seqEnrollments.filter(e => e.status === 'converted').length} converted
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEnrollModal(seq.id) }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-xs font-medium hover:bg-[var(--color-gold)]/80"
                  >
                    <Plus size={12} /> Enroll
                  </button>
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-mid-gray)]" /> : <ChevronDown size={16} className="text-[var(--color-mid-gray)]" />}
                </button>

                {/* Expanded: step timeline + enrollments */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
                    {/* Step timeline */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-mid-gray)]">
                        Sequence Steps
                      </h4>
                      <div className="space-y-2">
                        {steps.map((step, i) => {
                          const ch = CHANNEL_CONFIG[step.channel]
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full ${ch.bg} flex items-center justify-center text-xs`}>
                                  {step.channel === 'sms'
                                    ? <Smartphone size={12} className={ch.color} />
                                    : <Mail size={12} className={ch.color} />}
                                </div>
                                {i < steps.length - 1 && (
                                  <div className="w-px h-6 bg-[var(--color-light-gray)]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${ch.color}`}>{ch.label}</span>
                                  <span className="text-xs text-[var(--color-mid-gray)]">after {formatDelay(step.delay_minutes)}</span>
                                  {step.send_window && (
                                    <span className="text-xs text-[var(--color-mid-gray)]">
                                      ({step.send_window.start}-{step.send_window.end})
                                    </span>
                                  )}
                                </div>
                                {step.subject && (
                                  <p className="text-xs font-medium text-[var(--color-dark)] mt-0.5">{step.subject}</p>
                                )}
                                <p className="text-xs text-[var(--color-mid-gray)] mt-0.5 line-clamp-2">
                                  {step.body.slice(0, 120)}...
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Enrollments for this sequence */}
                    {seqEnrollments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--color-mid-gray)]">
                          Enrollments ({seqEnrollments.length})
                        </h4>
                        <div className="space-y-1">
                          {seqEnrollments.map(e => {
                            const eStatus = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
                            return (
                              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-light-gray)]">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[var(--color-dark)]">
                                      {e.contact_name || e.contact_email || e.contact_phone || 'Unknown'}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${eStatus.bg} ${eStatus.text}`}>
                                      {eStatus.label}
                                    </span>
                                    <span className="text-[10px] text-[var(--color-mid-gray)]">
                                      Step {e.current_step + 1}/{steps.length}
                                    </span>
                                  </div>
                                  {e.next_send_at && e.status === 'active' && (
                                    <p className="text-[10px] text-[var(--color-mid-gray)] flex items-center gap-1 mt-0.5">
                                      <Clock size={9} /> Next: {new Date(e.next_send_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {e.status === 'active' && (
                                    <>
                                      <button onClick={() => updateEnrollment(e.id, 'pause')} className="p-1 rounded hover:bg-[var(--color-light-gray)]" title="Pause">
                                        <Pause size={12} className="text-amber-500" />
                                      </button>
                                      <button onClick={() => updateEnrollment(e.id, 'skip')} className="p-1 rounded hover:bg-[var(--color-light-gray)]" title="Skip step">
                                        <SkipForward size={12} className="text-[var(--color-body-text)]" />
                                      </button>
                                      <button onClick={() => updateEnrollment(e.id, 'convert')} className="p-1 rounded hover:bg-[var(--color-light-gray)]" title="Mark converted">
                                        <UserCheck size={12} className="text-emerald-500" />
                                      </button>
                                    </>
                                  )}
                                  {e.status === 'paused' && (
                                    <button onClick={() => updateEnrollment(e.id, 'resume')} className="p-1 rounded hover:bg-[var(--color-light-gray)]" title="Resume">
                                      <Play size={12} className="text-emerald-500" />
                                    </button>
                                  )}
                                  <button onClick={() => deleteItem(e.id, 'enrollment')} className="p-1 rounded hover:bg-[var(--color-light-gray)]" title="Remove">
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delete sequence */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteItem(seq.id, 'sequence')}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete this sequence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty state */}
          {sequences.length === 0 && templates.length === 0 && (
            <div className="text-center py-10">
              <Zap size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
              <p className="font-medium text-[var(--color-dark)]">No sequences configured</p>
              <p className="text-sm text-[var(--color-body-text)] mt-1">
                Sequence templates will appear here once the nurture engine is set up.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Enrollments View ── */}
      {subView === 'enrollments' && (
        <div className="space-y-2">
          {enrollments.length === 0 ? (
            <div className="text-center py-10">
              <Users size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
              <p className="font-medium text-[var(--color-dark)]">No enrollments yet</p>
              <p className="text-sm text-[var(--color-body-text)] mt-1">
                Create a sequence and enroll leads to start nurturing
              </p>
            </div>
          ) : (
            enrollments.map(e => {
              const seq = sequences.find(s => s.id === e.sequence_id)
              const eStatus = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
              const steps = seq ? parseSteps(seq.steps) : []
              return (
                <div key={e.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--color-dark)]">
                          {e.contact_name || e.contact_email || e.contact_phone}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${eStatus.bg} ${eStatus.text}`}>
                          {eStatus.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-mid-gray)]">
                        <span>{seq?.name || 'Unknown sequence'}</span>
                        <span>&middot;</span>
                        <span>Step {e.current_step + 1}/{steps.length || '?'}</span>
                        {e.contact_email && <span>&middot; {e.contact_email}</span>}
                        {e.contact_phone && <span>&middot; {e.contact_phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {e.status === 'active' && (
                        <>
                          <button onClick={() => updateEnrollment(e.id, 'pause')} className="p-1.5 rounded-lg hover:bg-[var(--color-light-gray)]">
                            <Pause size={14} className="text-amber-500" />
                          </button>
                          <button onClick={() => updateEnrollment(e.id, 'convert')} className="p-1.5 rounded-lg hover:bg-[var(--color-light-gray)]">
                            <UserCheck size={14} className="text-emerald-500" />
                          </button>
                        </>
                      )}
                      {e.status === 'paused' && (
                        <button onClick={() => updateEnrollment(e.id, 'resume')} className="p-1.5 rounded-lg hover:bg-[var(--color-light-gray)]">
                          <Play size={14} className="text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Messages View ── */}
      {subView === 'messages' && (
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare size={32} className="mx-auto mb-3 text-[var(--color-mid-gray)]" />
              <p className="font-medium text-[var(--color-dark)]">No messages sent yet</p>
              <p className="text-sm text-[var(--color-body-text)] mt-1">
                Messages will appear here as sequences run
              </p>
            </div>
          ) : (
            messages.map(m => {
              const ch = CHANNEL_CONFIG[m.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.email
              const isFailed = m.status === 'failed' || m.status === 'bounced'
              return (
                <div key={m.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full ${ch.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {m.channel === 'sms'
                        ? <Smartphone size={12} className={ch.color} />
                        : <Mail size={12} className={ch.color} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${ch.color}`}>{ch.label}</span>
                        <span className="text-xs text-[var(--color-mid-gray)]">to {m.to_address}</span>
                        <span className="text-xs text-[var(--color-mid-gray)]">&middot; Step {m.step_number + 1}</span>
                        {isFailed ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-1">
                            <AlertCircle size={9} /> {m.status}
                          </span>
                        ) : m.status === 'sent' || m.status === 'delivered' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={9} /> {m.status}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)] flex items-center gap-1">
                            <Send size={9} /> {m.status}
                          </span>
                        )}
                      </div>
                      {m.subject && (
                        <p className="text-xs font-medium text-[var(--color-dark)] mt-0.5">{m.subject}</p>
                      )}
                      <p className="text-xs text-[var(--color-mid-gray)] mt-0.5 line-clamp-2">
                        {m.body.slice(0, 150)}
                      </p>
                      {m.error_message && (
                        <p className="text-xs text-red-400 mt-0.5">{m.error_message}</p>
                      )}
                      {m.sent_at && (
                        <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">
                          {new Date(m.sent_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Enroll Modal ── */}
      {showEnrollModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowEnrollModal(null)}
        >
          <div
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <h3 className="font-bold text-[var(--color-dark)]">Enroll Lead in Sequence</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-mid-gray)]">Name</label>
                  <input
                    value={enrollForm.name}
                    onChange={e => setEnrollForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-mid-gray)]">Email</label>
                  <input
                    value={enrollForm.email}
                    onChange={e => setEnrollForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
                    placeholder="john@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-mid-gray)]">Phone (for SMS)</label>
                  <input
                    value={enrollForm.phone}
                    onChange={e => setEnrollForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
                    placeholder="+1234567890"
                    type="tel"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => enrollLead(showEnrollModal)}
                  className="flex-1 px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] rounded-xl text-sm font-medium hover:bg-[var(--color-gold)]/80"
                >
                  Enroll
                </button>
                <button
                  onClick={() => setShowEnrollModal(null)}
                  className="px-4 py-2.5 border border-[var(--border-subtle)] rounded-xl text-sm font-medium text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
