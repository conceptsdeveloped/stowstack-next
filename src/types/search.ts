// Search & command palette types

export type SearchResultType =
  | 'navigation'
  | 'campaign'
  | 'landing_page'
  | 'report'
  | 'facility'
  | 'action'
  | 'team_member';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  url?: string;
  action?: () => void;
  icon?: SearchResultType;
  shortcut?: string[];
}

export interface SearchGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

export interface RecentSearch {
  query: string;
  resultId: string;
  resultTitle: string;
  resultUrl: string;
  timestamp: string;
}

/** Accent colors per result type */
export const SEARCH_TYPE_COLORS: Record<SearchResultType, string> = {
  navigation: 'var(--color-mid-gray)',
  campaign: 'var(--color-gold)',
  landing_page: 'var(--color-blue)',
  report: 'var(--color-green)',
  facility: 'var(--color-mid-gray)',
  action: 'var(--color-gold)',
  team_member: 'var(--color-mid-gray)',
};

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  navigation: 'Navigation',
  campaign: 'Campaigns',
  landing_page: 'Landing Pages',
  report: 'Reports',
  facility: 'Facilities',
  action: 'Actions',
  team_member: 'Team',
};
