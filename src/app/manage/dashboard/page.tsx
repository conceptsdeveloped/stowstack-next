"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import FacilityOverview from "@/components/admin/facility-tabs/facility-overview";
import type { FacilityProp } from "@/components/admin/facility-tabs/facility-overview/types";
import { getManageToken, clearManageToken } from "@/lib/facility-auth";

export default function ManageDashboardPage() {
  const router = useRouter();
  const [facility, setFacility] = useState<FacilityProp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    const token = getManageToken();
    if (!token) {
      router.replace("/manage");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manage/session", {
        headers: { "x-manage-token": token },
      });
      if (res.status === 401) {
        clearManageToken();
        router.replace("/manage");
        return;
      }
      const data = await res.json();
      const first = data?.facilities?.[0] as FacilityProp | undefined;
      if (!first) {
        setError("We couldn't load your facility. Try signing in again.");
        return;
      }
      setFacility(first);
    } catch {
      setError("Failed to load your workspace.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function exit() {
    clearManageToken();
    router.replace("/manage");
  }

  return (
    <div
      style={{ fontFamily: "var(--font-manrope, sans-serif)" }}
      className="min-h-screen bg-[var(--color-light,#faf9f5)] text-[var(--color-dark,#141413)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-light-gray,#e8e6dc)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold lowercase tracking-tight">
            storage<span style={{ color: "var(--brand-gold, #B58B3F)" }}>ads</span>
          </div>
          {facility && (
            <>
              <span className="text-[var(--color-mid-gray,#b0aea5)]">/</span>
              <span className="text-sm font-medium">{facility.name}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={exit}
          className="text-sm font-medium text-[var(--color-body-text,#6a6560)] hover:text-[var(--color-dark,#141413)]"
        >
          Exit
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24 text-[var(--color-body-text,#6a6560)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your facility…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-[var(--color-red,#B04A3A)] bg-[var(--color-red,#B04A3A)]/10 px-4 py-3 text-sm text-[var(--color-red,#B04A3A)]">
            {error}
          </div>
        )}

        {!loading && !error && facility && (
          // adminKey="" signals owner context: the tool's fetches fall back to
          // the manage token via authHeaders() instead of the admin key.
          <FacilityOverview facility={facility} adminKey="" onUpdate={loadSession} />
        )}
      </main>
    </div>
  );
}
