'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Megaphone,
  FileText,
  BarChart3,
  Building2,
  Settings,
  Plus,
  Users,
  ArrowRight,
} from 'lucide-react';
import { SEARCH_TYPE_COLORS } from '@/types/search';
import type { SearchResult, SearchGroup } from '@/types/search';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// Static navigation items + quick actions
const NAV_ITEMS: SearchResult[] = [
  { id: 'nav-dashboard', type: 'navigation', title: 'Dashboard', subtitle: 'Lead pipeline', url: '/admin' },
  { id: 'nav-campaigns', type: 'navigation', title: 'Campaigns', subtitle: 'Ad campaigns', url: '/admin/campaigns' },
  { id: 'nav-facilities', type: 'navigation', title: 'Facility Manager', url: '/admin/facilities' },
  { id: 'nav-reports', type: 'navigation', title: 'Reports', subtitle: 'Performance reports', url: '/admin/reports' },
  { id: 'nav-settings', type: 'navigation', title: 'Settings', url: '/admin/settings' },
  { id: 'nav-billing', type: 'navigation', title: 'Billing', url: '/admin/settings?tab=billing' },
  { id: 'nav-team', type: 'navigation', title: 'Team', url: '/admin/settings?tab=team' },
  { id: 'nav-onboarding', type: 'navigation', title: 'Onboarding', url: '/admin/onboarding' },
];

const QUICK_ACTIONS: SearchResult[] = [
  { id: 'action-create-campaign', type: 'action', title: 'Create campaign', url: '/admin/campaigns/create', shortcut: ['N', 'C'] },
  { id: 'action-generate-report', type: 'action', title: 'Generate report', url: '/admin/reports' },
  { id: 'action-settings', type: 'action', title: 'Open settings', url: '/admin/settings', shortcut: ['G', 'S'] },
  { id: 'action-invite', type: 'action', title: 'Invite team member', url: '/admin/settings?tab=team' },
];

const ALL_ITEMS = [...NAV_ITEMS, ...QUICK_ACTIONS];

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // Simple fuzzy: each char of query appears in order in text
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search results
  const results = useMemo((): SearchResult[] => {
    if (!query.trim() || query.length < 2) return [];
    return ALL_ITEMS.filter(
      (item) =>
        fuzzyMatch(query, item.title) ||
        (item.subtitle && fuzzyMatch(query, item.subtitle))
    );
  }, [query]);

  // Group results by type
  const groups = useMemo((): SearchGroup[] => {
    if (query.length < 2) {
      // Show quick actions when empty
      return [
        { type: 'action', label: 'Quick Actions', results: QUICK_ACTIONS },
        { type: 'navigation', label: 'Navigation', results: NAV_ITEMS.slice(0, 5) },
      ];
    }

    const grouped = new Map<string, SearchResult[]>();
    for (const r of results) {
      const key = r.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    return Array.from(grouped.entries()).map(([type, items]) => ({
      type: type as SearchResult['type'],
      label: type === 'navigation' ? 'Navigation' : type === 'action' ? 'Actions' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      results: items.slice(0, 5),
    }));
  }, [query, results]);

  const flatResults = useMemo(() => groups.flatMap((g) => g.results), [groups]);

  // Execute selection
  const executeResult = useCallback(
    (result: SearchResult) => {
      if (result.url) {
        router.push(result.url);
      }
      if (result.action) {
        result.action();
      }
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          executeResult(flatResults[selectedIndex]);
        }
      }
    },
    [flatResults, selectedIndex, executeResult]
  );

  if (!open) return null;

  let itemIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full -translate-x-1/2"
        style={{ maxWidth: '560px', padding: '0 16px' }}
      >
        <div
          className="rounded-xl shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--color-light)',
            border: '1px solid var(--color-light-gray)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-light-gray)' }}>
            <Search className="h-5 w-5 shrink-0" style={{ color: 'var(--color-mid-gray)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Search campaigns, pages, or type a command..."
              className="flex-1 bg-transparent outline-none text-base"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-dark)',
                fontWeight: 400,
              }}
            />
            <kbd
              className="hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                fontFamily: 'monospace',
                backgroundColor: 'var(--color-light-gray)',
                color: 'var(--color-mid-gray)',
                border: '1px solid var(--color-light-gray)',
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto py-2">
            {groups.map((group) => (
              <div key={group.type + group.label}>
                <div
                  className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
                >
                  {group.label}
                </div>
                {group.results.map((result) => {
                  itemIndex++;
                  const idx = itemIndex;
                  const isSelected = idx === selectedIndex;
                  const dotColor = SEARCH_TYPE_COLORS[result.type] || 'var(--color-mid-gray)';

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => executeResult(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'var(--color-gold-light)' : 'transparent',
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--color-dark)',
                            fontWeight: isSelected ? 500 : 400,
                          }}
                        >
                          {result.title}
                        </span>
                        {result.subtitle && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--color-mid-gray)' }}>
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                      {result.shortcut && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {result.shortcut.map((k) => (
                            <kbd
                              key={k}
                              className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px]"
                              style={{
                                fontFamily: 'monospace',
                                backgroundColor: 'var(--color-light-gray)',
                                color: 'var(--color-mid-gray)',
                                border: '1px solid var(--color-light-gray)',
                                minWidth: '18px',
                                height: '18px',
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      )}
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-gold)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {query.length >= 2 && flatResults.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
                  No results for &quot;{query}&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
