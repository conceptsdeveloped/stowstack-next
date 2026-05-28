/**
 * Single source of truth for the "Book a Call" link.
 *
 * Why this file exists: prior to this, five files independently defined the
 * Cal.com URL, and the shared fallback (`cal.com/storageads/30min`) returned
 * 404. Anywhere the public env var was unset, the button was dead. Centralize
 * here so a future handle change is one edit.
 *
 * Verified working: https://cal.com/stowstack/30min — "Free Facility Audit
 * Review Meet | Blake Burkett". The `storageads` handle was never claimed; if
 * we ever claim it, change CAL_HANDLE_FALLBACK and set NEXT_PUBLIC_CALCOM_LINK
 * in Vercel.
 *
 * NEXT_PUBLIC_* env vars are inlined at build time on the client and read at
 * runtime on the server, so this module is safe to import from either side.
 */

const CAL_HANDLE_FALLBACK = "stowstack/30min";

const ENV_OVERRIDE = process.env.NEXT_PUBLIC_CALCOM_LINK?.trim();

function stripCalOrigin(value: string): string {
  return value
    .replace(/^https?:\/\/(?:www\.)?cal\.com\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

/** Slug suitable for the Cal embed (`calLink` param), e.g. "stowstack/30min". */
export const CAL_EMBED_SLUG: string = ENV_OVERRIDE
  ? stripCalOrigin(ENV_OVERRIDE) || CAL_HANDLE_FALLBACK
  : CAL_HANDLE_FALLBACK;

/** Full URL for `href` on Book-a-Call buttons. Always returns a working URL. */
export const CAL_BOOKING_URL: string = `https://cal.com/${CAL_EMBED_SLUG}`;
