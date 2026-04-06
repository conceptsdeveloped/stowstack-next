'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Sun, Snowflake, Leaf, Flower2,
  Maximize2, ShieldAlert, SlidersHorizontal,
} from 'lucide-react'
import { money, SectionHeader } from './shared'
import type { UnitIntel, IntelSummary, SqftEntry, SeasonalEntry, AgingSummary } from './types'

/* ── Scenario Modeler ── */

function ScenarioModeler({ units, summary: s, expanded, onToggle }: {
  units: UnitIntel[]
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  const [scenVacancyFill, setScenVacancyFill] = useState(25)
  const [scenRateIncrease, setScenRateIncrease] = useState(0)
  const [scenEcriApply, setScenEcriApply] = useState(100)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<SlidersHorizontal size={18} className="text-violet-500" />}
        title="Revenue Scenario Modeler"
        subtitle="What-if analysis \u2014 model revenue impact of actions"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-5">
          {(() => {
            const totalVacant = units.reduce((sum, u) => sum + u.vacant_count, 0)
            const avgStreetRate = units.reduce((sum, u) => sum + (u.street_rate || 0) * u.vacant_count, 0) / (totalVacant || 1)
            const vacancyRecovery = Math.round(totalVacant * (scenVacancyFill / 100)) * avgStreetRate
            const rateIncreaseGain = s.total_actual_revenue * (scenRateIncrease / 100)
            const ecriRecovery = s.ecri_monthly_lift * (scenEcriApply / 100)
            const totalScenarioGain = vacancyRecovery + rateIncreaseGain + ecriRecovery
            const projectedMRR = s.total_actual_revenue + totalScenarioGain

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--color-dark)]">Fill Vacancies</label>
                      <span className="text-sm font-semibold text-emerald-500">{scenVacancyFill}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={scenVacancyFill} onChange={e => setScenVacancyFill(Number(e.target.value))} className="w-full accent-emerald-500" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--color-mid-gray)]">{Math.round(totalVacant * scenVacancyFill / 100)} of {totalVacant} units</span>
                      <span className="text-xs text-emerald-500">+{money(vacancyRecovery)}/mo</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--color-dark)]">Rate Increase</label>
                      <span className="text-sm font-semibold text-[var(--color-gold)]">{scenRateIncrease}%</span>
                    </div>
                    <input type="range" min={0} max={15} step={1} value={scenRateIncrease} onChange={e => setScenRateIncrease(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--color-mid-gray)]">Across all occupied units</span>
                      <span className="text-xs text-[var(--color-gold)]">+{money(rateIncreaseGain)}/mo</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--color-dark)]">Apply ECRI</label>
                      <span className="text-sm font-semibold text-violet-500">{scenEcriApply}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={10} value={scenEcriApply} onChange={e => setScenEcriApply(Number(e.target.value))} className="w-full accent-violet-500" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--color-mid-gray)]">{Math.round(s.ecri_eligible_count * scenEcriApply / 100)} of {s.ecri_eligible_count} tenants</span>
                      <span className="text-xs text-violet-500">+{money(ecriRecovery)}/mo</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-5 bg-gradient-to-r from-emerald-500/5 to-[var(--color-gold)]/5 border border-emerald-500/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)]">Current MRR</p>
                      <p className="text-xl font-semibold text-[var(--color-dark)]">{money(s.total_actual_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)]">Scenario Gain</p>
                      <p className="text-xl font-semibold text-emerald-500">+{money(totalScenarioGain)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)]">Projected MRR</p>
                      <p className="text-xl font-semibold text-[var(--color-gold)]">{money(projectedMRR)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)]">Annual Impact</p>
                      <p className="text-xl font-semibold text-violet-500">+{money(totalScenarioGain * 12)}/yr</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[var(--color-mid-gray)]">Revenue Position</span>
                    </div>
                    <div className="w-full h-8 rounded-lg overflow-hidden flex bg-[var(--color-light-gray)]">
                      <div
                        className="h-8 bg-emerald-500 flex items-center justify-center transition-all"
                        style={{ width: `${s.total_gross_potential > 0 ? (s.total_actual_revenue / s.total_gross_potential * 100) : 0}%` }}
                      >
                        <span className="text-xs font-semibold text-white">Current</span>
                      </div>
                      {totalScenarioGain > 0 && (
                        <div
                          className="h-8 bg-[var(--color-gold)] flex items-center justify-center transition-all"
                          style={{ width: `${s.total_gross_potential > 0 ? (totalScenarioGain / s.total_gross_potential * 100) : 0}%` }}
                        >
                          <span className="text-xs font-semibold text-white">+Scenario</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--color-mid-gray)]">{money(0)}</span>
                      <span className="text-xs text-[var(--color-mid-gray)]">Gross Potential: {money(s.total_gross_potential)}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

