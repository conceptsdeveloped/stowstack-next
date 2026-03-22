import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a self-storage facility site map analyzer. You receive screenshots of site maps from storEDGE property management software. Your job is to identify every visible unit on the map, read its unit number/label, and determine its color status.

CRITICAL RULES:
1. Identify EVERY unit rectangle/cell visible on the map. Each unit has a label (e.g., "A1", "B22", "G170", "101", "D-5").
2. Determine the color of each unit. storEDGE uses these colors:
   - BLUE = Occupied (rented, active tenant)
   - RED = Past Due (delinquent, overdue payment, lien/auction)
   - YELLOW = Reserved (held for upcoming tenant)
   - GREY/GRAY = Unrentable (company use, needs repair, out of service)
   - GREEN = Vacant/Available (ready to rent)
   - If a color doesn't clearly match, use "unknown" and describe it in the notes field.
3. Group units by building/section if the map shows clear building divisions (labeled rows, sections, or physical groupings). Use whatever labels the map shows (e.g., "Building A", "Row 1", "Section A"). If units have letter prefixes (A1, A2, B1, B2), group by the letter prefix. If no clear groupings exist, use "Ungrouped".
4. Read unit labels EXACTLY as shown on the map. Include any prefix letters, hyphens, or numbers. Do not guess or fabricate unit IDs.
5. If a unit label is partially obscured or hard to read, include your best reading and set "labelUncertain": true.
6. Count carefully. Report the total number of units found.
7. For parking spots (labeled P, P1, P2, etc.) — include them in a separate "Parking" building group.

OUTPUT FORMAT — return ONLY this JSON, no markdown fences, no extra text:
{
  "facilityName": "<name if visible on map, otherwise use the provided name>",
  "totalUnitsFound": <number>,
  "buildings": [
    {
      "id": "<building/section identifier letter or short code>",
      "name": "<full building/section name>",
      "units": [
        {
          "id": "<unit label exactly as shown>",
          "mapColor": "<blue|red|yellow|gray|green|unknown>",
          "labelUncertain": false,
          "notes": ""
        }
      ]
    }
  ],
  "summary": {
    "blue": <count>,
    "red": <count>,
    "yellow": <count>,
    "gray": <count>,
    "green": <count>,
    "unknown": <count>
  },
  "mapNotes": "<any observations about map quality, missing areas, or issues>"
}`;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const body = await req.json().catch(() => null);
  const { image, mimeType, facilityName } = body || {};

  if (!image || !mimeType) {
    return errorResponse("Missing image data or mimeType", 400, origin);
  }

  if (
    !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)
  ) {
    return errorResponse(
      "Unsupported image type. Use PNG, JPEG, or WebP.",
      400,
      origin,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "Server configuration error: missing API key",
      500,
      origin,
    );
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `Analyze this storEDGE site map screenshot. Extract every unit number and its color status. Group by building/section.${facilityName ? ` Facility name: ${facilityName}` : ""}

Be thorough — identify ALL units visible on the map, even small or partially visible ones. The accuracy of a physical audit depends on this extraction.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/webp"
                  | "image/gif",
                data: image,
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
      ],
    });

    const responseText =
      (message.content[0] as { type: "text"; text: string })?.text || "";

    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return jsonResponse(
        { error: "Failed to parse map analysis", rawResponse: responseText },
        200,
        origin,
      );
    }

    return jsonResponse(parsed, 200, origin);
  } catch (err) {
    return errorResponse(
      `Map analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500,
      origin,
    );
  }
}
