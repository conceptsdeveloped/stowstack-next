import { db } from "@/lib/db";
import { sendEmail, SENDERS, resolveSiteUrl } from "@/lib/email";

/**
 * Notify a facility's portal client(s) that fresh PMS data is live in their
 * reports view (M6 event wiring: "new report ready").
 *
 * Called ONLY from admin/owner-side imports (`/api/pms-data` rent-roll import +
 * the M7 `process_report` approval gate) — never the client's own upload path,
 * which would email a tenant about data they just submitted themselves.
 *
 * Best-effort end to end: resolves every active client for the facility and
 * emails each via the canonical email layer, idempotency-keyed per client per
 * UTC day so repeated or partial imports in one session can't spam. Never
 * throws and never blocks the import — a notification failure must not fail the
 * data write. `sendEmail` is itself a no-op without RESEND_API_KEY.
 */
export async function notifyClientsReportReady(facilityId: string): Promise<void> {
  try {
    const clients = await db.clients.findMany({
      where: { facility_id: facilityId, deleted_at: null },
      select: { id: true, email: true, name: true, facility_name: true },
    });
    if (!clients.length) return;

    const siteUrl = resolveSiteUrl();
    const day = new Date().toISOString().slice(0, 10);

    await Promise.all(
      clients.map(async (c) => {
        if (!c.email) return;
        try {
          await sendEmail({
            from: SENDERS.reports,
            to: c.email,
            subject: "Your latest report is ready",
            // One notice per client per day, regardless of how many partial
            // imports (rent roll / aging / revenue) land in the same session.
            idempotencyKey: `report-ready-${c.id}-${day}`,
            html: reportReadyHtml(c.name, siteUrl),
            text:
              `Hi ${c.name || "there"},\n\n` +
              `Your latest performance report is ready to view in your StorageAds portal — ` +
              `occupancy, unit mix, and the numbers behind your campaigns.\n\n` +
              `Open your reports: ${siteUrl}/portal/reports`,
            tags: [{ name: "type", value: "report-ready" }],
          });
        } catch (err) {
          console.error("[report-notify] send failed:", err);
        }
      }),
    );
  } catch (err) {
    console.error("[report-notify] lookup failed:", err);
  }
}

/** Minimal light-theme transactional body (charcoal on cream, no gold). */
function reportReadyHtml(name: string | null, siteUrl: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const greeting = name ? `Hi ${esc(name)},` : "Hi there,";
  return `<!DOCTYPE html><html><body style="margin:0;background:#f7f6f2;padding:24px;font-family:'Helvetica Neue',Arial,sans-serif;color:#26241f;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e3da;border-radius:10px;padding:28px;">
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#26241f;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#57534a;">Your latest performance report is ready to view in your StorageAds portal &mdash; occupancy, unit mix, and the numbers behind your campaigns.</p>
    <a href="${siteUrl}/portal/reports" style="display:inline-block;background:#26241f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:6px;">View your reports</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94908a;">StorageAds &middot; <a href="mailto:blake@storageads.com" style="color:#94908a;">blake@storageads.com</a></p>
  </div>
</body></html>`;
}
