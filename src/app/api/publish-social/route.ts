import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

const META_GRAPH = "https://graph.facebook.com/v21.0";

interface SocialPost {
  id: string;
  facility_id: string;
  platform: string;
  content: string;
  hashtags: string[] | null;
  media_urls: string[] | null;
  cta_url: string | null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { postId } = body as { postId?: string };
  if (!postId) {
    return errorResponse("postId required", 400, origin);
  }

  try {
    const postRows = await db.$queryRaw<Array<SocialPost>>`
      SELECT * FROM social_posts WHERE id = ${postId}
    `;
    const post = postRows[0];

    if (!post) {
      return errorResponse("Post not found", 404, origin);
    }

    await db.$executeRaw`
      UPDATE social_posts SET status = 'publishing', updated_at = NOW() WHERE id = ${postId}
    `;

    let result: {
      externalId: string | null;
      externalUrl: string | null;
      platform: string;
    };

    if (post.platform === "facebook") {
      result = await publishToFacebook(post);
    } else if (post.platform === "instagram") {
      result = await publishToInstagram(post);
    } else if (post.platform === "gbp") {
      result = await publishToGBP(post);
    } else {
      throw new Error(`Unsupported platform: ${post.platform}`);
    }

    await db.$executeRaw`
      UPDATE social_posts SET
        status = 'published',
        published_at = NOW(),
        external_post_id = ${result.externalId},
        external_url = ${result.externalUrl},
        updated_at = NOW()
      WHERE id = ${postId}
    `;

    return jsonResponse({ success: true, ...result }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await db
      .$executeRaw`UPDATE social_posts SET status = 'failed', error_message = ${message}, updated_at = NOW() WHERE id = ${postId}`
      .catch(() => {});

    return errorResponse(message, 500, origin);
  }
}

async function publishToFacebook(post: SocialPost) {
  const connection = await db.platform_connections.findFirst({
    where: {
      facility_id: post.facility_id,
      platform: "meta",
      status: "connected",
    },
  });
  if (!connection) {
    throw new Error(
      "No connected Meta account. Connect in the Ad Publisher tab first."
    );
  }

  const pageId = connection.page_id;
  const metadata =
    typeof connection.metadata === "string"
      ? JSON.parse(connection.metadata)
      : (connection.metadata as Record<string, unknown> | null);
  const pageAccessToken =
    (metadata?.pageAccessToken as string) || connection.access_token;

  if (!pageId || !pageAccessToken) {
    throw new Error(
      "Meta page not connected. Reconnect in the Ad Publisher tab."
    );
  }

  const hasMedia = post.media_urls && post.media_urls.length > 0;
  let fbResult: Record<string, unknown>;

  if (hasMedia) {
    const photoRes = await fetch(`${META_GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: post.media_urls![0],
        message: post.content,
        access_token: pageAccessToken,
      }),
    });
    fbResult = await photoRes.json();
  } else {
    const feedRes = await fetch(`${META_GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: post.content,
        link: post.cta_url || undefined,
        access_token: pageAccessToken,
      }),
    });
    fbResult = await feedRes.json();
  }

  if (fbResult.error) {
    throw new Error(
      `Facebook API: ${(fbResult.error as Record<string, string>).message}`
    );
  }

  const externalId =
    (fbResult.id as string) || (fbResult.post_id as string);
  return {
    externalId,
    externalUrl: `https://facebook.com/${externalId}`,
    platform: "facebook",
  };
}

async function publishToInstagram(post: SocialPost) {
  const connection = await db.platform_connections.findFirst({
    where: {
      facility_id: post.facility_id,
      platform: "meta",
      status: "connected",
    },
  });
  if (!connection) {
    throw new Error(
      "No connected Meta account. Connect in the Ad Publisher tab first."
    );
  }

  const metadata =
    typeof connection.metadata === "string"
      ? JSON.parse(connection.metadata)
      : (connection.metadata as Record<string, unknown> | null);
  const pageAccessToken =
    (metadata?.pageAccessToken as string) || connection.access_token;

  const pageId = connection.page_id;
  const igRes = await fetch(
    `${META_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );
  const igData = await igRes.json();
  const igUserId = igData?.instagram_business_account?.id;

  if (!igUserId) {
    throw new Error(
      "No Instagram Business account linked to your Facebook Page. Link it in Facebook Business Settings first."
    );
  }

  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error(
      "Instagram posts require at least one image. Add a photo before publishing."
    );
  }

  const hashtags =
    post.hashtags && post.hashtags.length > 0
      ? "\n\n" + post.hashtags.join(" ")
      : "";
  const caption = (post.content + hashtags).slice(0, 2200);

  const containerRes = await fetch(`${META_GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: post.media_urls[0],
      caption,
      access_token: pageAccessToken,
    }),
  });
  const container = await containerRes.json();
  if (container.error) {
    throw new Error(`Instagram API: ${container.error.message}`);
  }

  const publishRes = await fetch(
    `${META_GRAPH}/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: pageAccessToken,
      }),
    }
  );
  const published = await publishRes.json();
  if (published.error) {
    throw new Error(`Instagram publish: ${published.error.message}`);
  }

  return {
    externalId: published.id as string,
    externalUrl: `https://instagram.com/p/${published.id}`,
    platform: "instagram",
  };
}

async function publishToGBP(post: SocialPost) {
  const connection = await db.gbp_connections.findUnique({
    where: { facility_id: post.facility_id },
  });
  if (!connection || connection.status !== "connected") {
    throw new Error(
      "No connected Google Business Profile. Connect in the GBP tab first."
    );
  }

  let accessToken = connection.access_token;
  const tokenExpired =
    connection.token_expires_at &&
    new Date(connection.token_expires_at) < new Date();

  if (tokenExpired && connection.refresh_token) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`GBP token refresh failed: ${tokenData.error}`);
    }

    accessToken = tokenData.access_token;
    await db.gbp_connections.update({
      where: { id: connection.id },
      data: {
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000),
        updated_at: new Date(),
      },
    });
  }

  const locationName = connection.location_id;
  if (!locationName) {
    throw new Error(
      "GBP location not configured. Set it up in the GBP tab first."
    );
  }

  const gbpPost: Record<string, unknown> = {
    languageCode: "en",
    summary: post.content,
    topicType: "STANDARD",
  };

  if (post.cta_url) {
    gbpPost.callToAction = { actionType: "LEARN_MORE", url: post.cta_url };
  }
  if (post.media_urls && post.media_urls.length > 0) {
    gbpPost.media = [
      { mediaFormat: "PHOTO", sourceUrl: post.media_urls[0] },
    ];
  }

  const gbpRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gbpPost),
    }
  );
  const gbpResult = await gbpRes.json();
  if (gbpResult.error) {
    throw new Error(
      `GBP API: ${gbpResult.error.message || JSON.stringify(gbpResult.error)}`
    );
  }

  return {
    externalId: gbpResult.name as string,
    externalUrl: null,
    platform: "gbp",
  };
}
