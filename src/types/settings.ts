// Settings types for StorageAds admin settings page

export interface Profile {
  company_name: string;
  email: string;
  phone: string;
  signature: string;
  timezone: string;
}

export interface IntegrationConnection {
  platform: 'storedge' | 'meta' | 'google' | 'twilio' | 'tiktok';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  accountName?: string;
  accountId?: string;
  lastSyncAt?: string;
  errorMessage?: string;
  connectedAt?: string;
}

export interface NotificationPreferences {
  new_leads: boolean;
  overdue_alerts: boolean;
  messages: boolean;
  campaign_alerts: boolean;
  new_move_in: boolean;
  weekly_report: boolean;
  budget_alert: boolean;
  budget_threshold: number;
  report_ready: boolean;
  product_updates: boolean;
  mute_all: boolean;
}

export type SettingsTab =
  | 'profile'
  | 'integrations'
  | 'notifications'
  | 'billing'
  | 'team'
  | 'data'
  | 'danger';
