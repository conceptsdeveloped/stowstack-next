'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Sparkles, Search, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2, Zap, Shield,
  TrendingUp, Target, MapPin
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

const INTENT_COLORS: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-black/[0.04] text-[#9CA3AF]',
}

const COMPETITION_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

const BID_STRATEGIES = [
  { id: 'maximize_clicks', label: 'Maximize Clicks', description: 'Best for new campaigns -- get traffic flowing' },
  { id: 'maximize_conversions', label: 'Maximize Conversions', description: 'Let Google optimize for move-ins -- needs conversion tracking' },
  { id: 'target_cpa', label: 'Target CPA', description: 'Set your cost-per-lead target -- needs 30+ conversions/month' },
  { id: 'target_roas', label: 'Target ROAS', description: 'Optimize for return on ad spend -- needs revenue tracking' },
]

const DEFAULT_NEGATIVES = [
  'free', 'diy', 'how to build', 'jobs', 'career', 'salary',
  'ikea', 'walmart', 'amazon', 'home depot',
  'closet', 'shed plans', 'garage plans',
]

/* ── Scoring Logic ── */

function scoreCampaign(config: CampaignConfig): CampaignScore {
  const warnings: string[] = []
  const suggestions: string[] = []

  const storageTerms = /storage|unit|moving|store|rent|locker|climate|secure|self.?storage/i
  const relevantCount = config.keywords.filter(k => storageTerms.test(k.keyword)).length
  const keywordRelevance = config.keywords.length > 0 ? Math.round((relevantCount / config.keywords.length) * 100) : 0
  if (keywordRelevance < 60) warnings.push("Many keywords aren't storage-specific -- you may attract irrelevant clicks")

  const avgCPC = config.keywords.length > 0
    ? config.keywords.reduce((s, k) => s + k.estimatedCPC, 0) / config.keywords.length
    : 3
  const estimatedDailyClicks = config.dailyBudget / avgCPC
  let budgetEfficiency = 0
  if (estimatedDailyClicks >= 10) budgetEfficiency = 90
  else if (estimatedDailyClicks >= 5) budgetEfficiency = 75
  else if (estimatedDailyClicks >= 3) budgetEfficiency = 60
  else { budgetEfficiency = 40; warnings.push(`Budget only supports ~${Math.round(estimatedDailyClicks)} clicks/day -- consider increasing to $${Math.round(avgCPC * 5)}/day minimum`) }

  const highIntent = config.keywords.filter(k => k.intent === 'high').length
  const intentBalance = config.keywords.length > 0 ? Math.round((highIntent / config.keywords.length) * 100) : 50
  if (intentBalance < 40) suggestions.push('Add more high-intent keywords like "storage units near me" or "rent storage unit"')
  if (intentBalance > 90) suggestions.push('Consider adding a few medium-intent keywords for awareness at lower CPCs')

  const highComp = config.keywords.filter(k => k.competition === 'high').length
  const competitivePosition = config.keywords.length > 0 ? Math.round(100 - (highComp / config.keywords.length) * 60) : 50
  if (highComp > config.keywords.length * 0.7) warnings.push('Mostly high-competition keywords -- CPCs will be expensive. Mix in long-tail variations.')

  let geoFocus = 70
  if (config.geoRadius <= 10) { geoFocus = 95; suggestions.push('Tight geo-targeting -- great for local dominance') }
  else if (config.geoRadius <= 20) geoFocus = 80
  else if (config.geoRadius <= 30) geoFocus = 60
  else { geoFocus = 40; warnings.push('Radius over 30 miles is too wide for self-storage -- most customers drive <15 minutes') }

  if (config.negativeKeywords.length < 5) suggestions.push('Add more negative keywords to avoid wasted spend on irrelevant searches')
  if (config.bidStrategy === 'target_cpa' && !config.targetCPA) warnings.push('Target CPA strategy selected but no CPA value set')

  const overall = Math.round(
    keywordRelevance * 0.3 +
    budgetEfficiency * 0.25 +
    intentBalance * 0.2 +
    competitivePosition * 0.15 +
    geoFocus * 0.1
  )

  return {
    overall,
    breakdown: { keywordRelevance, budgetEfficiency, intentBalance, competitivePosition, geoFocus },
    warnings,
    suggestions,
  }
}

/* ── Component ── */

