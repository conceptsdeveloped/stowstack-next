import { auth, currentUser } from "@clerk/nextjs/server";
import type { StowStackRole } from "./clerk-roles";

export type { StowStackRole };
export { VA_RESTRICTED_PATHS } from "./clerk-roles";

/**
 * Server-side: get the current Clerk user's role from publicMetadata.
 * Returns null if not signed in or no role is set.
 */
export async function getClerkRole(): Promise<StowStackRole | null> {
  const user = await currentUser();
  if (!user) return null;
  const role = (user.publicMetadata as Record<string, unknown>)?.role;
  if (
    typeof role === "string" &&
    ["admin", "virtual_assistant", "client", "partner"].includes(role)
  ) {
    return role as StowStackRole;
  }
  return null;
}

/**
 * Server-side: check if the current request has a valid Clerk session.
 */
export async function isClerkAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return userId !== null;
}

/**
 * Server-side: check if the current user has a specific role.
 */
export async function hasRole(role: StowStackRole): Promise<boolean> {
  const userRole = await getClerkRole();
  return userRole === role;
}

/**
 * Server-side: check if user can access admin dashboard.
 */
export async function canAccessAdmin(): Promise<boolean> {
  const role = await getClerkRole();
  return role === "admin" || role === "virtual_assistant";
}
