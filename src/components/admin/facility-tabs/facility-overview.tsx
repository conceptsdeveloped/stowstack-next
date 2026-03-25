"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2,
  FileText,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  Zap,
  Plus,
  Edit3,
  Check,
  X,
  Star,
  MapPin,
  ExternalLink,
  Globe,
  Phone,
  Mail,
  User,
  Building2,
  ImageOff,
  Image as ImageIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContextDoc {
  id: string
  facility_id: string
  created_at: string
  type: string
  title: string
  content: string | null
  file_url: string | null
  metadata: Record<string, unknown>
}

interface MarketingPlan {
  id: string
  facility_id: string
  created_at: string
  version: number
  status: string
  plan_json: {
    summary?: string
    bottleneck_analysis?: string
    target_audiences?: {
      segment: string
      description: string
      messaging_angle: string
      channels: string[]
    }[]
    messaging_pillars?: {
      pillar: string
      rationale: string
      example_headline: string
    }[]
    channel_strategy?: {
      channel: string
      budget_pct: number
      objective: string
      tactics: string[]
    }[]
    content_calendar?: {
      week: number
      focus: string
      deliverables: string[]
      channels: string[]
    }[]
    kpis?: { metric: string; target: string; timeframe: string }[]
    quick_wins?: string[]
    strategic_rationale?: string[]
  }
  spend_recommendation: {
    budgetTier: string
    monthlyBudget: { min: number; max: number }
    channels: Record<string, number>
    reasoning: string[]
  } | null
  assigned_playbooks: string[]
}

interface GoogleReview {
  author_name: string
  rating: number
  text: string
  time: number
  relative_time_description?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTEXT_TYPES = [
  { id: "competitor_info", label: "Competitor Info" },
  { id: "pricing_sheet", label: "Pricing / Rate Card" },
  { id: "branding_guide", label: "Branding Guidelines" },
  { id: "business_plan", label: "Business Plan" },
  { id: "market_analysis", label: "Market Analysis" },
  { id: "other", label: "Other" },
]

const PLAYBOOK_OPTIONS = [
  {
    id: "spring_cleaning",
    label: "Spring Cleaning & Declutter",
    description: "Target spring cleaners and organizers clearing out space",
  },
  {
    id: "summer_moves",
    label: "Summer Moving Season",
    description: "Peak moving season campaigns for families and renters",
  },
  {
    id: "college_season",
    label: "College Move-In/Out",
    description: "Student storage during breaks and semester transitions",
  },
  {
    id: "holiday_storage",
    label: "Holiday Decoration Storage",
    description: "Seasonal decoration and holiday item storage",
  },
  {
    id: "new_year_declutter",
    label: "New Year Declutter",
    description: "Resolution-driven decluttering and organization",
  },
  {
    id: "tax_season",
    label: "Tax Season (Business Storage)",
    description: "Business document and records storage for tax prep",
  },
  {
    id: "moving_season",
    label: "General Moving Season",
    description: "Year-round moving and relocation storage needs",
  },
  {
    id: "military_pcs",
    label: "Military PCS / Deployment",
    description: "Storage for military families during moves and deployments",
  },
  {
    id: "downsizing",
    label: "Estate / Downsizing",
    description: "Seniors and families downsizing homes needing overflow storage",
  },
  {
    id: "renovation",
    label: "Home Renovation",
    description: "Temporary storage during home remodeling projects",
  },
  {
    id: "business_storage",
    label: "B2B / Commercial Tenants",
    description: "Commercial storage for inventory, equipment, and supplies",
  },
  {
    id: "vehicle_storage",
    label: "Vehicle & Boat Storage",
    description: "Seasonal vehicle, RV, and boat storage solutions",
  },
  {
    id: "seasonal_items",
    label: "Seasonal Items",
    description: "Rotating seasonal gear, sports equipment, and clothing",
  },
]

const BUDGET_TIER_COLORS: Record<string, string> = {
  aggressive: "bg-red-500/20 text-red-400 border border-red-500/30",
  growth: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  steady: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  optimize: "bg-[var(--color-blue)]/20 text-[var(--color-blue)] border border-[var(--color-blue)]/30",
  maintain: "bg-[var(--color-light-gray)] text-[var(--color-body-text)] border border-[var(--border-subtle)]",
}

const OCCUPANCY_OPTIONS = [
  { value: "", label: "Select occupancy range" },
  { value: "below-60", label: "Below 60%" },
  { value: "60-75", label: "60-75%" },
  { value: "75-85", label: "75-85%" },
  { value: "85-95", label: "85-95%" },
  { value: "above-95", label: "Above 95%" },
]

const BIGGEST_ISSUE_OPTIONS = [
  { value: "", label: "Select biggest challenge" },
  { value: "low_occupancy", label: "Low Occupancy" },
  { value: "competition", label: "Too Much Competition" },
  { value: "pricing", label: "Pricing Pressure" },
  { value: "marketing", label: "No Marketing Strategy" },
  { value: "retention", label: "Tenant Retention" },
  { value: "online_presence", label: "Weak Online Presence" },
  { value: "reviews", label: "Bad/No Reviews" },
  { value: "other", label: "Other" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400 text-sm font-semibold">
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} size={12} fill="currentColor" />
      ))}
      {half && <Star size={12} fill="currentColor" className="opacity-50" />}
      <span className="ml-1 text-[var(--color-dark)]">{rating}</span>
    </span>
  )
}

