import { Skeleton } from "@/components/ui/skeleton";

export default function PartnerLoading() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
