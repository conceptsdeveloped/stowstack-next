import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, isAdminRequest } from "@/lib/api-helpers";
import { getSession } from "@/lib/session-auth";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const url = new URL(req.url);

  // Public access by slug (for rendering landing pages)
  const slug = url.searchParams.get("slug");
  if (slug) {
    const page = await db.landing_pages.findFirst({
      where: { slug, status: "published" },
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

  const facilityId = url.searchParams.get("facility_id");
  const id = url.searchParams.get("id");

  if (id) {
    const page = await db.landing_pages.findUnique({ where: { id } });
    if (!page) return errorResponse("Page not found", 404, origin);

    const sections = await db.landing_page_sections.findMany({
      where: { landing_page_id: page.id },
      orderBy: { sort_order: "asc" },
    });

    return jsonResponse({ page: { ...page, sections } }, 200, origin);
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
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { facilityId, name, slug, templateType, cloneFrom } = body;

    if (!facilityId || !name || !slug) {
      return errorResponse("Missing required fields: facilityId, name, slug", 400, origin);
    }

    // Check slug uniqueness
    const existing = await db.landing_pages.findFirst({ where: { slug } });
    if (existing) return errorResponse("Slug already exists", 400, origin);

    const page = await db.landing_pages.create({
      data: {
        facility_id: facilityId,
        title: name,
        slug,
        status: "draft",
      },
    });

    // Clone sections from another page if requested
    if (cloneFrom) {
      const sourceSections = await db.landing_page_sections.findMany({
        where: { landing_page_id: cloneFrom },
        orderBy: { sort_order: "asc" },
      });

      for (const section of sourceSections) {
        await db.landing_page_sections.create({
          data: {
            landing_page_id: page.id,
            section_type: section.section_type,
            sort_order: section.sort_order,
            config: section.config as object,
          },
        });
      }
    }

    return jsonResponse({ page }, 200, origin);
  } catch (err) {
    console.error("Landing page create error:", err);
    return errorResponse("Failed to create page", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return errorResponse("Missing page ID", 400, origin);

    const page = await db.landing_pages.findUnique({ where: { id } });
    if (!page) return errorResponse("Page not found", 404, origin);

    // Handle sections replacement
    if (updates.sections) {
      // Delete existing sections
      await db.landing_page_sections.deleteMany({
        where: { landing_page_id: id },
      });

      // Create new sections
      for (const section of updates.sections) {
        await db.landing_page_sections.create({
          data: {
            landing_page_id: id,
            section_type: section.section_type,
            sort_order: section.sort_order,
            config: section.config,
          },
        });
      }

      delete updates.sections;
    }

    // Update page fields
    const allowedFields = ["name", "slug", "status", "template_type", "meta_title", "meta_description", "og_image", "theme", "storedge_url"];
    const pageUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) pageUpdates[key] = updates[key];
    }

    if (Object.keys(pageUpdates).length > 0) {
      await db.landing_pages.update({ where: { id }, data: pageUpdates });
    }

    // Fetch updated page
    const updated = await db.landing_pages.findUnique({ where: { id } });
    const sections = await db.landing_page_sections.findMany({
      where: { landing_page_id: id },
      orderBy: { sort_order: "asc" },
    });

    return jsonResponse({ page: { ...updated, sections } }, 200, origin);
  } catch (err) {
    console.error("Landing page update error:", err);
    return errorResponse("Failed to update page", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("Missing page ID", 400, origin);

    await db.landing_page_sections.deleteMany({ where: { landing_page_id: id } });
    await db.landing_pages.delete({ where: { id } });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Landing page delete error:", err);
    return errorResponse("Failed to delete page", 500, origin);
  }
}
