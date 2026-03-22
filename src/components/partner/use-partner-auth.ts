"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "stowstack_partner_session";

interface PartnerSession {
  token: string;
  user: { id: string; email: string; name: string; role: string };
  organization: { id: string; name: string; slug: string; plan: string };
}

export function usePartnerAuth() {
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PartnerSession;
        if (parsed.token) {
          setSession(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!session?.token) {
        router.replace("/partner");
        throw new Error("Not authenticated");
      }

      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${session.token}`);
      if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        router.replace("/partner");
        throw new Error("Session expired");
      }

      return res;
    },
    [session, router],
  );

  return { session, loading, authFetch };
}
