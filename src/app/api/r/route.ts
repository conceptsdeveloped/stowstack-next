import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_READ, "r-redirect");
  if (limited) return limited;
  const url = new URL(request.url);
  const c = url.searchParams.get("c");

  if (!c) {
    return NextResponse.redirect("https://storageads.com", 302);
  }

  try {
    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      UPDATE utm_links
      SET click_count = click_count + 1, last_clicked_at = NOW()
      WHERE short_code = ${c}
      RETURNING *
    `;

    if (!rows.length) {
      return NextResponse.redirect("https://storageads.com", 302);
    }

    const link = rows[0];

    let destination = "https://storageads.com";

    if (link.landing_page_id) {
      const lpRows = await db.$queryRaw<{ slug: string }[]>`
        SELECT slug FROM landing_pages WHERE id = ${link.landing_page_id}::uuid
      `;
      if (lpRows.length) {
        destination = `https://storageads.com/lp/${lpRows[0].slug}`;
      }
    }

    const params = new URLSearchParams();
    if (link.utm_source) params.set("utm_source", String(link.utm_source));
    if (link.utm_medium) params.set("utm_medium", String(link.utm_medium));
    if (link.utm_campaign)
      params.set("utm_campaign", String(link.utm_campaign));
    if (link.utm_content)
      params.set("utm_content", String(link.utm_content));
    if (link.utm_term) params.set("utm_term", String(link.utm_term));

    const qs = params.toString();
    const finalUrl = qs ? `${destination}?${qs}` : destination;

    return NextResponse.redirect(finalUrl, 302);
  } catch {
    return NextResponse.redirect("https://storageads.com", 302);
  }
}
