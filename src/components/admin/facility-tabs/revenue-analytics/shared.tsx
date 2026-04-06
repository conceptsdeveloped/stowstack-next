'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'

export function money(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return '$' + Math.round(val).toLocaleString()
}

export function pct(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return val.toFixed(1) + '%'
}

export const RATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  premium: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Premium' },
  above: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Above Street' },
  neutral: { bg: 'bg-[var(--color-light-gray)]', text: 'text-[var(--color-body-text)]', label: 'At Street' },
  below: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Below Street' },
  underpriced: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Underpriced' },
}

export const OCC_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  full: { bg: 'bg-[var(--color-blue)]/10', text: 'text-[var(--color-blue)]', label: 'Near Full' },
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Healthy' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Low' },
}

export function Badge({ signal, map }: { signal: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[signal] || map.neutral || { bg: 'bg-[var(--color-light-gray)]', text: 'text-[var(--color-body-text)]', label: signal }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

export function SectionHeader({ icon, title, subtitle, expanded, onToggle, rightContent }: {
  icon: React.ReactNode; title: string; subtitle: string
  expanded: boolean; onToggle: () => void; rightContent?: React.ReactNode
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold text-[var(--color-dark)]">{title}</h3>
          <p className="text-xs text-[var(--color-mid-gray)]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        {expanded ? <ChevronUp size={18} className="text-[var(--color-mid-gray)]" /> : <ChevronDown size={18} className="text-[var(--color-mid-gray)]" />}
      </div>
    </button>
  )
}
