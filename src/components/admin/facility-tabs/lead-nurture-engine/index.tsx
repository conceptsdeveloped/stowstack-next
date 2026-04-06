'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, RefreshCw, Zap, Users, MessageSquare, X,
} from 'lucide-react'
import { SequencesView } from './sequences-view'
import { EnrollmentsView, MessagesView, EnrollModal } from './enrollments-messages-view'

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

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)]">{label}</p>
      <p className={`text-lg font-semibold ${accent || 'text-[var(--color-dark)]'}`}>{value}</p>
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
            <h2 className="text-lg font-semibold text-[var(--color-dark)]">Lead Nurture Engine</h2>
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

      {subView === 'sequences' && (
        <SequencesView
          templates={templates}
          sequences={sequences}
          enrollments={enrollments}
          expandedSeq={expandedSeq}
          setExpandedSeq={setExpandedSeq}
          createFromTemplate={createFromTemplate}
          setShowEnrollModal={setShowEnrollModal}
          updateEnrollment={updateEnrollment}
          deleteItem={deleteItem}
        />
      )}

      {subView === 'enrollments' && (
        <EnrollmentsView
          enrollments={enrollments}
          sequences={sequences}
          updateEnrollment={updateEnrollment}
        />
      )}

      {subView === 'messages' && (
        <MessagesView messages={messages} />
      )}

      {showEnrollModal && (
        <EnrollModal
          showEnrollModal={showEnrollModal}
          setShowEnrollModal={setShowEnrollModal}
          enrollForm={enrollForm}
          setEnrollForm={setEnrollForm}
          enrollLead={enrollLead}
        />
      )}
    </div>
  )
}
