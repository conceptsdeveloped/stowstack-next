'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Facility, FacilitySelection } from '@/types/facility';

interface FacilityContextValue {
  /** Currently selected facility, or 'all' for global roll-up */
  current: FacilitySelection;
  /** All facilities accessible to this user */
  facilities: Facility[];
  /** Whether the facilities list has loaded */
  loaded: boolean;
  /** Switch to a specific facility or 'all' */
  setFacility: (id: string | 'all') => void;
  /** True if user has more than 1 facility */
  isMultiFacility: boolean;
  /** Convenience: the facility ID string, or 'all' */
  currentId: string | 'all';
}

const FacilityCtx = createContext<FacilityContextValue>({
  current: 'all',
  facilities: [],
  loaded: false,
  setFacility: () => {},
  isMultiFacility: false,
  currentId: 'all',
});

export function FacilityProvider({
  children,
  facilities: initialFacilities,
}: {
  children: React.ReactNode;
  facilities: Facility[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [facilities] = useState<Facility[]>(initialFacilities);
  const isMultiFacility = facilities.length > 1;

  // Read facility from URL param
  const facilityParam = searchParams.get('facility');

  // Determine current selection
  const { current, currentId } = useMemo(() => {
    // Single facility: always select it, ignore URL
    if (!isMultiFacility && facilities.length === 1) {
      return { current: facilities[0] as FacilitySelection, currentId: facilities[0].id };
    }

    // Multi-facility: read from URL
    if (facilityParam && facilityParam !== 'all') {
      const found = facilities.find((f) => f.id === facilityParam);
      if (found) return { current: found as FacilitySelection, currentId: found.id };
    }

    return { current: 'all' as FacilitySelection, currentId: 'all' as const };
  }, [facilityParam, facilities, isMultiFacility]);

  // Update URL when switching facilities
  const setFacility = useCallback(
    (id: string | 'all') => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id === 'all') {
        sp.delete('facility');
      } else {
        sp.set('facility', id);
      }
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const value = useMemo<FacilityContextValue>(
    () => ({
      current,
      facilities,
      loaded: true,
      setFacility,
      isMultiFacility,
      currentId,
    }),
    [current, facilities, setFacility, isMultiFacility, currentId]
  );

  return <FacilityCtx.Provider value={value}>{children}</FacilityCtx.Provider>;
}

export function useFacility(): FacilityContextValue {
  return useContext(FacilityCtx);
}
