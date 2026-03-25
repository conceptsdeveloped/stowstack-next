'use client';

import type { CampaignStatus, CampaignPlatform } from '@/types/campaign';

interface CampaignFiltersProps {
  status: CampaignStatus | 'all';
  platform: CampaignPlatform | 'all';
  onStatusChange: (s: CampaignStatus | 'all') => void;
  onPlatformChange: (p: CampaignPlatform | 'all') => void;
}

const STATUS_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'error', label: 'Error' },
];

const PLATFORM_OPTIONS: { value: CampaignPlatform | 'all'; label: string }[] = [
  { value: 'all', label: 'All platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
];

export function CampaignFilters({
  status,
  platform,
  onStatusChange,
  onPlatformChange,
}: CampaignFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as CampaignStatus | 'all')}
        className="rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 500,
          color: 'var(--color-dark)',
          backgroundColor: 'var(--color-light)',
          borderColor: 'var(--color-light-gray)',
        }}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={platform}
        onChange={(e) => onPlatformChange(e.target.value as CampaignPlatform | 'all')}
        className="rounded-lg border px-3 py-1.5 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 500,
          color: 'var(--color-dark)',
          backgroundColor: 'var(--color-light)',
          borderColor: 'var(--color-light-gray)',
        }}
      >
        {PLATFORM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
