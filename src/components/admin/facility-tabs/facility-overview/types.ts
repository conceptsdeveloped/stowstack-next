// ---------------------------------------------------------------------------
// Shared types and constants for facility-overview subcomponents
// ---------------------------------------------------------------------------

export interface ContextDoc {
  id: string
  facility_id: string
  created_at: string
  type: string
  title: string
  content: string | null
  file_url: string | null
  metadata: Record<string, unknown>
}

export interface MarketingPlan {
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

export interface GoogleReview {
  author_name: string
  rating: number
  text: string
  time: number
  relative_time_description?: string
}

export interface FacilityProp {
  id: string
  name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  google_address?: string
  occupancy_range?: string
  total_units?: string
  biggest_issue?: string
  notes?: string
  google_photos?: string[]
  google_reviews?: GoogleReview[]
  google_rating?: number
  review_count?: number
  google_phone?: string
  google_maps_url?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CONTEXT_TYPES = [
  { id: "competitor_info", label: "Competitor Info" },
  { id: "pricing_sheet", label: "Pricing / Rate Card" },
  { id: "branding_guide", label: "Branding Guidelines" },
  { id: "business_plan", label: "Business Plan" },
  { id: "market_analysis", label: "Market Analysis" },
  { id: "other", label: "Other" },
]

export const PLAYBOOK_OPTIONS = [
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

export const BUDGET_TIER_COLORS: Record<string, string> = {
  aggressive: "bg-red-500/20 text-red-400 border border-red-500/30",
  growth: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  steady: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  optimize: "bg-[var(--color-blue)]/20 text-[var(--color-blue)] border border-[var(--color-blue)]/30",
  maintain: "bg-[var(--color-light-gray)] text-[var(--color-body-text)] border border-[var(--border-subtle)]",
}

export const OCCUPANCY_OPTIONS = [
  { value: "", label: "Select occupancy range" },
  { value: "below-60", label: "Below 60%" },
  { value: "60-75", label: "60-75%" },
  { value: "75-85", label: "75-85%" },
  { value: "85-95", label: "85-95%" },
  { value: "above-95", label: "Above 95%" },
]

export const BIGGEST_ISSUE_OPTIONS = [
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
