import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const facilities = await db.facilities.findMany({
      orderBy: { created_at: "desc" },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get latest places_data for each facility
    const facilityIds = facilities.map((f) => f.id);
    const placesRows =
      facilityIds.length > 0
        ? await db.places_data.findMany({
            where: { facility_id: { in: facilityIds } },
            orderBy: { fetched_at: "desc" },
            distinct: ["facility_id"],
            select: {
              facility_id: true,
              photos: true,
              reviews: true,
            },
          })
        : [];

    const placesByFacility: Record<
      string,
      { photos: unknown; reviews: unknown }
    > = {};
    for (const pd of placesRows) {
      if (pd.facility_id) {
        placesByFacility[pd.facility_id] = {
          photos: pd.photos,
          reviews: pd.reviews,
        };
      }
    }

    const result = facilities.map((f) => ({
      id: f.id,
      created_at: f.created_at,
      name: f.name,
      location: f.location,
      contact_name: f.contact_name,
      contact_email: f.contact_email,
      contact_phone: f.contact_phone,
      occupancy_range: f.occupancy_range,
      total_units: f.total_units,
      biggest_issue: f.biggest_issue,
      notes: f.notes,
      status: f.status,
      google_address: f.google_address,
      google_rating: f.google_rating,
      review_count: f.review_count,
      website: f.website,
      google_maps_url: f.google_maps_url,
      google_phone: f.google_phone,
      organization: f.organizations
        ? {
            id: f.organizations.id,
            name: f.organizations.name,
            slug: f.organizations.slug,
          }
        : null,
      photos: placesByFacility[f.id]?.photos ?? null,
      reviews: placesByFacility[f.id]?.reviews ?? null,
    }));

    return jsonResponse({ facilities: result }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch facilities", 500, origin);
  }
}

const VALID_STATUSES = [
  "intake",
  "scraped",
  "briefed",
  "generating",
  "review",
  "approved",
  "live",
  "reporting",
];

const EDITABLE_FIELDS = [
  "name",
  "location",
  "contact_name",
  "contact_email",
  "contact_phone",
  "occupancy_range",
  "total_units",
  "biggest_issue",
  "notes",
  "google_address",
  "google_phone",
  "website",
  "google_rating",
  "review_count",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, status, ...fields } = body || {};
    if (!id) return errorResponse("id required", 400, origin);

    const updateData: Record<string, unknown> = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return errorResponse("Invalid status", 400, origin);
      }
      updateData.status = status;
    }

    for (const [key, value] of Object.entries(fields)) {
      if (EDITABLE_FIELDS.includes(key as EditableField)) {
        updateData[key] = value === "" ? null : value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("Nothing to update", 400, origin);
    }

    const facility = await db.facilities.update({
      where: { id },
      data: updateData,
    });

    return jsonResponse({ success: true, facility }, 200, origin);
  } catch {
    return errorResponse("Failed to update facility", 500, origin);
  }
}
