import { Skeleton } from "@/components/ui/skeleton";

export function PortalDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Greeting */}
      <Skeleton className="mb-6 h-8 w-48" />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>

      {/* List rows */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
