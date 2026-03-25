// Date/time system types for StorageAds dashboards and reports

export interface DateRange {
  start: Date;
  end: Date;
  preset?: DatePresetKey;
}

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days' // DEFAULT for dashboard
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface DatePreset {
  key: DatePresetKey;
  label: string;
  getRange: (now: Date, tz: string) => DateRange;
}

export interface ComparisonRange {
  enabled: boolean;
  current: DateRange;
  previous: DateRange;
}

// URL param shape for syncing date range state
export interface DateRangeParams {
  range?: DatePresetKey;
  start?: string; // ISO date: "2026-03-01"
  end?: string; // ISO date: "2026-03-31"
  compare?: 'true' | 'false';
}
