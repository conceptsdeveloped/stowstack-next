/**
 * Shared role types and constants for Clerk auth.
 * Safe to import from both client and server components.
 */

export type StorageAdsRole =
  | "admin"
  | "virtual_assistant"
  | "client"
  | "partner";

/** Admin sidebar paths that VAs cannot access */
export const VA_RESTRICTED_PATHS = [
  "/admin/billing",
  "/admin/settings",
  "/admin/partners",
];
