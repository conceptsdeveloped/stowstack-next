'use client'

import {
  Eye, Layers, Building2, DollarSign, Users, ShieldAlert, ArrowRight,
} from 'lucide-react'
import {
  SectionHeader, StackedBar, INSIGHT_STYLES,
  money, pct,
} from './shared'
import type {
  FacilityLevel, GapDecomposition, AgingBuckets,
  DiscountedTenant, BelowStreetBand, Insight,
} from './shared'

export function InsightsSection({
  insights, expanded, onToggle,
}: {
  insights: Insight[]
  expanded: boolean
  onToggle: () => void
}) {
  if (insights.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<Eye size={18} className="text-indigo-500" />}
        title="Occupancy Insights"
        subtitle={`${insights.length} insight${insights.length !== 1 ? 's' : ''} generated from your data`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-3">
          {insights.map((ins, i) => {
            const style = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info
            const Icon = style.icon
            return (
              <div key={i} className={`rounded-lg p-4 border ${style.bg} ${style.border}`}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`${style.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-dark)]">{ins.title}</p>
                    <p className="text-xs mt-1 text-[var(--color-body-text)]">{ins.detail}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function GapDecompositionSection({
  fl, gd, ab, discTenants, bands, expanded, onToggle,
}: {
  fl: FacilityLevel
  gd: GapDecomposition
  ab: AgingBuckets
  discTenants: DiscountedTenant[]
  bands: { slight: BelowStreetBand; moderate: BelowStreetBand; severe: BelowStreetBand }
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<Layers size={18} className="text-amber-500" />}
        title="Gap Decomposition"
        subtitle={`${money(gd.total_drag)}/mo total revenue drag \u2014 why economic trails physical by ${fl.occupancy_gap}pts`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-5">
          {/* Visual waterfall */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-3">Revenue Drag Breakdown</p>
            <StackedBar
              height={36}
              segments={[
                { value: gd.vacancy_loss, color: 'bg-red-500', label: `Vacancy ${money(gd.vacancy_loss)}` },
                { value: gd.rate_gap_loss, color: 'bg-amber-500', label: `Rate Gap ${money(gd.rate_gap_loss)}` },
                { value: gd.discount_drag, color: 'bg-orange-400', label: `Discounts ${money(gd.discount_drag)}` },
                { value: gd.delinquency_drag, color: 'bg-purple-500', label: `Delinquency ${money(gd.delinquency_drag)}` },
              ]}
            />
          </div>

          {/* Detailed cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg p-4 border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-red-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Vacancy</span>
              </div>
              <p className="text-2xl font-semibold text-red-500">{money(gd.vacancy_loss)}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.vacancy_drag_pct)} of potential</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{fl.vacant_units} empty units at street rate</p>
            </div>

            <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Rate Gap</span>
              </div>
              <p className="text-2xl font-semibold text-amber-500">{money(gd.rate_gap_loss)}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.rate_gap_drag_pct)} of potential</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">
                {bands.severe.count > 0 && <span className="text-red-500 font-medium">{bands.severe.count} severe</span>}
                {bands.severe.count > 0 && bands.moderate.count > 0 && ' \u00b7 '}
                {bands.moderate.count > 0 && <span className="text-amber-500 font-medium">{bands.moderate.count} moderate</span>}
                {(bands.severe.count > 0 || bands.moderate.count > 0) && bands.slight.count > 0 && ' \u00b7 '}
                {bands.slight.count > 0 && <span>{bands.slight.count} slight</span>}
                {bands.severe.count === 0 && bands.moderate.count === 0 && bands.slight.count === 0 && 'No below-street tenants'}
              </p>
            </div>

            <div className="rounded-lg p-4 border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-orange-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">Discounts</span>
              </div>
              <p className="text-2xl font-semibold text-orange-500">{money(gd.discount_drag)}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.discount_drag_pct)} of potential</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{discTenants.length} tenants with active discounts</p>
            </div>

            <div className="rounded-lg p-4 border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={16} className="text-purple-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-purple-400">Delinquency</span>
              </div>
              <p className="text-2xl font-semibold text-purple-500">{money(gd.delinquency_drag)}</p>
              <p className="text-xs text-[var(--color-mid-gray)]">/mo &middot; {pct(gd.delinquency_drag_pct)} of potential</p>
              <p className="text-xs mt-2 text-[var(--color-mid-gray)]">{ab.count} delinquent accounts</p>
            </div>
          </div>

          {/* Revenue bridge */}
          <div className="rounded-lg p-4 bg-[var(--color-light-gray)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)] mb-3">Revenue Bridge</p>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-semibold text-[var(--color-dark)]">{money(fl.gross_potential)}</span>
              <span className="text-[var(--color-mid-gray)]">Potential</span>
              <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
              <span className="font-semibold text-red-500">-{money(gd.vacancy_loss)}</span>
              <span className="text-[var(--color-mid-gray)]">Vacancy</span>
              <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
              <span className="font-semibold text-amber-500">-{money(gd.rate_gap_loss)}</span>
              <span className="text-[var(--color-mid-gray)]">Rate Gap</span>
              <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
              <span className="font-semibold text-orange-500">-{money(gd.discount_drag)}</span>
              <span className="text-[var(--color-mid-gray)]">Discounts</span>
              <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
              <span className="font-semibold text-purple-500">-{money(gd.delinquency_drag)}</span>
              <span className="text-[var(--color-mid-gray)]">Delinquency</span>
              <ArrowRight size={14} className="text-[var(--color-mid-gray)]" />
              <span className="font-semibold text-emerald-500">{money(fl.actual_revenue)}</span>
              <span className="text-[var(--color-mid-gray)]">Collected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
