// Blog post types for the StorageAds content engine

export type BlogPillar = 'operator_math' | 'whats_working' | 'operators_edge' | 'industry_takes';
export type CalloutType = 'tip' | 'info' | 'success' | 'warning';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  pillar: BlogPillar;
  author: string;
  publishedAt: string;
  readingTime: number;
  tags?: string[];
}

export interface Author {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number; // 2 or 3
}

export const PILLAR_CONFIG: Record<BlogPillar, { label: string; color: string; bg: string }> = {
  operator_math: { label: 'Operator Math', color: 'var(--color-gold)', bg: 'var(--color-gold-light)' },
  whats_working: { label: "What's Working", color: 'var(--color-green)', bg: 'rgba(120,140,93,0.15)' },
  operators_edge: { label: "The Operator's Edge", color: 'var(--color-blue)', bg: 'rgba(106,155,204,0.15)' },
  industry_takes: { label: 'Industry Takes', color: 'var(--color-dark)', bg: 'var(--color-light-gray)' },
};

export const CALLOUT_CONFIG: Record<CalloutType, { color: string; bg: string; border: string }> = {
  tip: { color: 'var(--color-gold)', bg: 'var(--color-gold-light)', border: 'var(--color-gold)' },
  info: { color: 'var(--color-blue)', bg: 'rgba(106,155,204,0.1)', border: 'var(--color-blue)' },
  success: { color: 'var(--color-green)', bg: 'rgba(120,140,93,0.1)', border: 'var(--color-green)' },
  warning: { color: 'var(--color-red)', bg: 'rgba(176,74,58,0.06)', border: 'var(--color-red)' },
};
