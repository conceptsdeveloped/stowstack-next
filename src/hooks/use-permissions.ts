'use client';

import { useMemo } from 'react';
import { useClerkRole } from '@/hooks/use-clerk-role';
import { hasPermission } from '@/types/permissions';
import type { Role, PermissionAction } from '@/types/permissions';

/**
 * Hook for checking the current user's permissions.
 * Reads role from Clerk metadata when available, falls back to 'owner'
 * for admin-key authenticated users (Blake/Angelo).
 */
export function usePermissions() {
  const { role: clerkRole, isAdmin: clerkIsAdmin, canAccessAdmin } = useClerkRole();

  // Map Clerk roles to permission roles
  // Admin key users (no Clerk session) get owner-level access
  const role: Role = useMemo(() => {
    if (!canAccessAdmin && !clerkRole) {
      // Admin key auth — full owner access
      const hasAdminKey = typeof window !== 'undefined' &&
        !!localStorage.getItem('storageads_admin_key');
      if (hasAdminKey) return 'owner';
      return 'viewer';
    }

    if (clerkRole === 'admin') return 'admin';
    if (clerkRole === 'virtual_assistant') return 'manager';
    if (clerkRole === 'client') return 'viewer';
    if (clerkRole === 'partner') return 'viewer';

    // Default: if canAccessAdmin via Clerk, treat as admin
    if (canAccessAdmin) return 'admin';

    return 'viewer';
  }, [clerkRole, canAccessAdmin]);

  const permissions = useMemo(
    () => ({
      role,
      isOwner: role === 'owner',
      isAdmin: role === 'owner' || role === 'admin',
      isManager: role === 'owner' || role === 'admin' || role === 'manager',
      can: (action: PermissionAction) => hasPermission(role, action),
      canAccessFacility: (_facilityId: string) => {
        // Owner and admin can access all facilities
        // Manager/viewer should be scoped — will be enforced when org_users
        // facility assignments are implemented
        return role === 'owner' || role === 'admin';
      },
    }),
    [role]
  );

  return permissions;
}
