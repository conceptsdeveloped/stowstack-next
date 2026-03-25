import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing API routes.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  const { method = "GET", headers = {}, body } = options;

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
    (init.headers as Headers).set("content-type", "application/json");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(new URL(url, "http://localhost:3000"), init as any);
}

/**
 * Create a mock request with admin auth header.
 */
export function createAdminRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      "x-admin-key": "test-admin-secret-key",
      ...options.headers,
    },
  });
}

/**
 * Create a mock request with Bearer token auth.
 */
export function createBearerRequest(
  url: string,
  token: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}
