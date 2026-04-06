"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"

import { useFacilityOverviewData } from "./facility-overview/use-facility-overview-data"
import { FacilityInfoCard } from "./facility-overview/facility-info-card"
import { GooglePhotosGallery, GoogleReviewsList } from "./facility-overview/google-places-section"
import { MarketIntelPreview } from "./facility-overview/market-intel-preview"
import { ContextDocuments } from "./facility-overview/context-documents"
import {
  SeasonalPlaybooks,
  GeneratePlanButton,
} from "./facility-overview/marketing-plan-section"
import { MarketingPlanDisplay } from "./facility-overview/marketing-plan-display"
import type { FacilityProp, MarketingPlan } from "./facility-overview/types"

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FacilityOverview({
  facility,
  adminKey,
  onUpdate,
}: {
  facility: FacilityProp
  adminKey: string
  onUpdate: () => void
}) {
  const {
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
  } = useFacilityOverviewData(facility.id, adminKey)

  // ---- Plan generation ----
  const [generating, setGenerating] = useState(false)
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<string[]>(
    () => plan?.assigned_playbooks ?? []
  )

  // Sync playbooks when plan loads (initial load returns after mount)
  // The hook sets plan asynchronously, so we track it
  const resolvedPlaybooks =
    selectedPlaybooks.length > 0
      ? selectedPlaybooks
      : plan?.assigned_playbooks ?? []

  // ---- Marketing plan generation ----
  async function generatePlan() {
    setGenerating(true)
    try {
      const res = await fetch("/api/marketing-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId: facility.id,
          playbooks: resolvedPlaybooks,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        setError(
          `Plan generation failed (${res.status}): ${errText.slice(0, 200)}`
        )
        return
      }
      const data = await res.json()
      if (data.plan) {
        setPlan(data.plan)
        if (data.plan.assigned_playbooks?.length) {
          setSelectedPlaybooks(data.plan.assigned_playbooks)
        }
        if (data.plans) setAllPlans(data.plans)
      } else if (data.error) {
        setError(`Error: ${data.error}`)
      }
    } catch (err) {
      setError(
        `Plan generation failed: ${err instanceof Error ? err.message : "Network error"}`
      )
    } finally {
      setGenerating(false)
    }
  }

  function togglePlaybook(id: string) {
    setSelectedPlaybooks((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function selectPlanVersion(planId: string) {
    const selected = allPlans.find((p: MarketingPlan) => p.id === planId)
    if (selected) setPlan(selected)
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  // ---- Derived values ----
  const googlePhotos: string[] = facility.google_photos || []
  const googleReviews = facility.google_reviews || []

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <X size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <FacilityInfoCard
        facility={facility}
        adminKey={adminKey}
        onUpdate={onUpdate}
      />

      <GooglePhotosGallery
        photos={googlePhotos}
        facilityName={facility.name}
      />

      <GoogleReviewsList reviews={googleReviews} />

      {competitorCount !== null && (
        <MarketIntelPreview competitorCount={competitorCount} />
      )}

      <ContextDocuments
        facilityId={facility.id}
        adminKey={adminKey}
        contextDocs={contextDocs}
        setContextDocs={setContextDocs}
      />

      <SeasonalPlaybooks
        selectedPlaybooks={resolvedPlaybooks}
        onTogglePlaybook={togglePlaybook}
      />

      <GeneratePlanButton
        generating={generating}
        hasPlan={!!plan}
        onGenerate={generatePlan}
      />

      {plan && plan.plan_json && (
        <MarketingPlanDisplay
          plan={plan}
          allPlans={allPlans}
          onSelectVersion={selectPlanVersion}
        />
      )}
    </div>
  )
}
