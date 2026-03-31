import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      <header
        className="sticky top-0 z-[100] border-b"
        style={{
          background: "var(--bg-void)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="w-24 h-5 rounded" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <Skeleton className="w-32 h-8 rounded mb-3" />
        <Skeleton className="w-96 h-5 rounded mb-12" />

        {/* Pillar filters skeleton */}
        <div className="flex gap-2 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-7 rounded-full" />
          ))}
        </div>

        {/* Featured post skeleton */}
        <div
          className="rounded-lg p-8 mb-12"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Skeleton className="w-16 h-4 rounded mb-4" />
          <Skeleton className="w-3/4 h-7 rounded mb-3" />
          <Skeleton className="w-full h-5 rounded mb-2" />
          <Skeleton className="w-2/3 h-5 rounded mb-4" />
          <Skeleton className="w-48 h-4 rounded" />
        </div>

        {/* Post list skeleton */}
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-6 py-6 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex-1">
                <Skeleton className="w-3/4 h-5 rounded mb-2" />
                <Skeleton className="w-full h-4 rounded mb-1" />
                <Skeleton className="w-1/2 h-4 rounded mb-2" />
                <Skeleton className="w-32 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
