'use client';

import { Building2 } from 'lucide-react';
import { useFacility } from '@/lib/facility-context';

/**
 * Small badge showing the current facility name.
 * Use in page headers to indicate data scope.
 * Only renders for multi-facility users.
 */
export function FacilityBadge() {
  const { current, isMultiFacility } = useFacility();

  if (!isMultiFacility) return null;

  const label = current === 'all' ? 'All Facilities' : current.name;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 500,
        color: 'var(--color-gold)',
        backgroundColor: 'var(--color-gold-light)',
      }}
    >
      <Building2 className="h-3 w-3" />
      {label}
    </span>
  );
}
