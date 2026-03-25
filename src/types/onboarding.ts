// Onboarding / first-run types

export type OnboardingStep =
  | 'welcome'
  | 'facility'
  | 'storedge'
  | 'ad_accounts'
  | 'review'
  | 'complete';

export interface OnboardingState {
  isComplete: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  facilityConfirmed: boolean;
  storedgeConnected: boolean;
  metaConnected: boolean;
  googleConnected: boolean;
  firstCampaignLaunched: boolean;
  firstReservation: boolean;
  firstMoveIn: boolean;
  skippedAt?: string;
}

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export const DEFAULT_CHECKLIST: OnboardingChecklistItem[] = [
  {
    id: 'account_created',
    label: 'Account created',
    description: 'Your StorageAds account is ready',
    isComplete: true,
  },
  {
    id: 'facility_confirmed',
    label: 'Facility confirmed',
    description: 'Review and confirm your facility details',
    isComplete: false,
    actionUrl: '/admin/onboarding?step=facility',
    actionLabel: 'Confirm facility',
  },
  {
    id: 'storedge_connected',
    label: 'storEDGE connected',
    description: 'Connect your reservation system',
    isComplete: false,
    actionUrl: '/admin/settings?tab=integrations',
    actionLabel: 'Connect storEDGE',
  },
  {
    id: 'ad_accounts_connected',
    label: 'Ad accounts connected',
    description: 'Connect Meta or Google Ads',
    isComplete: false,
    actionUrl: '/admin/settings?tab=integrations',
    actionLabel: 'Connect ads',
  },
  {
    id: 'first_campaign',
    label: 'First campaign launched',
    description: 'Create and launch your first ad campaign',
    isComplete: false,
    actionUrl: '/admin/campaigns/create',
    actionLabel: 'Create campaign',
  },
  {
    id: 'first_reservation',
    label: 'First reservation',
    description: 'Waiting for your first online reservation',
    isComplete: false,
  },
  {
    id: 'first_move_in',
    label: 'First move-in attributed',
    description: 'Your first tracked move-in from an ad',
    isComplete: false,
  },
];