function PhotoWithFallback({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  return (
    <div className="relative w-40 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
      {status === "loading" && (
        <div className="absolute inset-0 bg-[var(--color-light-gray)] animate-pulse flex items-center justify-center">
          <ImageIcon size={16} className="text-[var(--color-mid-gray)]" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <ImageOff size={16} className="text-[var(--color-mid-gray)]" />
          <span className="text-[10px] text-[var(--color-mid-gray)]">Failed</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          status === "loaded"
            ? "opacity-100"
            : status === "error"
              ? "hidden"
              : "opacity-0"
        }`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  expandedSection,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: typeof Target
  expandedSection: string | null
  onToggle: (id: string) => void
  children: React.ReactNode
}) {
  const isOpen = expandedSection === id
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-light-gray)] transition-colors"
      >
        <Icon size={14} className="text-[var(--color-mid-gray)]" />
        <span className="text-sm font-medium flex-1 text-[var(--color-dark)]">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp size={14} className="text-[var(--color-mid-gray)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-mid-gray)]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FacilityOverview({
  facility,
  adminKey,
  onUpdate,
}: {
  facility: any
  adminKey: string
  onUpdate: () => void
}) {
  // ---- Core state ----
  const [contextDocs, setContextDocs] = useState<ContextDoc[]>([])
  const [plan, setPlan] = useState<MarketingPlan | null>(null)
  const [allPlans, setAllPlans] = useState<MarketingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- Plan generation ----
  const [generating, setGenerating] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "summary"
  )

  // ---- Context docs ----
  const [addingDoc, setAddingDoc] = useState(false)
  const [newDocType, setNewDocType] = useState("competitor_info")
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocContent, setNewDocContent] = useState("")
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // ---- Playbooks ----
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<string[]>([])
  const [showPlaybooks, setShowPlaybooks] = useState(false)

  // ---- Facility edit form ----
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFields, setEditFields] = useState({
    name: facility.name || "",
    contact_name: facility.contact_name || "",
    contact_email: facility.contact_email || "",
    contact_phone: facility.contact_phone || "",
    website: facility.website || "",
    google_address: facility.google_address || "",
    occupancy_range: facility.occupancy_range || "",
    total_units: facility.total_units || "",
    biggest_issue: facility.biggest_issue || "",
    notes: facility.notes || "",
  })

  // ---- Market intel preview ----
  const [competitorCount, setCompetitorCount] = useState<number | null>(null)

  // ---- Load data ----
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ctxRes, planRes] = await Promise.all([
        fetch(`/api/facility-context?facilityId=${facility.id}`, {
          headers: { "X-Admin-Key": adminKey },
        }),
        fetch(`/api/marketing-plan?facilityId=${facility.id}`, {
          headers: { "X-Admin-Key": adminKey },
        }),
      ])

      const ctxData = await ctxRes.json()
      const planData = await planRes.json()

      if (ctxData.docs) setContextDocs(ctxData.docs)
      if (planData.plan) {
        setPlan(planData.plan)
        if (planData.plan.assigned_playbooks?.length) {
          setSelectedPlaybooks(planData.plan.assigned_playbooks)
        }
      }
      if (planData.plans) setAllPlans(planData.plans)
    } catch {
      setError("Failed to load facility data")
    } finally {
      setLoading(false)
    }
  }, [facility.id, adminKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Try to fetch market intel competitor count
  useEffect(() => {
    fetch(`/api/market-intel?facilityId=${facility.id}`, {
      headers: { "X-Admin-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.intel?.competitors?.length != null) {
          setCompetitorCount(data.intel.competitors.length)
        }
      })
      .catch(() => {})
  }, [facility.id, adminKey])

  // ---- Context doc actions ----
  async function addContextDoc() {
    if (!newDocTitle.trim()) return
    try {
      const res = await fetch("/api/facility-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId: facility.id,
          type: newDocType,
          title: newDocTitle.trim(),
          content: newDocContent.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.doc) setContextDocs((prev) => [data.doc, ...prev])
      setNewDocTitle("")
      setNewDocContent("")
      setAddingDoc(false)
    } catch {
      // Silently fail — user can retry
    }
  }

  async function deleteDoc(docId: string) {
    setDeletingDocId(docId)
    try {
      await fetch("/api/facility-context", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ docId }),
      })
      setContextDocs((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      // Silently fail
    } finally {
      setDeletingDocId(null)
    }
  }

  // ---- Facility edit actions ----
  async function saveFacilityEdits() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin-facilities", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ id: facility.id, ...editFields }),
      })
      const data = await res.json()
      if (data.facility) {
        onUpdate()
      }
      setEditing(false)
    } catch {
      // Keep editing mode open on failure
    } finally {
      setSaving(false)
    }
  }

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
          playbooks: selectedPlaybooks,
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

  function toggleSection(id: string) {
    setExpandedSection((prev) => (prev === id ? null : id))
  }

  function selectPlanVersion(planId: string) {
    const selected = allPlans.find((p) => p.id === planId)
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
  const p = plan?.plan_json

  const googlePhotos: string[] = facility.google_photos || []
  const googleReviews: GoogleReview[] = facility.google_reviews || []

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

      {/* ================================================================= */}
      {/* FACILITY INFO CARD — editable                                     */}
      {/* ================================================================= */}
      <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[var(--color-gold)]" />
            <h4 className="text-sm font-semibold text-[var(--color-dark)]">
              {facility.name}
            </h4>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)] transition-colors"
            >
              <Edit3 size={11} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveFacilityEdits}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
              >
                {saving ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Check size={11} />
                )}{" "}
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 px-3 py-1 text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)] transition-colors"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 border-t border-[var(--border-subtle)]">
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm pt-4">
              {/* Contact column */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)]">
                  Contact
                </p>
                <input
                  value={editFields.name}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Facility name"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
                <input
                  value={editFields.contact_name}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      contact_name: e.target.value,
                    }))
                  }
                  placeholder="Contact name"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
                <input
                  value={editFields.contact_email}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      contact_email: e.target.value,
                    }))
                  }
                  placeholder="Email"
                  type="email"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
                <input
                  value={editFields.contact_phone}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      contact_phone: e.target.value,
                    }))
                  }
                  placeholder="Phone"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
              </div>

              {/* Facility info column */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)]">
                  Facility Info
                </p>
                <input
                  value={editFields.website}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, website: e.target.value }))
                  }
                  placeholder="Website URL"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
                <input
                  value={editFields.google_address}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      google_address: e.target.value,
                    }))
                  }
                  placeholder="Google address"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
                <select
                  value={editFields.occupancy_range}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      occupancy_range: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                >
                  {OCCUPANCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  value={editFields.total_units}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      total_units: e.target.value,
                    }))
                  }
                  placeholder="Total units"
                  type="number"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
              </div>

              {/* Challenge column */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)]">
                  Challenge
                </p>
                <select
                  value={editFields.biggest_issue}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      biggest_issue: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                >
                  {BIGGEST_ISSUE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes — full width */}
              <div className="sm:col-span-3">
                <textarea
                  value={editFields.notes}
                  onChange={(e) =>
                    setEditFields((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Notes about this facility..."
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm pt-4">
              {/* Contact display */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)] mb-2">
                  Contact
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-[var(--color-mid-gray)]" />
                    <p className="text-[var(--color-dark)]">
                      {facility.contact_name || (
                        <span className="text-[var(--color-mid-gray)]">--</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-[var(--color-mid-gray)]" />
                    <p className="text-[var(--color-body-text)]">
                      {facility.contact_email || "--"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-[var(--color-mid-gray)]" />
                    <p className="text-[var(--color-body-text)]">
                      {facility.contact_phone || "--"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Facility info display */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)] mb-2">
                  Facility Info
                </p>
                <div className="space-y-1.5">
                  <p className="text-[var(--color-dark)]">
                    Occupancy: {facility.occupancy_range || "--"}
                  </p>
                  <p className="text-[var(--color-dark)]">
                    Units: {facility.total_units || "--"}
                  </p>
                  <p className="text-[var(--color-dark)]">
                    Issue:{" "}
                    {facility.biggest_issue
                      ? BIGGEST_ISSUE_OPTIONS.find(
                          (o) => o.value === facility.biggest_issue
                        )?.label || facility.biggest_issue
                      : "--"}
                  </p>
                </div>
              </div>

              {/* Google data display */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)] mb-2">
                  Google Data
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-[var(--color-mid-gray)]" />
                    <p className="text-[var(--color-body-text)] text-xs">
                      {facility.google_address || "--"}
                    </p>
                  </div>
                  {facility.google_rating && (
                    <StarRating rating={facility.google_rating} />
                  )}
                  {facility.review_count != null && (
                    <p className="text-xs text-[var(--color-body-text)]">
                      {facility.review_count} reviews
                    </p>
                  )}
                  {facility.google_phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[var(--color-mid-gray)]" />
                      <p className="text-xs text-[var(--color-body-text)]">
                        {facility.google_phone}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {facility.website && (
                      <a
                        href={facility.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-gold)] hover:text-[var(--color-blue)] transition-colors"
                      >
                        <Globe size={10} /> Website
                        <ExternalLink size={9} />
                      </a>
                    )}
                    {facility.google_maps_url && (
                      <a
                        href={facility.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-gold)] hover:text-[var(--color-blue)] transition-colors"
                      >
                        <MapPin size={10} /> Maps
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes display */}
              {facility.notes && (
                <div className="sm:col-span-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mid-gray)] mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-[var(--color-dark)]">{facility.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* GOOGLE PLACES PHOTO GALLERY                                       */}
      {/* ================================================================= */}
      {googlePhotos.length > 0 && (
        <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-[var(--color-gold)]" />
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                Google Photos
              </h4>
              <span className="text-[10px] text-[var(--color-mid-gray)]">
                ({googlePhotos.length})
              </span>
            </div>
          </div>
          <div className="px-5 pb-4">
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "thin" }}
            >
              {googlePhotos.map((url: string, i: number) => (
                <PhotoWithFallback
                  key={i}
                  src={url}
                  alt={`${facility.name} photo ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* GOOGLE REVIEWS                                                    */}
      {/* ================================================================= */}
      {googleReviews.length > 0 && (
        <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-400" />
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                Top Reviews
              </h4>
              <span className="text-[10px] text-[var(--color-mid-gray)]">
                ({googleReviews.length})
              </span>
            </div>
          </div>
          <div className="px-5 pb-4 space-y-3">
            {googleReviews.slice(0, 5).map((review, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: review.rating }, (_, j) => (
                      <Star key={j} size={10} fill="currentColor" />
                    ))}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-dark)]">
                    {review.author_name}
                  </span>
                  {review.relative_time_description && (
                    <span className="text-[10px] text-[var(--color-mid-gray)]">
                      {review.relative_time_description}
                    </span>
                  )}
                </div>
                {review.text && (
                  <p className="text-xs text-[var(--color-body-text)] leading-relaxed line-clamp-3">
                    {review.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MARKET INTELLIGENCE PREVIEW                                       */}
      {/* ================================================================= */}
      {competitorCount !== null && (
        <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-[var(--color-gold)]" />
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                Market Intelligence
              </h4>
            </div>
            <span className="text-xs text-[var(--color-body-text)]">
              {competitorCount} competitor{competitorCount !== 1 ? "s" : ""}{" "}
              found
            </span>
          </div>
          <p className="text-xs text-[var(--color-mid-gray)] mt-1">
            View the Market Intel tab for full competitor analysis, demand
            drivers, and demographics.
          </p>
        </div>
      )}

      {/* ================================================================= */}
      {/* CONTEXT DOCUMENTS                                                 */}
      {/* ================================================================= */}
      <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[var(--color-gold)]" />
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                Business Context
              </h4>
            </div>
            <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
              Upload competitor info, pricing sheets, branding docs — anything
              that informs the marketing strategy
            </p>
          </div>
          <button
            onClick={() => setAddingDoc(!addingDoc)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] transition-colors flex-shrink-0"
          >
            <Plus size={12} /> Add Context
          </button>
        </div>

        {/* Add new doc form */}
        {addingDoc && (
          <div className="px-5 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div>
                <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
                  Type
                </label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                >
                  {CONTEXT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
                  Title
                </label>
                <input
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g., Local competitor analysis"
                  className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-mid-gray)] block mb-1">
                Content
              </label>
              <textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                rows={4}
                placeholder="Paste competitor info, pricing details, market notes, branding guidelines, or any business context that should inform the marketing plan..."
                className="w-full px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addContextDoc}
                disabled={!newDocTitle.trim()}
                className="px-4 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setAddingDoc(false)}
                className="px-4 py-1.5 text-xs text-[var(--color-body-text)] hover:text-[var(--color-dark)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Document list */}
        {contextDocs.length > 0 ? (
          <div
            className={`px-5 pb-4 space-y-2 ${addingDoc ? "" : "border-t border-[var(--border-subtle)] pt-3"}`}
          >
            {contextDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-light-gray)]"
              >
                <FileText size={16} className="text-[var(--color-mid-gray)] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-dark)]">
                      {doc.title}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]">
                      {CONTEXT_TYPES.find((t) => t.id === doc.type)?.label ||
                        doc.type}
                    </span>
                  </div>
                  {doc.content && (
                    <p className="text-xs text-[var(--color-mid-gray)] mt-1 line-clamp-2">
                      {doc.content}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="p-1 text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                >
                  {deletingDocId === doc.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          !addingDoc && (
            <div className="px-5 pb-4 border-t border-[var(--border-subtle)] pt-3">
              <p className="text-xs text-[var(--color-mid-gray)] text-center py-4">
                No context documents yet. Add competitor info, pricing sheets,
                or branding guides to improve marketing plan quality.
              </p>
            </div>
          )
        )}
      </div>

      {/* ================================================================= */}
      {/* SEASONAL PLAYBOOKS                                                */}
      {/* ================================================================= */}
      <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]">
        <button
          onClick={() => setShowPlaybooks(!showPlaybooks)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="text-left">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--color-gold)]" />
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                Seasonal Playbooks
              </h4>
            </div>
            <p className="text-xs text-[var(--color-mid-gray)] mt-0.5">
              {selectedPlaybooks.length
                ? `${selectedPlaybooks.length} playbook${selectedPlaybooks.length !== 1 ? "s" : ""} selected`
                : "Assign seasonal strategies to include in the marketing plan"}
            </p>
          </div>
          {showPlaybooks ? (
            <ChevronUp size={14} className="text-[var(--color-mid-gray)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--color-mid-gray)]" />
          )}
        </button>
        {showPlaybooks && (
          <div className="px-5 pb-4 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
              {PLAYBOOK_OPTIONS.map((pb) => {
                const isSelected = selectedPlaybooks.includes(pb.id)
                return (
                  <button
                    key={pb.id}
                    onClick={() => togglePlaybook(pb.id)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-[var(--color-gold)]/10 text-[var(--color-blue)] border-[var(--color-gold)]/30"
                        : "border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] hover:text-[var(--color-dark)]"
                    }`}
                  >
                    <p className="text-xs font-medium">{pb.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${isSelected ? "text-[var(--color-gold)]/70" : "text-[var(--color-mid-gray)]"}`}
                    >
                      {pb.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* GENERATE MARKETING PLAN BUTTON                                    */}
      {/* ================================================================= */}
      <div>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-semibold rounded-xl hover:bg-[var(--color-gold-hover)] disabled:opacity-40 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Generating
              Marketing Plan...
            </>
          ) : (
            <>
              <Sparkles size={16} />{" "}
              {plan ? "Regenerate Marketing Plan" : "Generate Marketing Plan"}
            </>
          )}
        </button>
        <p className="text-[10px] text-[var(--color-mid-gray)] text-center mt-2">
          Uses facility data, business context, reviews, playbooks, and spend
          analysis
        </p>
      </div>

      {/* ================================================================= */}
      {/* MARKETING PLAN DISPLAY                                            */}
      {/* ================================================================= */}
      {plan && p && (
        <div className="space-y-3">
          {/* Plan header with version selector */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-dark)]">
              Marketing Plan v{plan.version}
            </h4>
            <div className="flex items-center gap-3">
              {allPlans.length > 1 && (
                <select
                  value={plan.id}
                  onChange={(e) => selectPlanVersion(e.target.value)}
                  className="text-[10px] px-2 py-1 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded text-[var(--color-body-text)] focus:outline-none"
                >
                  {allPlans.map((ap) => (
                    <option key={ap.id} value={ap.id}>
                      v{ap.version} —{" "}
                      {new Date(ap.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-[10px] text-[var(--color-mid-gray)]">
                {new Date(plan.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Spend Recommendation Banner */}
          {plan.spend_recommendation && (
            <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <h5 className="text-sm font-semibold text-[var(--color-dark)]">
                  Ad Spend Recommendation
                </h5>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                    BUDGET_TIER_COLORS[
                      plan.spend_recommendation.budgetTier
                    ] || ""
                  }`}
                >
                  {plan.spend_recommendation.budgetTier}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                    Monthly Budget
                  </p>
                  <p className="text-lg font-bold text-[var(--color-dark)]">
                    $
                    {plan.spend_recommendation.monthlyBudget.min.toLocaleString()}{" "}
                    - $
                    {plan.spend_recommendation.monthlyBudget.max.toLocaleString()}
                  </p>
                </div>
                {Object.entries(plan.spend_recommendation.channels).map(
                  ([ch, pct]) => (
                    <div key={ch}>
                      <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                        {ch.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-dark)]">
                        {pct}%
                      </p>
                    </div>
                  )
                )}
              </div>
              {plan.spend_recommendation.reasoning?.length > 0 && (
                <div className="space-y-1">
                  {plan.spend_recommendation.reasoning.map(
                    (r: string, i: number) => (
                      <p key={i} className="text-xs text-[var(--color-body-text)]">
                        &bull; {r}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {p.summary && (
            <div className="p-4 rounded-xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20">
              <p className="text-sm text-[var(--color-dark)] leading-relaxed">
                {p.summary}
              </p>
            </div>
          )}

          {/* Bottleneck Analysis */}
          {p.bottleneck_analysis && (
            <CollapsibleSection
              id="bottleneck"
              title="Bottleneck Analysis"
              icon={Target}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <p className="text-sm text-[var(--color-dark)] mt-3 leading-relaxed">
                {p.bottleneck_analysis}
              </p>
            </CollapsibleSection>
          )}

          {/* Strategic Rationale */}
          {p.strategic_rationale && p.strategic_rationale.length > 0 && (
            <CollapsibleSection
              id="rationale"
              title="Strategic Rationale"
              icon={Zap}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-3">
                {p.strategic_rationale.map((r, i) => (
                  <p
                    key={i}
                    className="text-sm text-[var(--color-dark)] leading-relaxed"
                  >
                    {r}
                  </p>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Target Audiences */}
          {p.target_audiences && p.target_audiences.length > 0 && (
            <CollapsibleSection
              id="audiences"
              title={`Target Audiences (${p.target_audiences.length})`}
              icon={Target}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-3">
                {p.target_audiences.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <p className="text-sm font-semibold text-[var(--color-dark)]">
                      {a.segment}
                    </p>
                    <p className="text-xs text-[var(--color-body-text)] mt-1">
                      {a.description}
                    </p>
                    <p className="text-xs text-[var(--color-dark)] mt-1">
                      <span className="text-[var(--color-mid-gray)]">Angle:</span>{" "}
                      {a.messaging_angle}
                    </p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {a.channels.map((ch) => (
                        <span
                          key={ch}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Messaging Pillars */}
          {p.messaging_pillars && p.messaging_pillars.length > 0 && (
            <CollapsibleSection
              id="messaging"
              title={`Messaging Pillars (${p.messaging_pillars.length})`}
              icon={Target}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-3">
                {p.messaging_pillars.map((m, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <p className="text-sm font-semibold text-[var(--color-dark)]">
                      {m.pillar}
                    </p>
                    <p className="text-xs text-[var(--color-body-text)] mt-1">
                      {m.rationale}
                    </p>
                    <p className="text-xs italic text-[var(--color-dark)] mt-1">
                      &ldquo;{m.example_headline}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Channel Strategy */}
          {p.channel_strategy && p.channel_strategy.length > 0 && (
            <CollapsibleSection
              id="channels"
              title="Channel Strategy"
              icon={TrendingUp}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-3">
                {p.channel_strategy.map((ch, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--color-dark)]">
                        {ch.channel}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-blue)] font-semibold">
                        {ch.budget_pct}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-body-text)]">{ch.objective}</p>
                    <ul className="text-xs text-[var(--color-dark)] mt-1.5 space-y-0.5">
                      {ch.tactics.map((t, j) => (
                        <li key={j}>&bull; {t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Content Calendar */}
          {p.content_calendar && p.content_calendar.length > 0 && (
            <CollapsibleSection
              id="calendar"
              title="Content Calendar"
              icon={Calendar}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-2">
                {p.content_calendar.map((w, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--color-light-gray)]">
                      <span className="text-xs font-bold text-[var(--color-dark)]">
                        W{w.week}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-dark)]">
                        {w.focus}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.deliverables.map((d, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-blue)]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* KPIs & Targets */}
          {p.kpis && p.kpis.length > 0 && (
            <CollapsibleSection
              id="kpis"
              title="KPIs & Targets"
              icon={TrendingUp}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {p.kpis.map((kpi, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg text-center bg-[var(--color-light-gray)] border border-[var(--border-subtle)]"
                  >
                    <p className="text-lg font-bold text-[var(--color-dark)]">
                      {kpi.target}
                    </p>
                    <p className="text-[10px] uppercase text-[var(--color-mid-gray)]">
                      {kpi.metric}
                    </p>
                    <p className="text-[10px] text-[var(--color-mid-gray)]">
                      {kpi.timeframe}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Quick Wins */}
          {p.quick_wins && p.quick_wins.length > 0 && (
            <CollapsibleSection
              id="quick-wins"
              title={`Quick Wins (${p.quick_wins.length})`}
              icon={Zap}
              expandedSection={expandedSection}
              onToggle={toggleSection}
            >
              <div className="mt-3 space-y-1.5">
                {p.quick_wins.map((win, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--color-dark)]"
                  >
                    <Zap
                      size={12}
                      className="text-amber-400 mt-0.5 flex-shrink-0"
                    />
                    <span>{win}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  )
}
