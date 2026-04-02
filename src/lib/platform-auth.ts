import { db } from "@/lib/db";

interface OAuthConnection {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
}

/**
 * Refresh a Google OAuth2 access token using a refresh token.
 * Updates the connection record in the database.
 * Returns the new access token or null if refresh fails.
 */
export async function refreshGoogleToken(
  connection: OAuthConnection,
  opts: {
    clientId: string;
    clientSecret: string;
    table: "gbp_connections" | "platform_connections";
  }
): Promise<string | null> {
  if (!connection.refresh_token) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      );
      if (opts.table === "gbp_connections") {
        await db.gbp_connections.update({
          where: { id: connection.id },
          data: {
            access_token: data.access_token,
            token_expires_at: expiresAt,
            status: "connected",
            updated_at: new Date(),
          },
        });
      } else {
        await db.platform_connections.update({
          where: { id: connection.id },
          data: {
            access_token: data.access_token,
            token_expires_at: expiresAt,
            status: "connected",
            updated_at: new Date(),
          },
        });
      }
      return data.access_token;
    }
  } catch (err) {
    // Log only the connection ID, never credentials
    console.error(`[platform-auth] Google token refresh failed for connection ${connection.id}:`,
      err instanceof Error ? err.message : "Unknown error");
  }

  // Mark connection as expired — wrap to prevent cascading failure
  try {
    if (opts.table === "gbp_connections") {
      await db.gbp_connections.update({
        where: { id: connection.id },
        data: { status: "expired", updated_at: new Date() },
      });
    } else {
      await db.platform_connections.update({
        where: { id: connection.id },
        data: { status: "expired", updated_at: new Date() },
      });
    }
  } catch (dbErr) {
    console.error(`[platform-auth] Failed to mark connection ${connection.id} as expired:`,
      dbErr instanceof Error ? dbErr.message : "Unknown error");
  }

  return null;
}

/**
 * Get a valid access token for an OAuth connection.
 * Returns the existing token if still valid, otherwise refreshes it.
 */
export async function getValidGoogleToken(
  connection: OAuthConnection,
  opts: {
    clientId: string;
    clientSecret: string;
    table: "gbp_connections" | "platform_connections";
  }
): Promise<string | null> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at) > new Date()
  ) {
    return connection.access_token;
  }
  return refreshGoogleToken(connection, opts);
}

/**
 * Refresh a Meta (Facebook) OAuth2 access token.
 * Meta uses long-lived token exchange instead of refresh tokens.
 */
export async function refreshMetaToken(
  connection: OAuthConnection,
  opts: {
    appId: string;
    appSecret: string;
  }
): Promise<string | null> {
  if (!connection.access_token) return null;

  try {
    // Use POST body instead of query string to avoid leaking credentials in logs
    const res = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: opts.appId,
        client_secret: opts.appSecret,
        fb_exchange_token: connection.access_token,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 5184000) * 1000
      );
      await db.platform_connections.update({
        where: { id: connection.id },
        data: {
          access_token: data.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          updated_at: new Date(),
        },
      });
      return data.access_token;
    }
  } catch (err) {
    console.error(`[platform-auth] Meta token refresh failed for connection ${connection.id}:`,
      err instanceof Error ? err.message : "Unknown error");
  }

  // Mark as expired — wrap in try/catch to prevent cascading failure
  try {
    await db.platform_connections.update({
      where: { id: connection.id },
      data: { status: "expired", updated_at: new Date() },
    });
  } catch (dbErr) {
    console.error(`[platform-auth] Failed to mark connection ${connection.id} as expired:`,
      dbErr instanceof Error ? dbErr.message : "Unknown error");
  }

  return null;
}
