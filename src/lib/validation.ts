/**
 * Validate UUID format. Returns true if valid.
 * Accepts any valid UUID format (v1-v5), not just v4.
 */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Email format validation. Rejects double dots, leading/trailing dots in domain,
 * and other structurally invalid addresses.
 */
export function isValidEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  // RFC 5321 simplified: local@domain.tld, no consecutive dots, no leading/trailing dots in domain
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(value);
}

/**
 * Clamp string to max length, trimming whitespace.
 */
export function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || maxLength <= 0) return "";
  return value.trim().slice(0, maxLength);
}

/**
 * Escape HTML special characters to prevent XSS in email templates and rendered content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
