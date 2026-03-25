import { CALLOUT_CONFIG } from '@/types/blog';
import type { CalloutType } from '@/types/blog';

interface CalloutBlockProps {
  type: CalloutType;
  children: React.ReactNode;
}

/**
 * Styled callout block for blog posts.
 * 4 variants: tip (gold), info (blue), success (green), warning (red)
 */
export function CalloutBlock({ type, children }: CalloutBlockProps) {
  const config = CALLOUT_CONFIG[type];

  return (
    <div
      className="rounded-lg p-4 my-6"
      style={{
        backgroundColor: config.bg,
        borderLeft: `3px solid ${config.border}`,
      }}
    >
      <div
        className="text-sm"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-dark)',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}
