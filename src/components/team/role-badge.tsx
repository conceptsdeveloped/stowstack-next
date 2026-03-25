'use client';

import { ROLE_CONFIG } from '@/types/permissions';
import type { Role } from '@/types/permissions';

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
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
