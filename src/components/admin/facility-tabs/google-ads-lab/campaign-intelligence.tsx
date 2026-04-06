'use client'

import {
  Loader2, AlertTriangle, Zap, Shield, TrendingUp,
} from 'lucide-react'

/* ── Types ── */

interface KeywordIdea {
  keyword: string
  intent: 'high' | 'medium' | 'low'
  competition: 'high' | 'medium' | 'low'
  estimatedCPC: number
  estimatedVolume: number
  relevanceScore: number
  rationale: string
  group: string
}

interface CampaignConfig {
  name: string
  dailyBudget: number
  bidStrategy: 'maximize_clicks' | 'maximize_conversions' | 'target_cpa' | 'target_roas'
  targetCPA: number | null
  geoRadius: number
  adSchedule: string[]
  keywords: KeywordIdea[]
  negativeKeywords: string[]
}

interface CampaignScore {
  overall: number
  breakdown: {
    keywordRelevance: number
    budgetEfficiency: number
    intentBalance: number
    competitivePosition: number
    geoFocus: number
  }
  warnings: string[]
  suggestions: string[]
}

interface PMSUnit {
  unit_type: string
  total_count: number
  occupied_count: number
  street_rate: number | null
  web_rate: number | null
}

interface PMSData {
  units: PMSUnit[]
  occupancyPct: number
  vacantUnits: number
}

interface PMSStrategy {
  occ: number
  vacantWithRevenue: { type: string; vacant: number; rate: number }[]
  monthlyRevenueGap: number
  lowestPrice: number
  topVacant: { type: string; vacant: number; rate: number }[]
  strategyLabel: string
  strategyColor: string
  strategyDetail: string
  bidRec: string
}

const BID_STRATEGIES = [
  { id: 'maximize_clicks', label: 'Maximize Clicks', description: 'Best for new campaigns -- get traffic flowing' },
  { id: 'maximize_conversions', label: 'Maximize Conversions', description: 'Let Google optimize for move-ins -- needs conversion tracking' },
  { id: 'target_cpa', label: 'Target CPA', description: 'Set your cost-per-lead target -- needs 30+ conversions/month' },
  { id: 'target_roas', label: 'Target ROAS', description: 'Optimize for return on ad spend -- needs revenue tracking' },
]

const scoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-red-400'

/* ── PMS Context Bar ── */

export function PMSContextBar({
  pmsLoading,
  pmsStrategy,
  pmsData,
  suggestedBudget,
  config,
}: {
  pmsLoading: boolean
  pmsStrategy: PMSStrategy | null
  pmsData: PMSData | null
  suggestedBudget: number
  config: CampaignConfig
}) {
  if (pmsLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-mid-gray)]">
        <Loader2 size={12} className="animate-spin" /> Loading PMS data...
      </div>
    )
  }

  if (!pmsStrategy || !pmsData) return null

  return (
    <div className="border border-[var(--color-blue)]/20 rounded-xl p-4 space-y-3 bg-[var(--color-blue)]/5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-blue)]">PMS Campaign Intelligence</p>
        <span className={`text-xs font-semibold ${pmsStrategy.strategyColor}`}>{pmsStrategy.strategyLabel}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-[var(--color-dark)]">{pmsData.vacantUnits}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">Vacant Units</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[var(--color-dark)]">{pmsStrategy.occ.toFixed(1)}%</p>
          <p className="text-xs text-[var(--color-mid-gray)]">Occupancy</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[var(--color-dark)]">${pmsStrategy.lowestPrice}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">Starting Price</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-400">${pmsStrategy.monthlyRevenueGap.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-mid-gray)]">Monthly Revenue Gap</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[var(--color-dark)]">${suggestedBudget}/day</p>
          <p className="text-xs text-[var(--color-mid-gray)]">Suggested Budget</p>
        </div>
      </div>
      <div className="text-xs text-[var(--color-body-text)] border-t border-[var(--color-blue)]/20 pt-2">
        <p><strong className={pmsStrategy.strategyColor}>Strategy:</strong> {pmsStrategy.strategyDetail}</p>
        {pmsStrategy.topVacant.length > 0 && (
          <p className="mt-1"><strong>Priority units:</strong> {pmsStrategy.topVacant.map(u => `${u.type} (${u.vacant} vacant x $${u.rate} = $${(u.vacant * u.rate).toLocaleString()}/mo gap)`).join(' | ')}</p>
        )}
        {pmsStrategy.occ >= 95 && <p className="mt-1 font-medium">At {pmsStrategy.occ.toFixed(1)}% occupancy, every $1 in ad spend should be justified by rate optimization ROI, not unit fills.</p>}
        {pmsStrategy.bidRec !== config.bidStrategy && (
          <p className="mt-1"><strong>Bid strategy suggestion:</strong> Based on occupancy, consider <em>{BID_STRATEGIES.find(b => b.id === pmsStrategy.bidRec)?.label}</em> instead of {BID_STRATEGIES.find(b => b.id === config.bidStrategy)?.label}.</p>
        )}
      </div>
    </div>
  )
}

/* ── Campaign Score Card ── */

export function CampaignScoreCard({
  score,
}: {
  score: CampaignScore
}) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-4 mb-4">
        <div className={`text-3xl font-semibold ${scoreColor(score.overall)}`}>{score.overall}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--color-dark)]">Campaign Score</p>
          <p className="text-xs text-[var(--color-mid-gray)]">
            {score.overall >= 80 ? 'Strong campaign -- ready to launch' :
             score.overall >= 60 ? 'Decent foundation -- review suggestions below' :
             'Needs work -- address warnings before launching'}
          </p>
        </div>
        <Shield size={24} className={scoreColor(score.overall)} />
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
        {Object.entries(score.breakdown).map(([key, val]) => (
          <div key={key} className="text-center">
            <div className={`text-lg font-semibold ${scoreColor(val)}`}>{val}</div>
            <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {score.warnings.length > 0 && (
        <div className="space-y-1 mb-3">
          {score.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-red-500/10 text-red-300">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <div className="space-y-1">
          {score.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-emerald-500/10 text-emerald-300">
              <Zap size={12} className="mt-0.5 flex-shrink-0" /> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Revenue Impact Projections ── */

export function RevenueProjections({
  revenueProjection,
}: {
  revenueProjection: {
    monthlyLeads: number
    monthlyMoveIns: number
    monthlyRevenueImpact: number
    roas: number
  }
}) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-[var(--color-gold)]" />
        <h5 className="text-xs font-semibold text-[var(--color-dark)]">Revenue Impact Projections</h5>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-lg bg-[var(--color-light-gray)]">
          <p className="text-sm font-semibold text-[var(--color-dark)]">{revenueProjection.monthlyLeads.toFixed(1)}</p>
          <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Monthly Leads</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--color-light-gray)]">
          <p className="text-sm font-semibold text-[var(--color-dark)]">{revenueProjection.monthlyMoveIns.toFixed(1)}</p>
          <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Monthly Move-Ins</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--color-light-gray)]">
          <p className="text-sm font-semibold text-emerald-400">${revenueProjection.monthlyRevenueImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Monthly Revenue</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--color-light-gray)]">
          <p className="text-sm font-semibold text-[var(--color-gold)]">{revenueProjection.roas.toFixed(1)}x</p>
          <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Annual ROAS</p>
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-mid-gray)] mt-2">Based on 8% click-to-lead conversion, 35% lead-to-move-in close rate, 10-month avg tenant stay.</p>
    </div>
  )
}
