export interface UnitIntel {
  unit_type: string
  size_label: string
  sqft: number
  total_count: number
  occupied_count: number
  vacant_count: number
  street_rate: number
  actual_avg_rate: number
  gross_potential: number
  actual_revenue: number
  lost_revenue: number
  rate_capture_pct: number
  economic_occupancy: number
  ecri_eligible: number
  rate_signal: string
  occ_signal: string
  action: string
  vacant_lost_monthly: number
  vacant_lost_annual: number
}

export interface ECRITenant {
  unit: string
  tenant_name: string
  moved_in: string
  standard_rate: number
  actual_rate: number
  rate_variance: number
  days_as_tenant: number
  ecri_suggested: number
  ecri_revenue_lift: number
}

export interface RateDistEntry {
  unit: string
  tenant: string
  variance: number
  actual: number
  standard: number
  days: number
  ecri?: boolean
  suggested?: number
  lift?: number
}

export interface RevenueMonth {
  year: number
  month: string
  revenue: number
  move_ins: number
  move_outs: number
}

export interface AgingSummary {
  delinquent_count: number
  total_0_30: number
  total_31_60: number
  total_61_90: number
  total_91_120: number
  total_120_plus: number
  total_outstanding: number
  moved_out_count: number
}

export interface IntelSummary {
  total_gross_potential: number
  total_actual_revenue: number
  total_lost_revenue: number
  revenue_capture_pct: number
  revenue_trend_pct: number | null
  ecri_eligible_count: number
  ecri_monthly_lift: number
  ecri_annual_lift: number
  tenants_above_street: number
  tenants_at_street: number
  tenants_below_street: number
  total_tenants_rated: number
  total_discount_impact: number
  discounted_tenants: number
}

export interface HealthBreakdown {
  overall: number
  occupancy: { score: number; weight: number; value: number }
  rate_capture: { score: number; weight: number; value: number }
  rate_optimization: { score: number; weight: number; value: number }
  delinquency: { score: number; weight: number; value: number }
  trend: { score: number; weight: number; value: number | null }
}

export interface Waterfall {
  gross_potential: number
  vacancy_loss: number
  rate_gap_loss: number
  delinquency_loss: number
  net_effective: number
  actual_collected: number
}

export interface SqftEntry {
  unit_type: string
  sqft: number
  total_sqft: number
  occupied_sqft: number
  revenue_per_sqft: number
  potential_per_sqft: number
  street_per_sqft: number
  actual_per_sqft: number
}

export interface SeasonalEntry {
  month: string
  avg_move_ins: number
  avg_move_outs: number
  avg_revenue: number
  years_of_data: number
}

export interface IntelData {
  summary: IntelSummary
  health: HealthBreakdown
  waterfall: Waterfall
  sqft_analysis: SqftEntry[]
  seasonal_pattern: SeasonalEntry[]
  units: UnitIntel[]
  ecri_tenants: ECRITenant[]
  rate_distribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  revenue_history: RevenueMonth[]
  aging: AgingSummary | null
}
