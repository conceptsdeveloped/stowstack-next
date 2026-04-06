'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react'
import type { IntelData } from './revenue-analytics/types'
import MetricsStrip from './revenue-analytics/metrics-strip'
import UnitMixTable from './revenue-analytics/unit-mix-table'
import RevenueLossAnalysis from './revenue-analytics/revenue-loss-analysis'
import HealthAndTrends from './revenue-analytics/health-and-trends'
import ProjectionsAndDetails from './revenue-analytics/projections-and-details'

/* ══════════════════════════════════════════════════════════
   Revenue Analytics — Orchestrator
══════════════════════════════════════════════════════════ */

export default function RevenueAnalytics({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [data, setData] = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/revenue-intelligence?facilityId=${facilityId}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [facilityId, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <Loader2 className="animate-spin mx-auto mb-2 text-[var(--color-gold)]" size={24} />
        <p className="text-[var(--color-body-text)]">Loading revenue intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-[var(--color-gold)] hover:underline">Try again</button>
      </div>
    )
  }

  if (!data || data.units.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <BarChart3 className="mx-auto mb-3 text-[var(--color-mid-gray)]" size={40} />
        <h3 className="text-lg font-semibold text-[var(--color-dark)]">No PMS Data Yet</h3>
        <p className="text-sm mt-1 text-[var(--color-body-text)]">
          Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power revenue intelligence.
        </p>
      </div>
    )
  }

  const { summary, units, ecri_tenants, rate_distribution, revenue_history, health, waterfall, sqft_analysis, seasonal_pattern, aging } = data

  return (
    <div className="space-y-4">
      <MetricsStrip summary={summary} />

      <UnitMixTable
        units={units}
        summary={summary}
        expanded={expandedSection === 'overview'}
        onToggle={() => toggle('overview')}
      />

      <RevenueLossAnalysis
        units={units}
        ecriTenants={ecri_tenants}
        rateDistribution={rate_distribution}
        summary={summary}
        expandedSection={expandedSection}
        toggle={toggle}
      />

      <HealthAndTrends
        revenueHistory={revenue_history}
        health={health}
        waterfall={waterfall}
        expandedSection={expandedSection}
        toggle={toggle}
      />

      <ProjectionsAndDetails
        units={units}
        summary={summary}
        sqftAnalysis={sqft_analysis}
        seasonalPattern={seasonal_pattern}
        aging={aging}
        expandedSection={expandedSection}
        toggle={toggle}
      />
    </div>
  )
}
