import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  v1CorsResponse,
  v1Json,
  v1Error,
  requireApiAuth,
  isErrorResponse,
  requireScope,
} from "@/lib/v1-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS() {
  return v1CorsResponse();
}

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.AUTHENTICATED, "v1-landing-pages");
  if (limited) return limited;
  const auth = await requireApiAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { apiKey } = auth;
  const orgId = apiKey.organization_id;

  const scopeErr = requireScope(apiKey, "pages:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const slug = url.searchParams.get("slug");
  const facilityId = url.searchParams.get("facilityId");

  try {
    if (id || slug) {
      let pageRows: Record<string, unknown>[];

      if (id) {
        pageRows = await db.$queryRaw`
          SELECT lp.id, lp.facility_id, lp.slug, lp.title, lp.status, lp.meta_title,
                 lp.meta_description, lp.og_image_url, lp.storedge_widget_url,
                 lp.created_at, lp.updated_at, lp.published_at
          FROM landing_pages lp
          JOIN facilities f ON f.id = lp.facility_id
          WHERE lp.id = ${id}::uuid AND f.organization_id = ${orgId}::uuid
        `;
      } else {
        pageRows = await db.$queryRaw`
          SELECT lp.id, lp.facility_id, lp.slug, lp.title, lp.status, lp.meta_title,
                 lp.meta_description, lp.og_image_url, lp.storedge_widget_url,
                 lp.created_at, lp.updated_at, lp.published_at
          FROM landing_pages lp
          JOIN facilities f ON f.id = lp.facility_id
          WHERE lp.slug = ${slug} AND f.organization_id = ${orgId}::uuid AND lp.status = 'published'
        `;
      }

      if (!pageRows.length) return v1Error("Landing page not found", 404);
      const page = pageRows[0];

      const [sections, utmLinks] = await Promise.all([
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT id, section_type, sort_order, config
          FROM landing_page_sections WHERE landing_page_id = ${page.id}::uuid ORDER BY sort_order
        `,
        db.$queryRaw<Record<string, unknown>[]>`
          SELECT id, label, utm_source, utm_medium, utm_campaign, utm_content,
                 short_code, click_count, last_clicked_at
          FROM utm_links WHERE landing_page_id = ${page.id}::uuid ORDER BY created_at DESC
        `,
      ]);

      return v1Json({ page: { ...page, sections, utmLinks } });
    }

    if (!facilityId) {
      return v1Error("facilityId, id, or slug is required");
    }

    const facilityRows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM facilities WHERE id = ${facilityId}::uuid AND organization_id = ${orgId}::uuid
    `;
    if (!facilityRows.length) return v1Error("Facility not found", 404);

    const pages = await db.$queryRaw`
      SELECT id, facility_id, slug, title, status, meta_title,
             created_at, updated_at, published_at
      FROM landing_pages WHERE facility_id = ${facilityId}::uuid ORDER BY created_at DESC
    `;

    return v1Json({ pages });
  } catch {
    return v1Error("Failed to fetch landing pages", 500);
  }
}
