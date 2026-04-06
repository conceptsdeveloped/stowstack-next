'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Building2 } from 'lucide-react'

import type { OccData } from './occupancy-intelligence/shared'
import { HeroSection } from './occupancy-intelligence/hero-section'
import { InsightsSection, GapDecompositionSection } from './occupancy-intelligence/gap-and-insights'
import { UnitTypeHeatmap } from './occupancy-intelligence/unit-type-heatmap'
import {
  TrendSection, DelinquencySection, DiscountsSection, BelowStreetBandsSection,
} from './occupancy-intelligence/trend-and-delinquency'

export default function OccupancyIntelligence({ facilityId, adminKey }: {
  facilityId: string
  adminKey: string
}) {
  const [data, setData] = useState<OccData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/occupancy-intelligence?facilityId=${facilityId}`, {
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
        <p className="text-[var(--color-body-text)]">Loading occupancy intelligence...</p>
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

  if (!data || data.unit_occupancy.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
        <Building2 className="mx-auto mb-3 text-[var(--color-mid-gray)]" size={40} />
        <h3 className="text-lg font-semibold text-[var(--color-dark)]">No PMS Data Yet</h3>
        <p className="text-sm mt-1 text-[var(--color-body-text)]">
          Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power occupancy intelligence.
        </p>
      </div>
    )
  }

  const {
    facility_level: fl,
    gap_decomposition: gd,
    aging_buckets: ab,
    unit_occupancy: unitOcc,
    occupancy_trend: trend,
    discounted_tenants: discTenants,
    below_street_bands: bands,
    delinquent_tenants: delTenants,
    insights,
  } = data

  return (
    <div className="space-y-4">
      <HeroSection fl={fl} gd={gd} />

      <InsightsSection
        insights={insights}
        expanded={expandedSection === 'insights'}
        onToggle={() => toggle('insights')}
      />

      <GapDecompositionSection
        fl={fl} gd={gd} ab={ab} discTenants={discTenants} bands={bands}
        expanded={expandedSection === 'gap'}
        onToggle={() => toggle('gap')}
      />

      <UnitTypeHeatmap
        unitOcc={unitOcc} fl={fl} gd={gd}
        expanded={expandedSection === 'heatmap'}
        onToggle={() => toggle('heatmap')}
      />

      <TrendSection
        trend={trend}
        expanded={expandedSection === 'trend'}
        onToggle={() => toggle('trend')}
      />

      <DelinquencySection
        delTenants={delTenants} ab={ab} fl={fl} gd={gd}
        expanded={expandedSection === 'delinquency'}
        onToggle={() => toggle('delinquency')}
      />

      <DiscountsSection
        discTenants={discTenants} gd={gd}
        expanded={expandedSection === 'discounts'}
        onToggle={() => toggle('discounts')}
      />

      <BelowStreetBandsSection
        bands={bands}
        expanded={expandedSection === 'bands'}
        onToggle={() => toggle('bands')}
      />
    </div>
  )
}
