import { PILLAR_CONFIG } from '@/types/blog';
import type { BlogPillar } from '@/types/blog';

interface BlogPillarBadgeProps {
  pillar: BlogPillar | string;
}

export function BlogPillarBadge({ pillar }: BlogPillarBadgeProps) {
  const config = PILLAR_CONFIG[pillar as BlogPillar] ?? {
    label: pillar,
    color: 'var(--color-mid-gray)',
    bg: 'var(--color-light-gray)',
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        fontFamily: 'var(--font-heading)',
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {config.label}
    </span>
  );
}
