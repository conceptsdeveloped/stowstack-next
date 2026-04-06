/**
 * Runtime enum validation constants and helper.
 *
 * These mirror the categorical string fields stored in the database.
 * Use them to validate API inputs before writing, preventing typos
 * like "actvie" from silently corrupting data.
 *
 * Task 22 — enum validation (runtime approach, no schema migration).
 */

// ---------------------------------------------------------------------------
// Organization / facility status
// ---------------------------------------------------------------------------

export const ORGANIZATION_STATUS = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "pending_deletion",
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[number];

export const FACILITY_STATUS = [
  "active",
  "inactive",
  "pending",
  "suspended",
] as const;
export type FacilityStatus = (typeof FACILITY_STATUS)[number];

// ---------------------------------------------------------------------------
// User / org-user roles
// ---------------------------------------------------------------------------

export const ORG_USER_ROLE = [
  "owner",
  "admin",
  "manager",
  "viewer",
] as const;
export type OrgUserRole = (typeof ORG_USER_ROLE)[number];

export const ORG_USER_STATUS = [
  "active",
  "invited",
  "deactivated",
] as const;
export type OrgUserStatus = (typeof ORG_USER_STATUS)[number];

// ---------------------------------------------------------------------------
// Subscription / billing plans
// ---------------------------------------------------------------------------

/** Plans used by direct (client) checkout */
export const CLIENT_PLAN = [
  "launch",
  "growth",
  "portfolio",
  "enterprise",
] as const;
export type ClientPlan = (typeof CLIENT_PLAN)[number];

/** Plans used by partner/org signup */
export const ORG_PLAN = [
  "starter",
  "growth",
  "enterprise",
] as const;
export type OrgPlan = (typeof ORG_PLAN)[number];

export const SUBSCRIPTION_STATUS = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

// ---------------------------------------------------------------------------
// Lead / pipeline status (audit funnel)
// ---------------------------------------------------------------------------

export const PIPELINE_STATUS = [
  "submitted",
  "diagnostic_submitted",
  "audit_generated",
  "audit_sent",
  "form_sent",
  "form_completed",
  "call_scheduled",
  "call_booked",
  "client_signed",
  "lost",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUS)[number];

// ---------------------------------------------------------------------------
// Consumer lead status
// ---------------------------------------------------------------------------

export const CONSUMER_LEAD_STATUS = [
  "new",
  "contacted",
  "toured",
  "reserved",
  "moved_in",
  "lost",
  "partial",
] as const;
export type ConsumerLeadStatus = (typeof CONSUMER_LEAD_STATUS)[number];

// ---------------------------------------------------------------------------
// Drip / nurture sequence status
// ---------------------------------------------------------------------------

export const DRIP_STATUS = [
  "active",
  "paused",
  "completed",
  "cancelled",
  "draft",
] as const;
export type DripStatus = (typeof DRIP_STATUS)[number];

export const SEQUENCE_STATUS = [
  "pending",
  "active",
  "paused",
  "completed",
  "converted",
] as const;
export type SequenceStatus = (typeof SEQUENCE_STATUS)[number];

// ---------------------------------------------------------------------------
// GBP connection / review status
// ---------------------------------------------------------------------------

export const GBP_CONNECTION_STATUS = [
  "connected",
  "disconnected",
  "expired",
] as const;
export type GbpConnectionStatus = (typeof GBP_CONNECTION_STATUS)[number];

export const GBP_POST_STATUS = [
  "draft",
  "scheduled",
  "published",
  "failed",
] as const;
export type GbpPostStatus = (typeof GBP_POST_STATUS)[number];

export const GBP_REVIEW_RESPONSE_STATUS = [
  "pending",
  "ai_drafted",
  "published",
] as const;
export type GbpReviewResponseStatus = (typeof GBP_REVIEW_RESPONSE_STATUS)[number];

// ---------------------------------------------------------------------------
// Landing page status
// ---------------------------------------------------------------------------

export const LANDING_PAGE_STATUS = [
  "draft",
  "published",
  "archived",
] as const;
export type LandingPageStatus = (typeof LANDING_PAGE_STATUS)[number];

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Check whether `value` is one of the `allowedValues`.
 *
 * @example
 *   if (!isValidEnum(body.status, FACILITY_STATUS)) {
 *     return NextResponse.json({ error: "Invalid status" }, { status: 400 });
 *   }
 */
export function isValidEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is T {
  return typeof value === "string" && (allowedValues as readonly string[]).includes(value);
}

/**
 * Build a human-readable error message listing valid values.
 *
 * @example
 *   enumError("status", FACILITY_STATUS)
 *   // => 'Invalid status. Must be one of: active, inactive, pending, suspended'
 */
export function enumError(field: string, allowedValues: readonly string[]): string {
  return `Invalid ${field}. Must be one of: ${allowedValues.join(", ")}`;
}
