// Campaign types for the unified campaign manager
// Wraps existing ad_variations + campaign_spend + publish_log into a campaign view

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'error';
export type CampaignPlatform = 'meta' | 'google' | 'tiktok';
export type CampaignType = 'awareness' | 'traffic' | 'conversions';

export interface Campaign {
  id: string; // ad_variation.id
  facilityId: string;
  facilityName: string;
  name: string;
  platform: CampaignPlatform;
  type: CampaignType;
  status: CampaignStatus;
  dailyBudget: number;
  totalSpend: number;
  startDate: string;
  endDate?: string;
  landingPageId?: string;
  landingPageUrl?: string;
  // Performance metrics
  moveIns: number;
  reservations: number;
  clicks: number;
  impressions: number;
  costPerMoveIn: number;
  costPerClick: number;
  roas: number;
  conversionRate: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface CreateCampaignData {
  facilityId: string;
  name: string;
  platform: CampaignPlatform;
  type: CampaignType;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  targetRadius: number; // miles
  unitTypeFocus: string[];
  // Creative
  headlines: string[];
  bodyTexts: string[];
  ctaText: string;
  // Landing page
  landingPageId?: string;
}

export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; bg: string }
> = {
  draft: {
    label: 'Draft',
    color: 'var(--color-mid-gray)',
    bg: 'var(--color-light-gray)',
  },
  active: {
    label: 'Active',
    color: 'var(--color-green)',
    bg: 'rgba(120, 140, 93, 0.15)',
  },
  paused: {
    label: 'Paused',
    color: 'var(--color-gold)',
    bg: 'var(--color-gold-light)',
  },
  completed: {
    label: 'Completed',
    color: 'var(--color-mid-gray)',
    bg: 'var(--color-light-gray)',
  },
  error: {
    label: 'Error',
    color: 'var(--color-red)',
    bg: 'rgba(176, 74, 58, 0.1)',
  },
};

export const PLATFORM_CONFIG: Record<
  CampaignPlatform,
  { label: string; color: string }
> = {
  meta: { label: 'Meta', color: 'var(--color-gold)' },
  google: { label: 'Google', color: 'var(--color-blue)' },
  tiktok: { label: 'TikTok', color: 'var(--color-dark)' },
};
