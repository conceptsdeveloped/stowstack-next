/* Shared types and helpers for PMS Dashboard sub-components */

export interface Snapshot {
  id: string;
  snapshot_date: string;
  total_units: number | null;
  occupied_units: number | null;
  occupancy_pct: number | null;
  total_sqft: number | null;
  occupied_sqft: number | null;
  gross_potential: number | null;
  actual_revenue: number | null;
  delinquency_pct: number | null;
  move_ins_mtd: number | null;
  move_outs_mtd: number | null;
}

export interface RentRollRow {
  id: string;
  unit: string;
  size_label: string | null;
  tenant_name: string | null;
  account: string | null;
  rental_start: string | null;
  paid_thru: string | null;
  rent_rate: number | null;
  insurance_premium: number | null;
  total_due: number | null;
  days_past_due: number | null;
}

export interface AgingRow {
  id: string;
  unit: string;
  tenant_name: string | null;
  bucket_0_30: number | null;
  bucket_31_60: number | null;
  bucket_61_90: number | null;
  bucket_91_120: number | null;
  bucket_120_plus: number | null;
  total: number | null;
}

export interface RevenueRow {
  id: string;
  year: number;
  month: string;
  revenue: number | null;
  monthly_tax: number | null;
  move_ins: number | null;
  move_outs: number | null;
}

export interface LengthOfStayRow {
  id: string;
  tenant_name: string;
  latest_unit: string | null;
  move_in: string | null;
  move_out: string | null;
  days_in_unit: number | null;
  lead_source: string | null;
  lead_category: string | null;
}

export interface PmsReport {
  id: string;
  report_type: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

export interface PmsData {
  latestSnapshot: Snapshot | null;
  snapshotTrend: Snapshot[];
  rentRoll: RentRollRow[];
  aging: AgingRow[];
  revenueHistory: RevenueRow[];
  lengthOfStay: LengthOfStayRow[];
  pmsReports: PmsReport[];
}

export type SortDir = "asc" | "desc";

/* ── formatting helpers ── */

export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + fmt(n, 2);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return fmt(n, 1) + "%";
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtShortDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

const MONTH_ORDER: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  "01": 1, "02": 2, "03": 3, "04": 4, "05": 5, "06": 6,
  "07": 7, "08": 8, "09": 9, "10": 10, "11": 11, "12": 12,
};

export function monthNum(m: string): number {
  return MONTH_ORDER[m] ?? (parseInt(m, 10) || 0);
}

/* ── CSV parser (handles quoted fields) ── */

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}
