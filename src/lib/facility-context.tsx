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

/**
 * Persisted active scope. The `?facility=` URL param is authoritative when
 * present (deep links / shareable URLs), but most admin navigation uses bare
 * hrefs that drop the param. Without persistence, scope would reset to "all" on
 * every click — defeating the "select once, work scoped" model. We remember the
 * last selection so it survives navigation, and re-sync it into the URL so links
 * stay shareable.
 */
const ACTIVE_KEY = 'storageads_active_facility';

function readPersistedScope(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writePersistedScope(value: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the active scope from the available inputs (pure, so it can be unit
 * tested without rendering). Precedence: single facility auto-selects; else a
 * valid `?facility=` URL param wins; else the remembered selection (when the URL
 * carries no param); else the portfolio roll-up. 'all' is a real choice, never
 * overridden by a remembered facility.
 */
export function resolveFacilityScope(
  facilities: Facility[],
  facilityParam: string | null,
  persisted: string | null,
): { current: FacilitySelection; currentId: string | 'all' } {
  const isMulti = facilities.length > 1;

  if (!isMulti && facilities.length === 1) {
    return { current: facilities[0] as FacilitySelection, currentId: facilities[0].id };
  }

  if (facilityParam && facilityParam !== 'all') {
    const found = facilities.find((f) => f.id === facilityParam);
    if (found) return { current: found as FacilitySelection, currentId: found.id };
  }

  if (!facilityParam && persisted && persisted !== 'all') {
    const found = facilities.find((f) => f.id === persisted);
    if (found) return { current: found as FacilitySelection, currentId: found.id };
  }

  return { current: 'all' as FacilitySelection, currentId: 'all' as const };
}

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

  // Read facility from URL param (authoritative when present)
  const facilityParam = searchParams.get('facility');

  // Last explicitly-selected scope ('all' or a facility id). Seeded from a valid
  // URL param at mount (so a shared deep link is immediately sticky), else from
  // the persisted store.
  const [persisted, setPersisted] = useState<string | null>(() => {
    if (
      facilityParam &&
      facilityParam !== 'all' &&
      initialFacilities.some((f) => f.id === facilityParam)
    ) {
      return facilityParam;
    }
    return readPersistedScope();
  });

  // Determine current selection (see resolveFacilityScope for precedence).
  const { current, currentId } = useMemo(
    () => resolveFacilityScope(facilities, facilityParam, persisted),
    [facilityParam, facilities, persisted]
  );

  // Update URL + persisted store when switching facilities.
  const setFacility = useCallback(
    (id: string | 'all') => {
      writePersistedScope(id);
      setPersisted(id);
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

  // Keep the persisted scope in sync when the URL param drives the change in an
  // already-mounted session (back/forward, or a link that carries ?facility=),
  // so subsequent bare-href navigation stays scoped. This is genuine URL→store
  // synchronization (an external system), and only fires when the param
  // actually changes — not a render cascade.
  useEffect(() => {
    if (!isMultiFacility) return;
    if (
      facilityParam &&
      facilityParam !== persisted &&
      facilities.some((f) => f.id === facilityParam)
    ) {
      writePersistedScope(facilityParam);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing remembered scope from the authoritative URL param
      setPersisted(facilityParam);
    }
  }, [facilityParam, persisted, facilities, isMultiFacility]);

  // When navigation lands on a bare URL but a facility is remembered, re-write
  // the param so the address bar reflects (and can share) the active scope.
  useEffect(() => {
    if (!isMultiFacility) return;
    if (facilityParam) return;
    if (persisted && persisted !== 'all' && facilities.some((f) => f.id === persisted)) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('facility', persisted);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }
  }, [facilityParam, persisted, facilities, isMultiFacility, pathname, router, searchParams]);

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
