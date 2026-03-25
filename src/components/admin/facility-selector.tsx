'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Building2, ChevronDown, Search } from 'lucide-react';
import { useFacility } from '@/lib/facility-context';

interface FacilitySelectorProps {
  collapsed?: boolean;
}

export function FacilitySelector({ collapsed }: FacilitySelectorProps) {
  const { current, facilities, setFacility, isMultiFacility, currentId } =
    useFacility();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Don't render if single facility
  if (!isMultiFacility) return null;

  const currentName =
    current === 'all' ? 'All Facilities' : current.name;
  const currentLocation =
    current === 'all' ? `${facilities.length} facilities` : current.location;

  // Filter facilities by search
  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase())
  );

  const showSearch = facilities.length >= 5;

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, showSearch]);

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    },
    []
  );

  const handleSelect = useCallback(
    (id: string | 'all') => {
      setFacility(id);
      setOpen(false);
      setSearch('');
    },
    [setFacility]
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={currentName}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        style={{
          color: 'var(--color-gold)',
          backgroundColor: open ? 'var(--color-gold-light)' : 'transparent',
        }}
      >
        <Building2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative px-3 mb-4" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
        style={{
          backgroundColor: open
            ? 'var(--color-gold-light)'
            : 'var(--color-light-gray)',
        }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{
            backgroundColor: 'var(--color-gold)',
            color: '#fff',
          }}
        >
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-medium"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-dark)',
            }}
          >
            {currentName}
          </div>
          <div
            className="truncate text-xs"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-mid-gray)',
            }}
          >
            {currentLocation}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-mid-gray)' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-3 right-3 top-full z-50 mt-1 rounded-xl shadow-lg"
          style={{
            backgroundColor: 'var(--color-light)',
            border: '1px solid var(--color-light-gray)',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {/* Search (5+ facilities) */}
          {showSearch && (
            <div className="p-2 border-b" style={{ borderColor: 'var(--color-light-gray)' }}>
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: 'var(--color-mid-gray)' }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search facilities..."
                  className="w-full rounded-md py-1.5 pl-8 pr-3 text-sm outline-none"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-dark)',
                    backgroundColor: 'var(--color-light-gray)',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* All Facilities option */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
              style={{
                backgroundColor:
                  currentId === 'all' ? 'var(--color-gold-light)' : 'transparent',
              }}
              onMouseOver={(e) => {
                if (currentId !== 'all')
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--color-light-gray)';
              }}
              onMouseOut={(e) => {
                if (currentId !== 'all')
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'transparent';
              }}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    currentId === 'all'
                      ? 'var(--color-gold)'
                      : 'var(--color-mid-gray)',
                }}
              />
              <span
                className="text-sm font-medium"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color:
                    currentId === 'all'
                      ? 'var(--color-gold)'
                      : 'var(--color-dark)',
                }}
              >
                All Facilities
              </span>
              <span
                className="ml-auto text-xs"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-mid-gray)',
                }}
              >
                {facilities.length}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div
            className="mx-2"
            style={{ borderTop: '1px solid var(--color-light-gray)' }}
          />

          {/* Facility list */}
          <div className="p-1">
            {filtered.length === 0 && (
              <div
                className="px-2.5 py-3 text-center text-sm"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-mid-gray)',
                }}
              >
                No facilities found
              </div>
            )}
            {filtered.map((facility) => {
              const isActive = currentId === facility.id;
              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => handleSelect(facility.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--color-gold-light)'
                      : 'transparent',
                  }}
                  onMouseOver={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        'var(--color-light-gray)';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        'transparent';
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 500,
                        fontSize: '13px',
                        color: isActive
                          ? 'var(--color-gold)'
                          : 'var(--color-dark)',
                      }}
                    >
                      {facility.name}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        color: 'var(--color-mid-gray)',
                      }}
                    >
                      {facility.location}
                    </div>
                  </div>
                  {facility.status && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        backgroundColor:
                          facility.status === 'active'
                            ? 'rgba(120, 140, 93, 0.15)'
                            : 'var(--color-light-gray)',
                        color:
                          facility.status === 'active'
                            ? 'var(--color-green)'
                            : 'var(--color-mid-gray)',
                      }}
                    >
                      {facility.status}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
