'use client'

import { useState } from 'react'
import {
  Loader2, Sparkles, Search, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2,
  Target, MapPin
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

const INTENT_COLORS: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]',
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

/* ── Campaign Settings Panel ── */

export function CampaignSettingsPanel({
  config,
  setConfig,
}: {
  config: CampaignConfig
  setConfig: React.Dispatch<React.SetStateAction<CampaignConfig>>
}) {
  return (
    <div className="space-y-4">
      <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
        <h5 className="text-xs font-semibold text-[var(--color-dark)] mb-3">Campaign Settings</h5>

        <div className="space-y-3">
          {/* Daily Budget */}
          <div>
            <label className="text-[10px] uppercase text-[var(--color-mid-gray)] block mb-1">Daily Budget</label>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-[var(--color-mid-gray)]" />
              <input
                type="number"
                value={config.dailyBudget}
                onChange={e => setConfig(prev => ({ ...prev, dailyBudget: parseFloat(e.target.value) || 0 }))}
                className="w-24 px-2 py-1.5 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]"
              />
              <span className="text-xs text-[var(--color-mid-gray)]">/ day (${(config.dailyBudget * 30).toLocaleString()}/mo)</span>
            </div>
          </div>

          {/* Geo Radius */}
          <div>
            <label className="text-[10px] uppercase text-[var(--color-mid-gray)] block mb-1">
              <MapPin size={10} className="inline mr-1" />
              Geo Radius
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={50} step={5}
                value={config.geoRadius}
                onChange={e => setConfig(prev => ({ ...prev, geoRadius: parseInt(e.target.value) }))}
                className="flex-1 accent-[var(--color-gold)] h-1"
              />
              <span className="text-sm font-medium text-[var(--color-dark)] w-20">{config.geoRadius} miles</span>
            </div>
          </div>

          {/* Bid Strategy */}
          <div>
            <label className="text-[10px] uppercase text-[var(--color-mid-gray)] block mb-2">
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
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  <span className="font-medium text-[var(--color-dark)]">{bs.label}</span>
                  <span className="block text-[var(--color-mid-gray)] mt-0.5">{bs.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target CPA */}
          {config.bidStrategy === 'target_cpa' && (
            <div>
              <label className="text-[10px] uppercase text-[var(--color-mid-gray)] block mb-1">Target CPA</label>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-[var(--color-mid-gray)]" />
                <input
                  type="number"
                  value={config.targetCPA || ''}
                  onChange={e => setConfig(prev => ({ ...prev, targetCPA: parseFloat(e.target.value) || null }))}
                  placeholder="e.g., 25"
                  className="w-24 px-2 py-1.5 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
                />
                <span className="text-xs text-[var(--color-mid-gray)]">per lead</span>
              </div>
            </div>
          )}

          {/* Ad Schedule */}
          <div>
            <label className="text-[10px] uppercase text-[var(--color-mid-gray)] block mb-1">Ad Schedule</label>
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
                    className="flex-1 px-2 py-1 border border-[var(--border-subtle)] rounded text-xs bg-[var(--color-light-gray)] text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]"
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
                className="flex items-center gap-1 text-[10px] text-[var(--color-gold)] hover:text-[var(--color-blue)]"
              >
                <Plus size={10} /> Add schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Negative Keywords */}
      <NegativeKeywordsPanel config={config} setConfig={setConfig} />
    </div>
  )
}

/* ── Negative Keywords Panel ── */