/* ── Sqft Analysis ── */

function SqftAnalysis({ sqftAnalysis, expanded, onToggle }: {
  sqftAnalysis: SqftEntry[]
  expanded: boolean
  onToggle: () => void
}) {
  if (sqftAnalysis.length === 0) return null
  const sorted = [...sqftAnalysis].sort((a, b) => b.actual_per_sqft - a.actual_per_sqft)
  const maxPerSqft = Math.max(...sorted.map(s => s.actual_per_sqft), 1)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<Maximize2 size={18} className="text-orange-500" />}
        title="Revenue per Square Foot"
        subtitle="Which unit types generate the most revenue per sqft"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <div className="space-y-3">
            {sorted.map((u, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-dark)]">{u.unit_type}</span>
                    <span className="text-xs text-[var(--color-mid-gray)]">{u.sqft} sqft</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-[var(--color-mid-gray)]">Street: </span>
                      <span className="text-xs font-mono text-[var(--color-mid-gray)]">${u.street_per_sqft.toFixed(2)}/sf</span>
                    </div>
                    <span className={`text-sm font-semibold ${u.actual_per_sqft >= u.street_per_sqft ? 'text-emerald-500' : 'text-amber-500'}`}>
                      ${u.actual_per_sqft.toFixed(2)}/sf
                    </span>
                  </div>
                </div>
                <div className="w-full h-5 rounded bg-[var(--color-light-gray)] relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-mid-gray)] z-10" style={{ left: `${(u.street_per_sqft / maxPerSqft * 100)}%` }} />
                  <div
                    className={`h-5 rounded transition-all ${i === 0 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : u.actual_per_sqft >= u.street_per_sqft ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${(u.actual_per_sqft / maxPerSqft * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-[var(--color-mid-gray)]">Above street $/sf</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-[var(--color-mid-gray)]">Below street $/sf</span></div>
              <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-[var(--color-mid-gray)]" /><span className="text-xs text-[var(--color-mid-gray)]">Street rate line</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Seasonal Patterns ── */

function SeasonalPatterns({ seasonalPattern, expanded, onToggle }: {
  seasonalPattern: SeasonalEntry[]
  expanded: boolean
  onToggle: () => void
}) {
  if (seasonalPattern.length === 0 || !seasonalPattern.some(p => p.avg_move_ins > 0)) return null
  const maxActivity = Math.max(...seasonalPattern.map(p => Math.max(p.avg_move_ins, p.avg_move_outs)), 1)
  const seasonIcons: Record<string, React.ReactNode> = {
    Jan: <Snowflake size={10} />, Feb: <Snowflake size={10} />, Mar: <Flower2 size={10} />,
    Apr: <Flower2 size={10} />, May: <Flower2 size={10} />, Jun: <Sun size={10} />,
    Jul: <Sun size={10} />, Aug: <Sun size={10} />, Sep: <Leaf size={10} />,
    Oct: <Leaf size={10} />, Nov: <Snowflake size={10} />, Dec: <Snowflake size={10} />,
  }
  const peakMonth = seasonalPattern.reduce((best, m) => m.avg_move_ins > best.avg_move_ins ? m : best)
  const troughMonth = seasonalPattern.reduce((best, m) => m.avg_move_ins < best.avg_move_ins && m.avg_move_ins > 0 ? m : best, seasonalPattern[0])
  const worstNetMonth = seasonalPattern.reduce((best, m) => (m.avg_move_ins - m.avg_move_outs) < (best.avg_move_ins - best.avg_move_outs) ? m : best)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<Sun size={18} className="text-yellow-500" />}
        title="Seasonal Patterns"
        subtitle="Average move-in/out activity by month (multi-year)"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <div className="space-y-4">
            <div className="flex items-end gap-1 h-36">
              {seasonalPattern.map((m, i) => {
                const inH = (m.avg_move_ins / maxActivity * 100)
                const outH = (m.avg_move_outs / maxActivity * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                      <div className="w-[45%] rounded-t bg-emerald-500 transition-all" style={{ height: `${Math.max(inH, 3)}%` }} />
                      <div className="w-[45%] rounded-t bg-red-400 transition-all" style={{ height: `${Math.max(outH, 3)}%` }} />
                    </div>
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap bg-[var(--color-light-gray)] text-[var(--color-dark)] border border-[var(--border-subtle)]">
                      {m.month}: {'\u2191'}{m.avg_move_ins.toFixed(1)} {'\u2193'}{m.avg_move_outs.toFixed(1)} (net {(m.avg_move_ins - m.avg_move_outs) >= 0 ? '+' : ''}{(m.avg_move_ins - m.avg_move_outs).toFixed(1)})<br />Avg Rev: {money(m.avg_revenue)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1">
              {seasonalPattern.map((m, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-[10px] flex flex-col items-center gap-0.5 ${(m.avg_move_ins - m.avg_move_outs) > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {seasonIcons[m.month]}{m.month}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-xs text-[var(--color-mid-gray)]">Avg Move-Ins</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-[var(--color-mid-gray)]">Avg Move-Outs</span></div>
              </div>
              <span className="text-xs text-[var(--color-mid-gray)]">Based on {seasonalPattern[0]?.years_of_data || 0} year(s) of data</span>
            </div>
            <div className="rounded-lg p-3 bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-[var(--color-dark)]">
                <span className="font-semibold">Insight:</span>{' '}
                Peak move-in month is <span className="font-semibold text-emerald-500">{peakMonth.month}</span> ({peakMonth.avg_move_ins.toFixed(1)} avg).
                Slowest is <span className="font-semibold text-amber-500">{troughMonth.month}</span> ({troughMonth.avg_move_ins.toFixed(1)} avg).
                Worst net absorption is <span className="font-semibold text-red-500">{worstNetMonth.month}</span> (net {(worstNetMonth.avg_move_ins - worstNetMonth.avg_move_outs).toFixed(1)}).
                <span className="font-semibold"> Ramp ad spend in {seasonalPattern.filter(m => m.avg_move_ins >= peakMonth.avg_move_ins * 0.8).map(m => m.month).join(', ')}.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Delinquency Dashboard ── */

function DelinquencyDashboard({ aging, summary: s, expanded, onToggle }: {
  aging: AgingSummary
  summary: IntelSummary
  expanded: boolean
  onToggle: () => void
}) {
  const total = parseFloat(String(aging.total_outstanding || 0))
  if (total <= 0) return null

  const buckets = [
    { label: '0\u201330 days', value: parseFloat(String(aging.total_0_30 || 0)), color: 'bg-yellow-400', recovery: 0.95 },
    { label: '31\u201360 days', value: parseFloat(String(aging.total_31_60 || 0)), color: 'bg-orange-400', recovery: 0.75 },
    { label: '61\u201390 days', value: parseFloat(String(aging.total_61_90 || 0)), color: 'bg-orange-600', recovery: 0.50 },
    { label: '91\u2013120 days', value: parseFloat(String(aging.total_91_120 || 0)), color: 'bg-red-500', recovery: 0.25 },
    { label: '120+ days', value: parseFloat(String(aging.total_120_plus || 0)), color: 'bg-red-700', recovery: 0.05 },
  ]
  const maxBucket = Math.max(...buckets.map(b => b.value), 1)
  const expectedRecovery = buckets.reduce((sum, b) => sum + b.value * b.recovery, 0)
  const projectedWriteOff = total - expectedRecovery

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <SectionHeader
        icon={<ShieldAlert size={18} className="text-orange-500" />}
        title="Delinquency Risk Dashboard"
        subtitle={`${money(total)} outstanding across ${aging.delinquent_count} accounts`}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {buckets.map((b, i) => (
              <div key={i} className="rounded-lg p-3 text-center border border-[var(--border-subtle)]">
                <div className="w-full h-16 rounded flex items-end justify-center bg-[var(--color-light-gray)]">
                  <div className={`w-3/4 rounded-t ${b.color} transition-all`} style={{ height: `${(b.value / maxBucket * 100)}%`, minHeight: b.value > 0 ? '4px' : '0' }} />
                </div>
                <p className="text-xs font-medium mt-2 text-[var(--color-dark)]">{b.label}</p>
                <p className={`text-sm font-semibold ${b.value > 0 ? 'text-red-500' : 'text-[var(--color-mid-gray)]'}`}>{money(b.value)}</p>
                <p className="text-[10px] text-[var(--color-mid-gray)]">{(b.recovery * 100).toFixed(0)}% recovery</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg p-3 text-center bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Total Outstanding</p>
              <p className="text-lg font-semibold text-red-500">{money(total)}</p>
            </div>
            <div className="rounded-lg p-3 text-center bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Expected Recovery</p>
              <p className="text-lg font-semibold text-emerald-500">{money(expectedRecovery)}</p>
            </div>
            <div className="rounded-lg p-3 text-center bg-[var(--color-light-gray)] border border-[var(--border-subtle)]">
              <p className="text-xs font-medium text-[var(--color-mid-gray)]">Projected Write-Off</p>
              <p className="text-lg font-semibold text-[var(--color-dark)]">{money(projectedWriteOff)}</p>
            </div>
          </div>
          <div className="rounded-lg p-3 bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <p className="text-xs text-[var(--color-dark)]">
                <span className="font-semibold">Delinquency Rate:</span>{' '}
                {s.total_actual_revenue > 0 ? (total / s.total_actual_revenue * 100).toFixed(1) : 0}% of MRR
                {aging.moved_out_count > 0 && (
                  <> &middot; {aging.moved_out_count} delinquent accounts already moved out (likely write-off: {money(parseFloat(String(aging.total_120_plus || 0)))})</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Composite Export ── */

export default function ProjectionsAndDetails({ units, summary, sqftAnalysis, seasonalPattern, aging, expandedSection, toggle }: {
  units: UnitIntel[]
  summary: IntelSummary
  sqftAnalysis: SqftEntry[]
  seasonalPattern: SeasonalEntry[]
  aging: AgingSummary | null
  expandedSection: string | null
  toggle: (section: string) => void
}) {
  return (
    <>
      <ScenarioModeler
        units={units}
        summary={summary}
        expanded={expandedSection === 'scenario'}
        onToggle={() => toggle('scenario')}
      />
      <SqftAnalysis
        sqftAnalysis={sqftAnalysis}
        expanded={expandedSection === 'sqft'}
        onToggle={() => toggle('sqft')}
      />
      <SeasonalPatterns
        seasonalPattern={seasonalPattern}
        expanded={expandedSection === 'seasonal'}
        onToggle={() => toggle('seasonal')}
      />
      {aging && (
        <DelinquencyDashboard
          aging={aging}
          summary={summary}
          expanded={expandedSection === 'delinquency'}
          onToggle={() => toggle('delinquency')}
        />
      )}
    </>
  )
}
