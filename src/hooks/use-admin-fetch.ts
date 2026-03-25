"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAdminFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminFetch<T = unknown>(
  path: string,
  params?: Record<string, string>
): UseAdminFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const key =
      typeof window !== "undefined"
        ? localStorage.getItem("storageads_admin_key") || ""
        : "";

    const url = new URL(path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, v);
      });
    }

    fetch(url.toString(), {
      headers: { "X-Admin-Key": key },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      });
  }, [path, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const key =
    typeof window !== "undefined"
      ? localStorage.getItem("storageads_admin_key") || ""
      : "";

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": key,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json();
}
