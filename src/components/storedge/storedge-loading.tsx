'use client';

/** Skeleton loading state for the storEDGE embed.
 *  Matches approximate dimensions and shows shimmer animation. */
export function StorEdgeLoading() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-light)',
        border: '1px solid var(--color-light-gray)',
        minHeight: '400px',
      }}
    >
      {/* Skeleton header */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div
            className="h-6 w-48 rounded animate-pulse"
            style={{ backgroundColor: 'var(--color-light-gray)' }}
          />
          <div
            className="h-6 w-24 rounded animate-pulse"
            style={{ backgroundColor: 'var(--color-light-gray)' }}
          />
        </div>

        {/* Skeleton unit rows */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
          >
            <div className="space-y-2 flex-1">
              <div
                className="h-4 w-32 rounded animate-pulse"
                style={{ backgroundColor: 'var(--color-light-gray)' }}
              />
              <div
                className="h-3 w-20 rounded animate-pulse"
                style={{ backgroundColor: 'var(--color-light-gray)' }}
              />
            </div>
            <div
              className="h-4 w-16 rounded animate-pulse"
              style={{ backgroundColor: 'var(--color-light-gray)' }}
            />
            <div
              className="h-8 w-24 rounded-lg animate-pulse ml-4"
              style={{ backgroundColor: 'var(--color-gold-light)' }}
            />
          </div>
        ))}

        {/* Loading text */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{
              border: '2px solid var(--color-light-gray)',
              borderTopColor: 'var(--color-gold)',
            }}
          />
          <span
            className="text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-mid-gray)',
            }}
          >
            Loading reservation system...
          </span>
        </div>
      </div>
    </div>
  );
}
