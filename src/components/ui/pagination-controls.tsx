'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  startIndex: number;
  endIndex: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [25, 50, 100];

/**
 * Pagination controls for tables.
 * "Showing 1–25 of 142" + prev/next buttons + per-page selector.
 */
export function PaginationControls({
  page,
  totalPages,
  total,
  startIndex,
  endIndex,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
          Showing {startIndex + 1}–{endIndex} of {total}
        </span>

        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs outline-none"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-body-text)',
              backgroundColor: 'var(--color-light)',
              borderColor: 'var(--color-light-gray)',
            }}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--color-body-text)' }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: pageNum === page ? 'var(--color-gold)' : 'var(--color-body-text)',
                backgroundColor: pageNum === page ? 'var(--color-gold-light)' : 'transparent',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--color-body-text)' }}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
