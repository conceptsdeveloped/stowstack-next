"use client"

import { useState, useEffect, useCallback } from "react"
import type { ContextDoc, MarketingPlan } from "./types"

export function useFacilityOverviewData(facilityId: string, adminKey: string) {
  const [contextDocs, setContextDocs] = useState<ContextDoc[]>([])
  const [plan, setPlan] = useState<MarketingPlan | null>(null)
  const [allPlans, setAllPlans] = useState<MarketingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [competitorCount, setCompetitorCount] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ctxRes, planRes] = await Promise.all([
        fetch(`/api/facility-context?facilityId=${facilityId}`, {
          headers: { "X-Admin-Key": adminKey },
        }),
        fetch(`/api/marketing-plan?facilityId=${facilityId}`, {
          headers: { "X-Admin-Key": adminKey },
        }),
      ])

      const ctxData = await ctxRes.json()
      const planData = await planRes.json()

      if (ctxData.docs) setContextDocs(ctxData.docs)
      if (planData.plan) {
        setPlan(planData.plan)
      }
      if (planData.plans) setAllPlans(planData.plans)
    } catch {
      setError("Failed to load facility data")
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Try to fetch market intel competitor count
  useEffect(() => {
    fetch(`/api/market-intel?facilityId=${facilityId}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.intel?.competitors?.length != null) {
          setCompetitorCount(data.intel.competitors.length)
        }
      })
      .catch(() => {})
  }, [facilityId, adminKey])

  return {
    contextDocs,
    setContextDocs,
    plan,
    setPlan,
    allPlans,
    setAllPlans,
    loading,
    error,
    setError,
    competitorCount,
  }
}
