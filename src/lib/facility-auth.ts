/**
 * Client-side auth header resolver shared by facility tools.
 *
 * The facility tab components historically sent `X-Admin-Key: <adminKey>`.
 * To let the SAME components run under the owner-facing /manage shell, they
 * now build headers through this helper instead of hardcoding the admin key:
 *
 *  - Admin context: a non-empty `adminKey` is passed -> send X-Admin-Key
 *    (identical to previous behavior, so the admin dashboard is unaffected).
 *  - Owner context: the shell passes an empty `adminKey`; we fall back to the
 *    facility-scoped manage token stored client-side and send it as
 *    `x-manage-token` (the header the proxy treats as CSRF-exempt and that
 *    `requireFacilityAccess` validates against the requested facility).
 *
 * Keeping this in one place is the "auth abstraction" that avoids forking
 * every component for owners.
 */

export const MANAGE_TOKEN_STORAGE_KEY = "storageads_manage_token";

/** localStorage key for the admin key (matches use-admin-fetch.ts). */
export const ADMIN_KEY_STORAGE_KEY = "storageads_admin_key";

export function getManageToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(MANAGE_TOKEN_STORAGE_KEY) || "";
}

export function setManageToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MANAGE_TOKEN_STORAGE_KEY, token);
}

export function clearManageToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MANAGE_TOKEN_STORAGE_KEY);
}

/**
 * Resolve request headers for a facility tool call.
 * @param adminKey value the component received as its `adminKey` prop. Empty
 *   string signals owner (manage) context.
 */
export function authHeaders(adminKey: string): Record<string, string> {
  if (adminKey) return { "X-Admin-Key": adminKey };
  const token = getManageToken();
  if (token) return { "x-manage-token": token };
  return {};
}
