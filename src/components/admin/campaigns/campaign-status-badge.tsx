'use client';

import { CAMPAIGN_STATUS_CONFIG } from '@/types/campaign';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = CAMPAIGN_STATUS_CONFIG[status] ?? CAMPAIGN_STATUS_CONFIG.draft;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        fontFamily: 'var(--font-heading)',
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {status === 'active' && (
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
