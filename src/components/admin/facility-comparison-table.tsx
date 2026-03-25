'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFacility } from '@/lib/facility-context';
import type { FacilityStats } from '@/types/facility';

interface FacilityComparisonTableProps {
  stats: FacilityStats[];
}

type SortKey = keyof FacilityStats;
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string; align?: string }[] = [
  { key: 'moveIns', label: 'Move-ins', format: (v) => String(v) },
  { key: 'costPerMoveIn', label: 'Cost / MI', format: (v) => `$${v.toFixed(0)}` },
  { key: 'totalSpend', label: 'Spend', format: (v) => `$${v.toLocaleString()}` },
  { key: 'roas', label: 'ROAS', format: (v) => `${v.toFixed(1)}x` },
  { key: 'occupancyRate', label: 'Occupancy', format: (v) => `${v.toFixed(0)}%` },
  { key: 'activeCampaigns', label: 'Campaigns', format: (v) => String(v) },
];

export function FacilityComparisonTable({ stats }: FacilityComparisonTableProps) {
  const { setFacility } = useFacility();
  const [sortKey, setSortKey] = useState<SortKey>('moveIns');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [stats, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey)
      return <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-40" />;
    return sortDir === 'desc' ? (
      <ChevronDown className="h-3 w-3" style={{ color: 'var(--color-gold)' }} />
    ) : (
      <ChevronUp className="h-3 w-3" style={{ color: 'var(--color-gold)' }} />
    );
  };

  if (stats.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: 'var(--color-light-gray)',
          backgroundColor: 'var(--color-light)',
        }}
      >
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
        >
          No facility data available for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{
        borderColor: 'var(--color-light-gray)',
        backgroundColor: 'var(--color-light)',
      }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--color-light-gray)',
            }}
          >
            <th
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-mid-gray)',
              }}
            >
              Facility
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="group cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color:
                    sortKey === col.key
                      ? 'var(--color-gold)'
                      : 'var(--color-mid-gray)',
                }}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIcon col={col.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr
              key={row.facilityId}
              onClick={() => setFacility(row.facilityId)}
              className="cursor-pointer transition-colors"
              style={{
                borderBottom:
                  idx < sorted.length - 1
                    ? '1px solid var(--color-light-gray)'
                    : undefined,
              }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'var(--color-gold-light)')
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'transparent')
              }
            >
              {/* Facility name + location */}
              <td className="px-4 py-3">
                <div
                  className="font-medium"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    color: 'var(--color-dark)',
                  }}
                >
                  {row.facilityName}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: 'var(--color-mid-gray)',
                  }}
                >
                  {row.location}
                </div>
              </td>

              {/* Metric columns */}
              {COLUMNS.map((col) => {
                const val = row[col.key] as number;
                const isGold = col.key === 'costPerMoveIn';
                const isOccupancy = col.key === 'occupancyRate';

                return (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-right"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: isGold ? 600 : 500,
                      fontSize: '13px',
                      color: isGold
                        ? 'var(--color-gold)'
                        : 'var(--color-dark)',
                    }}
                  >
                    {col.format(val)}
                    {isOccupancy && row.occupancyChange !== 0 && (
                      <span
                        className="ml-1 text-[11px]"
                        style={{
                          color:
                            row.occupancyChange > 0
                              ? 'var(--color-green)'
                              : 'var(--color-red)',
                        }}
                      >
                        {row.occupancyChange > 0 ? '↑' : '↓'}
                        {Math.abs(row.occupancyChange).toFixed(1)}%
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
