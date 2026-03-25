'use client';

import { useState, useMemo, useCallback } from 'react';

export interface PaginationState {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialPerPage?: number;
  total: number;
}

export function usePagination({
  initialPage = 1,
  initialPerPage = 25,
  total,
}: UsePaginationOptions) {
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Clamp page when total changes
  const clampedPage = Math.min(page, totalPages);
  if (clampedPage !== page) setPage(clampedPage);

  const state: PaginationState = useMemo(
    () => ({ page: clampedPage, perPage, total, totalPages }),
    [clampedPage, perPage, total, totalPages]
  );

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const changePerPage = useCallback((pp: number) => {
    setPerPage(pp);
    setPage(1);
  }, []);

  const startIndex = (clampedPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, total);

  return {
    ...state,
    goToPage,
    nextPage,
    prevPage,
    changePerPage,
    startIndex,
    endIndex,
    isFirstPage: clampedPage === 1,
    isLastPage: clampedPage >= totalPages,
  };
}
