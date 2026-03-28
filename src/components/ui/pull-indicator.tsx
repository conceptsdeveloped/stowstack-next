import { Loader2 } from "lucide-react";

interface PullIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

export function PullIndicator({ pullDistance, refreshing, threshold }: PullIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      {refreshing ? (
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-gold)]" />
      ) : (
        <svg
          className="h-5 w-5 text-[var(--color-gold)] transition-transform"
          style={{ transform: `rotate(${rotation}deg)`, opacity: progress }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      )}
    </div>
  );
}
