// Report & data export types

export type ExportFormat = 'csv' | 'pdf';
export type ReportType = 'monthly_performance' | 'campaign_detail' | 'attribution' | 'custom';
export type ReportStatus = 'generating' | 'ready' | 'failed' | 'expired';

export interface GenerateReportRequest {
  type: ReportType;
  facilityId: string | 'all';
  dateRange: { start: string; end: string };
  format: ExportFormat;
  campaignId?: string;
  includeCharts?: boolean;
}

export interface Report {
  id: string;
  type: ReportType;
  facilityName: string;
  dateRange: { start: string; end: string };
  format: ExportFormat;
  status: ReportStatus;
  downloadUrl?: string;
  fileSize?: number;
  generatedAt?: string;
  expiresAt?: string;
  createdBy: string;
}

export interface CsvExportConfig {
  filename: string;
  columns: { key: string; header: string; formatter?: (val: unknown) => string }[];
  data: Record<string, unknown>[];
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  monthly_performance: 'Monthly Performance',
  campaign_detail: 'Campaign Detail',
  attribution: 'Move-in Attribution',
  custom: 'Custom Report',
};

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bg: string }
> = {
  generating: { label: 'Generating', color: 'var(--color-gold)', bg: 'var(--color-gold-light)' },
  ready: { label: 'Ready', color: 'var(--color-green)', bg: 'rgba(120,140,93,0.15)' },
  failed: { label: 'Failed', color: 'var(--color-red)', bg: 'rgba(176,74,58,0.1)' },
  expired: { label: 'Expired', color: 'var(--color-mid-gray)', bg: 'var(--color-light-gray)' },
};
