/* Shared types for Tenant Management sub-components */

export interface Tenant {
  id: string;
  facility_id: string;
  external_id?: string;
  name: string;
  email?: string;
  phone?: string;
  unit_number: string;
  unit_size?: string;
  unit_type?: string;
  monthly_rate: number;
  move_in_date: string;
  lease_end_date?: string;
  autopay_enabled?: boolean;
  has_insurance?: boolean;
  insurance_monthly?: number;
  balance?: number;
  status?: string;
  days_delinquent?: number;
  last_payment_date?: string;
  moved_out_date?: string;
  move_out_reason?: string;
  created_at?: string;
  updated_at?: string;
  churn_predictions?: ChurnPrediction;
  delinquency_escalations?: Escalation[];
  upsell_opportunities?: UpsellOpportunity[];
  tenant_communications?: Communication[];
  tenant_payments?: Payment[];
  facilities?: { name: string };
}

export interface ChurnPrediction {
  id: string;
  risk_score: number;
  risk_level: string;
  predicted_vacate?: string;
  factors: Record<string, number>;
  recommended_actions?: string[];
  retention_status?: string;
}

export interface Escalation {
  id: string;
  stage: string;
  stage_entered_at: string;
  next_stage_at?: string;
  notes?: string;
  automated?: boolean;
}

export interface UpsellOpportunity {
  id: string;
  type: string;
  title: string;
  description?: string;
  current_value?: number;
  proposed_value?: number;
  monthly_uplift?: number;
  confidence?: number;
  status?: string;
}

export interface Communication {
  id: string;
  channel: string;
  direction: string;
  subject?: string;
  body?: string;
  sent_at?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  method?: string;
  status?: string;
  notes?: string;
}

export interface TenantStats {
  total: number;
  active: number;
  delinquent: number;
  movedOut: number;
  totalRevenue: number;
  avgRate: number;
  collectionRate: number;
  autopayRate: number;
}

export interface TenantResponse {
  tenants: Tenant[];
  stats: {
    total: number;
    active: number;
    delinquent: number;
    moved_out: number;
    total_monthly_revenue: number;
    avg_rate: number;
    collection_rate: number;
    autopay_pct: number;
  };
}

export type SortField = "name" | "unit_number" | "monthly_rate" | "balance" | "days_delinquent" | "move_in_date";
export type SortDir = "asc" | "desc";
export type StatusFilter = "all" | "active" | "delinquent" | "moved_out" | "notice";
export type ViewMode = "list" | "detail" | "churn" | "retention";
