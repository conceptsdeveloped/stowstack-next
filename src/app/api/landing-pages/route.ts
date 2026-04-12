import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, isAdminRequest } from "@/lib/api-helpers";
import { getSession } from "@/lib/session-auth";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "landing-pages");
  if (limited) return limited;
  const origin = getOrigin(req);
  const url = new URL(req.url);

  // Public access by slug (for rendering landing pages)
  const slug = url.searchParams.get("slug");
  if (slug) {
    const preview = url.searchParams.get("preview") === "1" && isAdminRequest(req);
    const page = await db.landing_pages.findFirst({
      where: preview ? { slug } : { slug, status: "published" },
    });
    if (!page) return errorResponse("Page not found", 404, origin);

    const sections = await db.landing_page_sections.findMany({
      where: { landing_page_id: page.id },
      orderBy: { sort_order: "asc" },
    });

    return jsonResponse({ page: { ...page, sections } }, 200, origin);
  }

  // Admin access by ID or facility
  const isAdmin = isAdminRequest(req);
  const session = !isAdmin ? await getSession(req) : null;
  if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

  const facilityId = url.searchParams.get("facility_id") || url.searchParams.get("facilityId");
  const id = url.searchParams.get("id");

  if (id) {
    const page = await db.landing_pages.findFirst({
      where: {
        id,
        ...(session ? { facilities: { organization_id: session.organization.id } } : {}),
      },
      include: { landing_page_sections: { orderBy: { sort_order: "asc" } } },
    });
    if (!page) return errorResponse("Not found", 404, origin);

    const { landing_page_sections: sections, ...pageData } = page;
    return jsonResponse({ page: { ...pageData, sections } }, 200, origin);
  }

  const where: Record<string, unknown> = {};
  if (facilityId) where.facility_id = facilityId;
  if (session && !isAdmin) {
    // Scope to org's facilities
    const orgFacilities = await db.facilities.findMany({
      where: { organization_id: session.organization.id },
      select: { id: true },
    });
    where.facility_id = { in: orgFacilities.map((f) => f.id) };
  }

  const pages = await db.landing_pages.findMany({
    where,
    orderBy: { created_at: "desc" },
  });

  return jsonResponse({ pages }, 200, origin);
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "landing-pages");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const {
      facilityId,
      name,
      title,
      slug,
      status,
      metaTitle,
      metaDescription,
      theme,
      storedgeWidgetUrl,
      ogImageUrl,
      variationIds,
      sections,
      cloneFrom,
    } = body;
    const pageTitle: string | undefined = title || name;

    // For clone-only requests, generate title/slug automatically
    if (cloneFrom && (!pageTitle || !slug)) {
      const sourceP = await db.landing_pages.findUnique({ where: { id: cloneFrom } });
      if (!sourceP) return errorResponse("Source page not found", 404, origin);
      const cloneTitle = pageTitle || `${sourceP.title} (Copy)`;
      const cloneSlug = slug || `${sourceP.slug}-copy-${Date.now().toString(36)}`;
      const cloneFacility = facilityId || sourceP.facility_id;

      const existing = await db.landing_pages.findFirst({ where: { slug: cloneSlug } });
      if (existing) return errorResponse("Slug already exists", 400, origin);

      const clonedPage = await db.$transaction(async (tx) => {
        const newPage = await tx.landing_pages.create({
          data: { facility_id: cloneFacility, title: cloneTitle, slug: cloneSlug, status: "draft" },
        });

        const sourceSections = await tx.landing_page_sections.findMany({
          where: { landing_page_id: cloneFrom },
          orderBy: { sort_order: "asc" },
        });
        for (const section of sourceSections) {
          await tx.landing_page_sections.create({
            data: {
              landing_page_id: newPage.id,
              section_type: section.section_type,
              sort_order: section.sort_order,
              config: section.config as object,
            },
          });
        }

        return newPage;
      });

      return jsonResponse({ page: clonedPage }, 200, origin);
    }

    if (!facilityId || !pageTitle || !slug) {
      return errorResponse("Missing required fields: facilityId, title, slug", 400, origin);
    }

    const existing = await db.landing_pages.findFirst({ where: { slug } });
    if (existing) return errorResponse("Slug already exists", 400, origin);

    const nowPublished = status === "published";

    const page = await db.$transaction(async (tx) => {
      const newPage = await tx.landing_pages.create({
        data: {
          facility_id: facilityId,
          title: pageTitle,
          slug,
          status: status || "draft",
          meta_title: metaTitle ?? null,
          meta_description: metaDescription ?? null,
          theme: theme ?? {},
          storedge_widget_url: storedgeWidgetUrl ?? null,
          og_image_url: ogImageUrl ?? null,
          variation_ids: Array.isArray(variationIds) ? variationIds : [],
          published_at: nowPublished ? new Date() : null,
        },
      });

      if (cloneFrom) {
        const sourceSections = await tx.landing_page_sections.findMany({
          where: { landing_page_id: cloneFrom },
          orderBy: { sort_order: "asc" },
        });
        for (const section of sourceSections) {
          await tx.landing_page_sections.create({
            data: {
              landing_page_id: newPage.id,
              section_type: section.section_type,
              sort_order: section.sort_order,
              config: section.config as object,
            },
          });
        }
      } else if (Array.isArray(sections)) {
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          await tx.landing_page_sections.create({
            data: {
              landing_page_id: newPage.id,
              section_type: s.sectionType || s.section_type,
              sort_order: s.sortOrder ?? s.sort_order ?? i,
              config: s.config ?? {},
            },
          });
        }
      }

      const createdSections = await tx.landing_page_sections.findMany({
        where: { landing_page_id: newPage.id },
        orderBy: { sort_order: "asc" },
      });

      return { ...newPage, sections: createdSections };
    });

    return jsonResponse({ page }, 200, origin);
  } catch (err) {
    console.error("Landing page create error:", err);
    return errorResponse("Failed to create page", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "landing-pages");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const url = new URL(req.url);
    const body = await req.json();
    const id = body.id || url.searchParams.get("id");
    if (!id) return errorResponse("Missing page ID", 400, origin);

    const { ...updates } = body;
    delete updates.id;
    delete updates.facilityId;
    delete updates.facility_id;

    const page = await db.landing_pages.findUnique({ where: { id } });
    if (!page) return errorResponse("Page not found", 404, origin);

    const sections = updates.sections;
    delete updates.sections;

    const fieldMap: Record<string, string> = {
      metaTitle: "meta_title",
      metaDescription: "meta_description",
      storedgeWidgetUrl: "storedge_widget_url",
      ogImageUrl: "og_image_url",
      ogImage: "og_image_url",
      variationIds: "variation_ids",
    };
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (updates[camel] !== undefined && updates[snake] === undefined) {
        updates[snake] = updates[camel];
      }
      delete updates[camel];
    }

    const allowedFields = [
      "title",
      "slug",
      "status",
      "meta_title",
      "meta_description",
      "og_image_url",
      "theme",
      "storedge_widget_url",
      "variation_ids",
    ];
    const pageUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) pageUpdates[key] = updates[key];
    }

    if (
      pageUpdates.status === "published" &&
      page.status !== "published" &&
      !page.published_at
    ) {
      pageUpdates.published_at = new Date();
    }

    const { updated, updatedSections } = await db.$transaction(async (tx) => {
      if (sections) {
        await tx.landing_page_sections.deleteMany({
          where: { landing_page_id: id },
        });

        for (const section of sections) {
          await tx.landing_page_sections.create({
            data: {
              landing_page_id: id,
              section_type: section.section_type || section.sectionType,
              sort_order: section.sort_order ?? section.sortOrder ?? 0,
              config: section.config,
            },
          });
        }
      }

      if (Object.keys(pageUpdates).length > 0) {
        await tx.landing_pages.update({ where: { id }, data: pageUpdates });
      }

      // Fetch updated page
      const updated = await tx.landing_pages.findUnique({ where: { id } });
      const updatedSections = await tx.landing_page_sections.findMany({
        where: { landing_page_id: id },
        orderBy: { sort_order: "asc" },
      });

      return { updated, updatedSections };
    });

    return jsonResponse({ page: { ...updated, sections: updatedSections } }, 200, origin);
  } catch (err) {
    console.error("Landing page update error:", err);
    return errorResponse("Failed to update page", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "landing-pages");
  if (limited) return limited;
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("Missing page ID", 400, origin);

    await db.$transaction(async (tx) => {
      await tx.landing_page_sections.deleteMany({ where: { landing_page_id: id } });
      await tx.landing_pages.delete({ where: { id } });
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Landing page delete error:", err);
    return errorResponse("Failed to delete page", 500, origin);
  }
}