export default function GoogleAdsLab({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [keywords, setKeywords] = useState<KeywordIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [pmsData, setPmsData] = useState<PMSData | null>(null)
  const [pmsLoading, setPmsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const suggestedBudget = pmsData?.vacantUnits ? Math.max(20, Math.round(pmsData.vacantUnits * 2)) : 30

  const [config, setConfig] = useState<CampaignConfig>({
    name: 'Search Campaign',
    dailyBudget: 30,
    bidStrategy: 'maximize_clicks',
    targetCPA: null,
    geoRadius: 15,
    adSchedule: ['Mon-Fri 6am-10pm', 'Sat-Sun 8am-8pm'],
    keywords: [],
    negativeKeywords: [...DEFAULT_NEGATIVES],
  })
  const [score, setScore] = useState<CampaignScore | null>(null)
  const [newNegative, setNewNegative] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  // Load PMS data
  useEffect(() => {
    fetch(`/api/facility-pms?facilityId=${facilityId}`, {
      headers: { 'X-Admin-Key': adminKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.units && data.units.length > 0) {
          const totalUnits = data.units.reduce((s: number, u: PMSUnit) => s + u.total_count, 0)
          const occupiedUnits = data.units.reduce((s: number, u: PMSUnit) => s + u.occupied_count, 0)
          const vacantUnits = totalUnits - occupiedUnits
          const occupancyPct = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
          setPmsData({ units: data.units, occupancyPct, vacantUnits })
        }
      })
      .catch(() => {})
      .finally(() => setPmsLoading(false))
  }, [facilityId, adminKey])

  // Update budget from PMS data
  useEffect(() => {
    if (pmsData) {
      const suggested = Math.max(20, Math.round(pmsData.vacantUnits * 2))
      setConfig(prev => ({ ...prev, dailyBudget: suggested }))
    }
  }, [pmsData])

  // Score whenever config changes
  useEffect(() => {
    if (config.keywords.length > 0) {
      setScore(scoreCampaign(config))
    }
  }, [config])

  const generateKeywords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/google-ads-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId }),
      })
      const data = await res.json()
      if (data.keywords) {
        setKeywords(data.keywords)
        setConfig(prev => ({ ...prev, keywords: data.keywords }))
      } else if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      console.error('Keyword generation failed:', err)
      setError('Failed to generate keywords. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  function toggleKeyword(keyword: KeywordIdea) {
    setConfig(prev => {
      const exists = prev.keywords.some(k => k.keyword === keyword.keyword)
      return {
        ...prev,
        keywords: exists
          ? prev.keywords.filter(k => k.keyword !== keyword.keyword)
          : [...prev.keywords, keyword],
      }
    })
  }

  function addNegative() {
    if (!newNegative.trim()) return
    setConfig(prev => ({ ...prev, negativeKeywords: [...prev.negativeKeywords, newNegative.trim().toLowerCase()] }))
    setNewNegative('')
  }

  function removeNegative(kw: string) {
    setConfig(prev => ({ ...prev, negativeKeywords: prev.negativeKeywords.filter(n => n !== kw) }))
  }

  // Group keywords
  const groups = keywords.reduce<Record<string, KeywordIdea[]>>((acc, kw) => {
    const g = kw.group || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(kw)
    return acc
  }, {})

  const scoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = (s: number) => s >= 80 ? 'bg-emerald-500/20' : s >= 60 ? 'bg-amber-500/20' : 'bg-red-500/20'

  // PMS-based strategy
  const pmsStrategy = pmsData ? (() => {
    const occ = pmsData.occupancyPct
    const vacantWithRevenue = pmsData.units
      .filter(u => (u.total_count - u.occupied_count) > 0)
      .map(u => ({ type: u.unit_type, vacant: u.total_count - u.occupied_count, rate: u.street_rate || 0 }))
    const monthlyRevenueGap = vacantWithRevenue.reduce((s, u) => s + u.vacant * u.rate, 0)
    const lowestPrice = Math.min(...pmsData.units.map(u => u.web_rate || u.street_rate || 999))
    const topVacant = vacantWithRevenue.sort((a, b) => b.vacant - a.vacant).slice(0, 3)

    let strategyLabel: string, strategyColor: string, strategyDetail: string, bidRec: string
    if (occ < 80) {
      strategyLabel = 'Aggressive Demand Generation'
      strategyColor = 'text-red-400'
      strategyDetail = 'Broad targeting. Strong offers. CPMI target is secondary to volume -- fill units first.'
      bidRec = 'maximize_clicks'
    } else if (occ < 90) {
      strategyLabel = 'Targeted by Unit Type'
      strategyColor = 'text-amber-400'
      strategyDetail = `Focus on underperforming types: ${topVacant.map(u => u.type).join(', ') || 'varies'}. Optimize CPMI.`
      bidRec = 'maximize_conversions'
    } else if (occ < 95) {
      strategyLabel = 'Selective + Rate Optimization'
      strategyColor = 'text-blue-400'
      strategyDetail = 'Fill specific vacancies only. Rate increases are the primary revenue lever now.'
      bidRec = 'target_cpa'
    } else {
      strategyLabel = 'Revenue Maximization Only'
      strategyColor = 'text-emerald-400'
      strategyDetail = 'Minimal acquisition spend. Focus on rate increases and waitlist campaigns.'
      bidRec = 'target_roas'
    }

    return { occ, vacantWithRevenue, monthlyRevenueGap, lowestPrice, topVacant, strategyLabel, strategyColor, strategyDetail, bidRec }
  })() : null

  // Revenue impact projections
  const revenueProjection = config.keywords.length > 0 && pmsData ? (() => {
    const avgCPC = config.keywords.reduce((s, k) => s + k.estimatedCPC, 0) / config.keywords.length
    const dailyClicks = config.dailyBudget / avgCPC
    const conversionRate = 0.08 // 8% avg for storage
    const dailyLeads = dailyClicks * conversionRate
    const monthlyLeads = dailyLeads * 30
    const closeRate = 0.35
    const monthlyMoveIns = monthlyLeads * closeRate
    const avgMonthlyRevenue = pmsData.units.length > 0
      ? pmsData.units.reduce((s, u) => s + (u.street_rate || 0), 0) / pmsData.units.length
      : 120
    const ltv = avgMonthlyRevenue * 10 // avg 10 month stay
    const monthlyRevenueImpact = monthlyMoveIns * avgMonthlyRevenue
    const annualRevenueImpact = monthlyMoveIns * ltv
    const adSpend = config.dailyBudget * 30
    const roas = adSpend > 0 ? annualRevenueImpact / adSpend : 0

    return { dailyClicks, dailyLeads, monthlyLeads, monthlyMoveIns, monthlyRevenueImpact, annualRevenueImpact, adSpend, roas, avgCPC }
  })() : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-[#111827]">Google Ads Laboratory</h4>
        <p className="text-xs text-[#9CA3AF] mt-0.5">Build, score, and optimize Google Search campaigns</p>
      </div>

      {/* PMS Context Bar */}
      {pmsLoading && (
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <Loader2 size={12} className="animate-spin" /> Loading PMS data...
        </div>
      )}

      {pmsStrategy && pmsData && (
        <div className="border border-blue-500/20 rounded-xl p-4 space-y-3 bg-blue-500/[0.05]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">PMS Campaign Intelligence</p>
            <span className={`text-xs font-bold ${pmsStrategy.strategyColor}`}>{pmsStrategy.strategyLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-[#111827]">{pmsData.vacantUnits}</p>
              <p className="text-xs text-[#9CA3AF]">Vacant Units</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#111827]">{pmsStrategy.occ.toFixed(1)}%</p>
              <p className="text-xs text-[#9CA3AF]">Occupancy</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#111827]">${pmsStrategy.lowestPrice}</p>
              <p className="text-xs text-[#9CA3AF]">Starting Price</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">${pmsStrategy.monthlyRevenueGap.toLocaleString()}</p>
              <p className="text-xs text-[#9CA3AF]">Monthly Revenue Gap</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#111827]">${suggestedBudget}/day</p>
              <p className="text-xs text-[#9CA3AF]">Suggested Budget</p>
            </div>
          </div>
          <div className="text-xs text-[#6B7280] border-t border-blue-500/20 pt-2">
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
      )}

      {/* Campaign Score */}
      {score && (
        <div className="border border-black/[0.08] rounded-xl p-5 bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-3xl font-bold ${scoreColor(score.overall)}`}>{score.overall}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#111827]">Campaign Score</p>
              <p className="text-xs text-[#9CA3AF]">
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
                <div className={`text-lg font-bold ${scoreColor(val)}`}>{val}</div>
                <p className="text-[9px] uppercase text-[#9CA3AF]">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
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
      )}

      {/* Revenue Impact Projections */}
      {revenueProjection && (
        <div className="border border-black/[0.08] rounded-xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#3B82F6]" />
            <h5 className="text-xs font-semibold text-[#111827]">Revenue Impact Projections</h5>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-black/[0.02]">
              <p className="text-sm font-bold text-[#111827]">{revenueProjection.monthlyLeads.toFixed(1)}</p>
              <p className="text-[9px] uppercase text-[#9CA3AF]">Monthly Leads</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/[0.02]">
              <p className="text-sm font-bold text-[#111827]">{revenueProjection.monthlyMoveIns.toFixed(1)}</p>
              <p className="text-[9px] uppercase text-[#9CA3AF]">Monthly Move-Ins</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/[0.02]">
              <p className="text-sm font-bold text-emerald-400">${revenueProjection.monthlyRevenueImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] uppercase text-[#9CA3AF]">Monthly Revenue</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-black/[0.02]">
              <p className="text-sm font-bold text-[#3B82F6]">{revenueProjection.roas.toFixed(1)}x</p>
              <p className="text-[9px] uppercase text-[#9CA3AF]">Annual ROAS</p>
            </div>
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-2">Based on 8% click-to-lead conversion, 35% lead-to-move-in close rate, 10-month avg tenant stay.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Campaign Config */}
        <div className="space-y-4">
          <div className="border border-black/[0.08] rounded-xl p-4 bg-white">
            <h5 className="text-xs font-semibold text-[#111827] mb-3">Campaign Settings</h5>

            <div className="space-y-3">
              {/* Daily Budget */}
              <div>
                <label className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Daily Budget</label>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-[#9CA3AF]" />
                  <input
                    type="number"
                    value={config.dailyBudget}
                    onChange={e => setConfig(prev => ({ ...prev, dailyBudget: parseFloat(e.target.value) || 0 }))}
                    className="w-24 px-2 py-1.5 border border-black/[0.08] rounded-lg text-sm bg-black/[0.02] text-[#111827] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <span className="text-xs text-[#9CA3AF]">/ day (${(config.dailyBudget * 30).toLocaleString()}/mo)</span>
                </div>
              </div>

              {/* Geo Radius */}
              <div>
                <label className="text-[10px] uppercase text-[#9CA3AF] block mb-1">
                  <MapPin size={10} className="inline mr-1" />
                  Geo Radius
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={5} max={50} step={5}
                    value={config.geoRadius}
                    onChange={e => setConfig(prev => ({ ...prev, geoRadius: parseInt(e.target.value) }))}
                    className="flex-1 accent-[#3B82F6] h-1"
                  />
                  <span className="text-sm font-medium text-[#111827] w-20">{config.geoRadius} miles</span>
                </div>
              </div>

              {/* Bid Strategy */}
              <div>
                <label className="text-[10px] uppercase text-[#9CA3AF] block mb-2">
                  <Target size={10} className="inline mr-1" />
                  Bid Strategy
                </label>
                <div className="space-y-1.5">
                  {BID_STRATEGIES.map(bs => (
                    <button
                      key={bs.id}
                      onClick={() => setConfig(prev => ({ ...prev, bidStrategy: bs.id as CampaignConfig['bidStrategy'] }))}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                        config.bidStrategy === bs.id
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-black/[0.08] bg-white hover:border-black/[0.12]'
                      }`}
                    >
                      <span className="font-medium text-[#111827]">{bs.label}</span>
                      <span className="block text-[#9CA3AF] mt-0.5">{bs.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target CPA */}
              {config.bidStrategy === 'target_cpa' && (
                <div>
                  <label className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Target CPA</label>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-[#9CA3AF]" />
                    <input
                      type="number"
                      value={config.targetCPA || ''}
                      onChange={e => setConfig(prev => ({ ...prev, targetCPA: parseFloat(e.target.value) || null }))}
                      placeholder="e.g., 25"
                      className="w-24 px-2 py-1.5 border border-black/[0.08] rounded-lg text-sm bg-black/[0.02] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6]"
                    />
                    <span className="text-xs text-[#9CA3AF]">per lead</span>
                  </div>
                </div>
              )}

              {/* Ad Schedule */}
              <div>
                <label className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Ad Schedule</label>
                <div className="space-y-1">
                  {config.adSchedule.map((sched, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={sched}
                        onChange={e => {
                          const newSchedule = [...config.adSchedule]
                          newSchedule[idx] = e.target.value
                          setConfig(prev => ({ ...prev, adSchedule: newSchedule }))
                        }}
                        className="flex-1 px-2 py-1 border border-black/[0.08] rounded text-xs bg-black/[0.02] text-[#111827] focus:outline-none focus:border-[#3B82F6]"
                      />
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, adSchedule: prev.adSchedule.filter((_, i) => i !== idx) }))}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, adSchedule: [...prev.adSchedule, ''] }))}
                    className="flex items-center gap-1 text-[10px] text-[#3B82F6] hover:text-blue-300"
                  >
                    <Plus size={10} /> Add schedule
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Negative Keywords */}
          <div className="border border-black/[0.08] rounded-xl p-4 bg-white">
            <h5 className="text-xs font-semibold text-[#111827] mb-2">Negative Keywords ({config.negativeKeywords.length})</h5>
            <p className="text-[10px] text-[#9CA3AF] mb-2">Prevent your ads from showing on these searches</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config.negativeKeywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-300">
                  {kw}
                  <button onClick={() => removeNegative(kw)} className="hover:text-red-200"><Trash2 size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newNegative}
                onChange={e => setNewNegative(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNegative() }}
                placeholder="Add negative keyword..."
                className="flex-1 px-2 py-1 border border-black/[0.08] rounded text-xs bg-black/[0.02] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6]"
              />
              <button onClick={addNegative} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                <Plus size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Keywords */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-[#111827]">Keywords ({config.keywords.length} selected)</h5>
            <button
              onClick={generateKeywords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {keywords.length ? 'Regenerate' : 'Generate Keywords'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs p-3 rounded-lg bg-red-500/10 text-red-300">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Cost Estimate */}
          {config.keywords.length > 0 && (() => {
            const avgCPC = config.keywords.reduce((s, k) => s + k.estimatedCPC, 0) / config.keywords.length
            const totalVolume = config.keywords.reduce((s, k) => s + k.estimatedVolume, 0)
            const estimatedClicksDay = Math.min(config.dailyBudget / avgCPC, totalVolume / 30)
            const estimatedCostDay = estimatedClicksDay * avgCPC
            const estimatedCostMonth = estimatedCostDay * 30
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-black/[0.02]">
                <div className="text-center">
                  <p className="text-sm font-bold text-[#111827]">${avgCPC.toFixed(2)}</p>
                  <p className="text-[9px] uppercase text-[#9CA3AF]">Avg CPC</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#111827]">{Math.round(estimatedClicksDay)}</p>
                  <p className="text-[9px] uppercase text-[#9CA3AF]">Clicks/Day</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#111827]">${Math.round(estimatedCostDay)}</p>
                  <p className="text-[9px] uppercase text-[#9CA3AF]">Est. Cost/Day</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-emerald-400">${estimatedCostMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[9px] uppercase text-[#9CA3AF]">Est. Cost/Mo</p>
                </div>
              </div>
            )
          })()}

          {/* Empty state */}
          {keywords.length === 0 && !loading && (
            <div className="text-center py-8 border border-black/[0.08] rounded-xl bg-white">
              <Search size={24} className="mx-auto mb-2 text-[#9CA3AF]" />
              <p className="text-sm text-[#6B7280]">Generate AI-powered keyword suggestions</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">Based on facility data, location, and market analysis</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#3B82F6]" />
            </div>
          )}

          {/* Keyword groups */}
          {Object.entries(groups).map(([group, kws]) => (
            <div key={group} className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-black/[0.02] transition-colors"
              >
                <span className="text-xs font-semibold flex-1 text-[#111827]">{group}</span>
                <span className="text-[10px] text-[#9CA3AF]">
                  {kws.filter(k => config.keywords.some(ck => ck.keyword === k.keyword)).length}/{kws.length}
                </span>
                {expandedGroup === group ? <ChevronUp size={12} className="text-[#9CA3AF]" /> : <ChevronDown size={12} className="text-[#9CA3AF]" />}
              </button>
              {expandedGroup === group && (
                <div className="border-t border-black/[0.08]">
                  {kws.map(kw => {
                    const selected = config.keywords.some(k => k.keyword === kw.keyword)
                    return (
                      <button
                        key={kw.keyword}
                        onClick={() => toggleKeyword(kw)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-b border-black/[0.04] last:border-0 transition-colors hover:bg-black/[0.02] ${
                          selected ? 'bg-[#3B82F6]/5' : ''
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-white/20'
                        }`}>
                          {selected && <span className="text-white text-[8px]">&#10003;</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#111827]">{kw.keyword}</p>
                          <p className="text-[10px] text-[#9CA3AF] truncate">{kw.rationale}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${INTENT_COLORS[kw.intent]}`}>{kw.intent}</span>
                          <span className={`text-[10px] font-mono ${COMPETITION_COLORS[kw.competition]}`}>${kw.estimatedCPC.toFixed(2)}</span>
                          <span className="text-[10px] text-[#9CA3AF]">{kw.estimatedVolume}/mo</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
