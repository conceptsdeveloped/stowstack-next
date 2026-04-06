function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^|;)\s*__csrf_token=([^;]+)/);
  return match ? match[2] : null;
}

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (STATE_CHANGING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  const response = await fetch(url, { ...options, headers });

  // Auto-retry once on CSRF token expiration
  if (response.status === 403 && STATE_CHANGING_METHODS.has(method)) {
    const body = await response.clone().json().catch(() => null);
    if (body?.error?.includes("CSRF")) {
      // GET any page to refresh CSRF cookie
      await fetch("/api/health", { method: "GET" });
      const freshToken = getCsrfToken();
      if (freshToken) {
        headers.set("X-CSRF-Token", freshToken);
        return fetch(url, { ...options, headers });
      }
    }
  }

  return response;
}