function NegativeKeywordsPanel({
  config,
  setConfig,
}: {
  config: CampaignConfig
  setConfig: React.Dispatch<React.SetStateAction<CampaignConfig>>
}) {
  const [newNegative, setNewNegative] = useState('')

  function addNegative() {
    if (!newNegative.trim()) return
    setConfig(prev => ({ ...prev, negativeKeywords: [...prev.negativeKeywords, newNegative.trim().toLowerCase()] }))
    setNewNegative('')
  }

  function removeNegative(kw: string) {
    setConfig(prev => ({ ...prev, negativeKeywords: prev.negativeKeywords.filter(n => n !== kw) }))
  }

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
      <h5 className="text-xs font-semibold text-[var(--color-dark)] mb-2">Negative Keywords ({config.negativeKeywords.length})</h5>
      <p className="text-[10px] text-[var(--color-mid-gray)] mb-2">Prevent your ads from showing on these searches</p>
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
          className="flex-1 px-2 py-1 border border-[var(--border-subtle)] rounded text-xs bg-[var(--color-light-gray)] text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]"
        />
        <button onClick={addNegative} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
          <Plus size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── Keywords Panel ── */

export function KeywordsPanel({
  keywords,
  config,
  loading,
  error,
  expandedGroup,
  setExpandedGroup,
  generateKeywords,
  toggleKeyword,
}: {
  keywords: KeywordIdea[]
  config: CampaignConfig
  loading: boolean
  error: string | null
  expandedGroup: string | null
  setExpandedGroup: (group: string | null) => void
  generateKeywords: () => void
  toggleKeyword: (kw: KeywordIdea) => void
}) {
  // Group keywords
  const groups = keywords.reduce<Record<string, KeywordIdea[]>>((acc, kw) => {
    const g = kw.group || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(kw)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-[var(--color-dark)]">Keywords ({config.keywords.length} selected)</h5>
        <button
          onClick={generateKeywords}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-[var(--color-light-gray)]">
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-dark)]">${avgCPC.toFixed(2)}</p>
              <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Avg CPC</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-dark)]">{Math.round(estimatedClicksDay)}</p>
              <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Clicks/Day</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-dark)]">${Math.round(estimatedCostDay)}</p>
              <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Est. Cost/Day</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-emerald-400">${estimatedCostMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] uppercase text-[var(--color-mid-gray)]">Est. Cost/Mo</p>
            </div>
          </div>
        )
      })()}

      {/* Empty state */}
      {keywords.length === 0 && !loading && (
        <div className="text-center py-8 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <Search size={24} className="mx-auto mb-2 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">Generate AI-powered keyword suggestions</p>
          <p className="text-[10px] text-[var(--color-mid-gray)] mt-1">Based on facility data, location, and market analysis</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
        </div>
      )}

      {/* Keyword groups */}
      {Object.entries(groups).map(([group, kws]) => (
        <div key={group} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
          <button
            onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
            className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-[var(--color-light-gray)] transition-colors"
          >
            <span className="text-xs font-semibold flex-1 text-[var(--color-dark)]">{group}</span>
            <span className="text-[10px] text-[var(--color-mid-gray)]">
              {kws.filter(k => config.keywords.some(ck => ck.keyword === k.keyword)).length}/{kws.length}
            </span>
            {expandedGroup === group ? <ChevronUp size={12} className="text-[var(--color-mid-gray)]" /> : <ChevronDown size={12} className="text-[var(--color-mid-gray)]" />}
          </button>
          {expandedGroup === group && (
            <div className="border-t border-[var(--border-subtle)]">
              {kws.map(kw => {
                const selected = config.keywords.some(k => k.keyword === kw.keyword)
                return (
                  <button
                    key={kw.keyword}
                    onClick={() => toggleKeyword(kw)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--color-light-gray)] ${
                      selected ? 'bg-[var(--color-gold)]/5' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-[var(--color-gold)] border-[var(--color-gold)]' : 'border-[var(--color-dark)]/20'
                    }`}>
                      {selected && <span className="text-white text-[8px]">&#10003;</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-dark)]">{kw.keyword}</p>
                      <p className="text-[10px] text-[var(--color-mid-gray)] truncate">{kw.rationale}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${INTENT_COLORS[kw.intent]}`}>{kw.intent}</span>
                      <span className={`text-[10px] font-mono ${COMPETITION_COLORS[kw.competition]}`}>${kw.estimatedCPC.toFixed(2)}</span>
                      <span className="text-[10px] text-[var(--color-mid-gray)]">{kw.estimatedVolume}/mo</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
