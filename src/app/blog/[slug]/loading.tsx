import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
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
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="w-24 h-5 rounded" />
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Category + date */}
        <Skeleton className="w-36 h-4 rounded mb-6" />

        {/* Title */}
        <Skeleton className="w-full h-10 rounded mb-3" />
        <Skeleton className="w-3/4 h-10 rounded mb-6" />

        {/* Description */}
        <Skeleton className="w-full h-5 rounded mb-2" />
        <Skeleton className="w-2/3 h-5 rounded mb-8" />

        {/* Author */}
        <div className="flex items-center gap-3 mb-12">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="w-24 h-4 rounded mb-1" />
            <Skeleton className="w-32 h-3 rounded" />
          </div>
        </div>

        {/* Content paragraphs */}
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              {i % 3 === 0 && <Skeleton className="w-1/3 h-7 rounded mb-4" />}
              <Skeleton className="w-full h-4 rounded mb-2" />
              <Skeleton className="w-full h-4 rounded mb-2" />
              <Skeleton className="w-5/6 h-4 rounded mb-2" />
              <Skeleton className="w-3/4 h-4 rounded" />
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
