'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  DATE_PRESETS,
  DEFAULT_PRESET,
  getPreset,
  getComparisonRange,
} from '@/lib/date-presets';
import { formatDateRange } from '@/lib/dates';
import { toISODate } from '@/lib/dates';
import { useTimezone } from '@/hooks/use-timezone';
import type {
  DateRange,
  DatePresetKey,
  ComparisonRange,
  DateRangeParams,
} from '@/types/dates';

export interface UseDateRangeReturn {
  range: DateRange;
  preset: DatePresetKey;
  comparison: ComparisonRange;
  setPreset: (key: DatePresetKey) => void;
  setCustomRange: (start: Date, end: Date) => void;
  toggleComparison: () => void;
  rangeLabel: string;
  params: DateRangeParams;
}

export function useDateRange(): UseDateRangeReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { timezone } = useTimezone();

  // Read initial state from URL params
  const initialPreset = (searchParams.get('range') as DatePresetKey) || DEFAULT_PRESET;
  const initialCompare = searchParams.get('compare') === 'true';
  const initialStart = searchParams.get('start');
  const initialEnd = searchParams.get('end');

  const [compareEnabled, setCompareEnabled] = useState(initialCompare);

  // Compute the active range
  const { range, preset } = useMemo(() => {
    // Custom range from URL
    if (initialStart && initialEnd && initialPreset === 'custom') {
      return {
        range: {
          start: new Date(initialStart + 'T00:00:00'),
          end: new Date(initialEnd + 'T23:59:59'),
          preset: 'custom' as DatePresetKey,
        },
        preset: 'custom' as DatePresetKey,
      };
    }

    // Preset range
    const presetDef = getPreset(initialPreset) || getPreset(DEFAULT_PRESET)!;
    const now = new Date();
    const r = presetDef.getRange(now, timezone);
    return { range: r, preset: presetDef.key };
  }, [initialPreset, initialStart, initialEnd, timezone]);

  // Comparison range
  const comparison: ComparisonRange = useMemo(
    () => ({
      enabled: compareEnabled,
      current: range,
      previous: getComparisonRange(range),
    }),
    [range, compareEnabled]
  );

  // Update URL params
  const updateUrl = useCallback(
    (params: DateRangeParams) => {
      const sp = new URLSearchParams(searchParams.toString());

      // Clear old date params
      sp.delete('range');
      sp.delete('start');
      sp.delete('end');
      sp.delete('compare');

      if (params.range && params.range !== DEFAULT_PRESET) {
        sp.set('range', params.range);
      }
      if (params.start) sp.set('start', params.start);
      if (params.end) sp.set('end', params.end);
      if (params.compare === 'true') sp.set('compare', 'true');

      const qs = sp.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const setPreset = useCallback(
    (key: DatePresetKey) => {
      updateUrl({
        range: key,
        compare: compareEnabled ? 'true' : 'false',
      });
    },
    [updateUrl, compareEnabled]
  );

  const setCustomRange = useCallback(
    (start: Date, end: Date) => {
      updateUrl({
        range: 'custom',
        start: toISODate(start, timezone),
        end: toISODate(end, timezone),
        compare: compareEnabled ? 'true' : 'false',
      });
    },
    [updateUrl, timezone, compareEnabled]
  );

  const toggleComparison = useCallback(() => {
    const next = !compareEnabled;
    setCompareEnabled(next);
    const sp = new URLSearchParams(searchParams.toString());
    if (next) {
      sp.set('compare', 'true');
    } else {
      sp.delete('compare');
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [compareEnabled, searchParams, router, pathname]);

  // Human-readable label
  const rangeLabel = useMemo(() => {
    if (preset !== 'custom') {
      const presetDef = getPreset(preset);
      return presetDef?.label ?? 'Last 30 days';
    }
    return formatDateRange(range, timezone);
  }, [preset, range, timezone]);

  const params: DateRangeParams = useMemo(
    () => ({
      range: preset,
      ...(preset === 'custom'
        ? {
            start: toISODate(range.start, timezone),
            end: toISODate(range.end, timezone),
          }
        : {}),
      compare: compareEnabled ? 'true' : 'false',
    }),
    [preset, range, timezone, compareEnabled]
  );

  return {
    range,
    preset,
    comparison,
    setPreset,
    setCustomRange,
    toggleComparison,
    rangeLabel,
    params,
  };
}
