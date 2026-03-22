"use client";

import { useUser } from "@clerk/nextjs";
import type { StowStackRole } from "@/lib/clerk-roles";

/**
 * Client-side hook to get the current Clerk user's StowStack role.
 * Returns { role, isLoaded, isSignedIn, isAdmin, isVA }.
 */
export function useClerkRole() {
  const { user, isLoaded, isSignedIn } = useUser();

  const role =
    isLoaded && isSignedIn
      ? ((user.publicMetadata as Record<string, unknown>)?.role as
          | StowStackRole
          | undefined) ?? null
      : null;

  return {
    role,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    isAdmin: role === "admin",
    isVA: role === "virtual_assistant",
    isClient: role === "client",
    isPartner: role === "partner",
    canAccessAdmin: role === "admin" || role === "virtual_assistant",
  };
}
