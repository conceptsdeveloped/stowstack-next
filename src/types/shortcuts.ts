// Keyboard shortcut types and definitions

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  category: 'navigation' | 'actions' | 'general';
}

export interface ShortcutCategory {
  id: string;
  label: string;
  shortcuts: Shortcut[];
}

/** Detect if running on Mac */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** All shortcut definitions */
export const SHORTCUTS: Shortcut[] = [
  // Navigation (G + key)
  { id: 'go-dashboard', keys: ['G', 'D'], label: 'Go to Dashboard', category: 'navigation' },
  { id: 'go-campaigns', keys: ['G', 'C'], label: 'Go to Campaigns', category: 'navigation' },
  { id: 'go-reports', keys: ['G', 'R'], label: 'Go to Reports', category: 'navigation' },
  { id: 'go-facilities', keys: ['G', 'F'], label: 'Go to Facilities', category: 'navigation' },
  { id: 'go-settings', keys: ['G', 'S'], label: 'Go to Settings', category: 'navigation' },

  // Actions
  { id: 'search', keys: [isMac() ? '⌘' : 'Ctrl', 'K'], label: 'Command palette', category: 'actions' },
  { id: 'focus-search', keys: ['/'], label: 'Focus search', category: 'actions' },
  { id: 'create-campaign', keys: ['C'], label: 'Create campaign', category: 'actions' },

  // General
  { id: 'shortcuts-help', keys: ['?'], label: 'Keyboard shortcuts', category: 'general' },
  { id: 'close', keys: ['Esc'], label: 'Close modal / overlay', category: 'general' },
];

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  { id: 'navigation', label: 'Navigation', shortcuts: SHORTCUTS.filter((s) => s.category === 'navigation') },
  { id: 'actions', label: 'Actions', shortcuts: SHORTCUTS.filter((s) => s.category === 'actions') },
  { id: 'general', label: 'General', shortcuts: SHORTCUTS.filter((s) => s.category === 'general') },
];

/** Route map for G+key navigation shortcuts */
export const NAV_SHORTCUT_ROUTES: Record<string, string> = {
  D: '/admin',
  C: '/admin/campaigns',
  R: '/admin/reports',
  F: '/admin/facilities',
  S: '/admin/settings',
};
