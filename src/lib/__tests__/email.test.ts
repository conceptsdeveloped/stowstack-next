import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SENDERS,
  SENDING_DOMAIN,
  RESEND_BATCH_LIMIT,
  facilitySender,
  isValidEmail,
  extractEmailAddress,
  validateEmailParams,
  resolveSiteUrl,
  sendEmail,
  sendEmailOrThrow,
  sendBatchEmails,
  type SendEmailParams,
} from "@/lib/email";

/* -------------------------------------------------------------------------- */
/* Test helpers                                                               */
/* -------------------------------------------------------------------------- */

// A minimal Response-like object for the mocked fetch. We only use the fields
// the module reads: ok, status, statusText, headers, json(), text().
function mockResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const ok = status >= 200 && status < 300;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    statusText: `HTTP ${status}`,
    headers: new Headers(headers),
    json: async () => (typeof body === "string" ? JSON.parse(body || "{}") : body),
    text: async () => text,
  } as unknown as Response;
}

function validParams(overrides: Partial<SendEmailParams> = {}): SendEmailParams {
  return {
    from: SENDERS.noreply,
    to: "customer@example.com",
    subject: "Hello",
    html: "<p>Hi</p>",
    // Keep tests fast and deterministic — no real backoff waits.
    retryBaseDelayMs: 0,
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();
  // Quiet the module's structured console output during tests.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});

  process.env.RESEND_API_KEY = "re_test_key";
  delete process.env.EMAIL_DRY_RUN;
  delete process.env.EMAIL_REDIRECT_TO;
  process.env.NODE_ENV = "test";

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.domain.io")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("two@@at.com")).toBe(false);
    expect(isValidEmail("space @x.com")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("extractEmailAddress", () => {
  it("pulls the address from a display-name form", () => {
    expect(extractEmailAddress("StorageAds <noreply@storageads.com>")).toBe(
      "noreply@storageads.com"
    );
  });

  it("returns a bare address unchanged", () => {
    expect(extractEmailAddress("noreply@storageads.com")).toBe("noreply@storageads.com");
  });

  it("returns null when no valid address is present", () => {
    expect(extractEmailAddress("StorageAds <not-an-email>")).toBeNull();
    expect(extractEmailAddress("garbage")).toBeNull();
  });
});

describe("SENDERS registry", () => {
  it("exposes every documented sender on the sending domain", () => {
    const keys = Object.keys(SENDERS);
    expect(keys).toEqual(
      expect.arrayContaining([
        "noreply",
        "system",
        "alerts",
        "notifications",
        "reports",
        "billing",
        "partners",
        "team",
        "blake",
        "anna",
      ])
    );
    for (const value of Object.values(SENDERS)) {
      const addr = extractEmailAddress(value);
      expect(addr, `sender "${value}" must contain a valid address`).not.toBeNull();
      expect(addr!.endsWith(`@${SENDING_DOMAIN}`)).toBe(true);
    }
  });
});

describe("facilitySender", () => {
  it("builds a facility-scoped from on the requested channel", () => {
    expect(facilitySender("Sunset Storage", "reviews")).toBe(
      "Sunset Storage <reviews@storageads.com>"
    );
    expect(facilitySender("Sunset Storage")).toBe(
      "Sunset Storage <notifications@storageads.com>"
    );
  });

  it("falls back to StorageAds when name is empty", () => {
    expect(facilitySender(null)).toBe("StorageAds <notifications@storageads.com>");
    expect(facilitySender("")).toBe("StorageAds <notifications@storageads.com>");
  });

  it("sanitizes characters that would break the display-name slot", () => {
    expect(facilitySender('Bad <name>"\n here', "reviews")).toBe(
      "Bad name here <reviews@storageads.com>"
    );
  });
});

describe("resolveSiteUrl", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = original.VERCEL_URL;
  });

  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.com";
    expect(resolveSiteUrl()).toBe("https://app.example.com");
  });

  it("falls back to VERCEL_URL then the canonical domain", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "preview-xyz.vercel.app";
    expect(resolveSiteUrl()).toBe("https://preview-xyz.vercel.app");
    delete process.env.VERCEL_URL;
    expect(resolveSiteUrl()).toBe("https://storageads.com");
  });
});

/* -------------------------------------------------------------------------- */
/* validateEmailParams                                                        */
/* -------------------------------------------------------------------------- */

describe("validateEmailParams", () => {
  it("passes a well-formed payload", () => {
    expect(validateEmailParams(validParams())).toBeNull();
  });

  it("requires a from address", () => {
    expect(validateEmailParams(validParams({ from: "" }))).toMatch(/Missing 'from'/);
  });

  it("rejects an unparseable from address", () => {
    expect(validateEmailParams(validParams({ from: "StorageAds <nope>" }))).toMatch(
      /Invalid 'from'/
    );
  });

  it("rejects a from address outside the sending domain", () => {
    expect(
      validateEmailParams(validParams({ from: "Evil <hi@evil.com>" }))
    ).toMatch(/must be on @storageads\.com/);
  });

  it("allows an external from when allowExternalDomain is set", () => {
    expect(
      validateEmailParams(
        validParams({ from: "Partner <hi@partner.com>", allowExternalDomain: true })
      )
    ).toBeNull();
  });

  it("requires at least one recipient", () => {
    expect(validateEmailParams(validParams({ to: [] }))).toMatch(/At least one 'to'/);
    expect(validateEmailParams(validParams({ to: "   " }))).toMatch(/At least one 'to'/);
  });

  it("rejects invalid recipient addresses (to/cc/bcc)", () => {
    expect(validateEmailParams(validParams({ to: "bad" }))).toMatch(/Invalid recipient/);
    expect(validateEmailParams(validParams({ cc: "bad" }))).toMatch(/Invalid recipient/);
    expect(validateEmailParams(validParams({ bcc: "bad" }))).toMatch(/Invalid recipient/);
  });

  it("rejects invalid reply-to addresses", () => {
    expect(validateEmailParams(validParams({ replyTo: "bad" }))).toMatch(/Invalid reply-to/);
  });

  it("enforces the recipient cap", () => {
    const many = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);
    expect(validateEmailParams(validParams({ to: many }))).toMatch(/Too many recipients/);
  });

  it("requires a subject", () => {
    expect(validateEmailParams(validParams({ subject: "  " }))).toMatch(/Missing 'subject'/);
  });

  it("validates attachments: filename required, exactly one of content/path", () => {
    expect(
      validateEmailParams(validParams({ attachments: [{ filename: "", content: "x" }] }))
    ).toMatch(/missing a filename/);
    // neither content nor path
    expect(
      validateEmailParams(validParams({ attachments: [{ filename: "a.pdf" }] }))
    ).toMatch(/exactly one of 'content' or 'path'/);
    // both content and path
    expect(
      validateEmailParams(
        validParams({ attachments: [{ filename: "a.pdf", content: "x", path: "https://h/a" }] })
      )
    ).toMatch(/exactly one of 'content' or 'path'/);
    // valid: content only
    expect(
      validateEmailParams(validParams({ attachments: [{ filename: "a.pdf", content: "x" }] }))
    ).toBeNull();
    // valid: path only
    expect(
      validateEmailParams(
        validParams({ attachments: [{ filename: "a.pdf", path: "https://h/a.pdf" }] })
      )
    ).toBeNull();
  });

  it("requires html or text content", () => {
    expect(
      validateEmailParams(validParams({ html: undefined, text: undefined }))
    ).toMatch(/must include 'html' or 'text'/);
    // text-only is fine
    expect(
      validateEmailParams(validParams({ html: undefined, text: "plain body" }))
    ).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* sendEmail — happy path & payload shaping                                   */
/* -------------------------------------------------------------------------- */

describe("sendEmail — success", () => {
  it("sends and returns the Resend id", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "msg_123" }));
    const result = await sendEmail(validParams());
    expect(result).toEqual({ ok: true, id: "msg_123", status: 200, attempts: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("POSTs to the Resend endpoint with auth + json headers", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(validParams());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("normalizes a single 'to' string into an array in the body", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(validParams({ to: "one@example.com" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["one@example.com"]);
  });

  it("supports multiple recipients and maps reply_to/cc/bcc/tags/headers/scheduled_at", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(
      validParams({
        to: ["a@example.com", "b@example.com"],
        cc: "cc@example.com",
        bcc: ["bcc@example.com"],
        replyTo: ["reply@storageads.com"],
        tags: [{ name: "type", value: "welcome" }],
        headers: { "X-Entity-Ref-ID": "abc" },
        scheduledAt: "2030-01-01T00:00:00Z",
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["a@example.com", "b@example.com"]);
    expect(body.cc).toEqual(["cc@example.com"]);
    expect(body.bcc).toEqual(["bcc@example.com"]);
    expect(body.reply_to).toEqual(["reply@storageads.com"]);
    expect(body.tags).toEqual([{ name: "type", value: "welcome" }]);
    expect(body.headers).toEqual({ "X-Entity-Ref-ID": "abc" });
    expect(body.scheduled_at).toBe("2030-01-01T00:00:00Z");
  });

  it("maps attachments to Resend's snake_case shape (content_type)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(
      validParams({
        attachments: [
          { filename: "report.pdf", content: "YmFzZTY0", contentType: "application/pdf" },
          { filename: "logo.png", path: "https://cdn.example.com/logo.png" },
        ],
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.attachments).toEqual([
      { filename: "report.pdf", content: "YmFzZTY0", content_type: "application/pdf" },
      { filename: "logo.png", path: "https://cdn.example.com/logo.png" },
    ]);
  });

  it("omits optional fields when not provided", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(validParams());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("cc");
    expect(body).not.toHaveProperty("bcc");
    expect(body).not.toHaveProperty("reply_to");
    expect(body).not.toHaveProperty("tags");
    expect(body).not.toHaveProperty("scheduled_at");
  });

  it("sends the Idempotency-Key header only when provided", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));
    await sendEmail(validParams({ idempotencyKey: "key-abc" }));
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe("key-abc");

    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "y" }));
    await sendEmail(validParams());
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty("Idempotency-Key");
  });
});

/* -------------------------------------------------------------------------- */
/* sendEmail — validation short-circuits                                      */
/* -------------------------------------------------------------------------- */

describe("sendEmail — validation", () => {
  it("returns an error and never calls fetch on invalid input", async () => {
    const result = await sendEmail(validParams({ to: "not-an-email" }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid recipient/);
    expect(result.attempts).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an off-domain sender before sending", async () => {
    const result = await sendEmail(validParams({ from: "x@gmail.com" }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/must be on @storageads\.com/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* sendEmail — environment guards                                             */
/* -------------------------------------------------------------------------- */

describe("sendEmail — guards", () => {
  it("skips (no network) when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail(validParams());
    expect(result).toMatchObject({ ok: false, skipped: true, skipReason: /RESEND_API_KEY/ });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips (no network) under EMAIL_DRY_RUN", async () => {
    process.env.EMAIL_DRY_RUN = "1";
    const result = await sendEmail(validParams());
    expect(result).toMatchObject({ ok: false, skipped: true, skipReason: "EMAIL_DRY_RUN" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects all recipients to EMAIL_REDIRECT_TO outside production", async () => {
    process.env.NODE_ENV = "development";
    process.env.EMAIL_REDIRECT_TO = "sink@storageads.com";
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));

    await sendEmail(
      validParams({ to: ["real@customer.com"], cc: "cc@customer.com", subject: "Report" })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["sink@storageads.com"]);
    expect(body).not.toHaveProperty("cc");
    expect(body.subject).toBe("[DEV→real@customer.com, cc@customer.com] Report");
  });

  it("does NOT redirect in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.EMAIL_REDIRECT_TO = "sink@storageads.com";
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "x" }));

    await sendEmail(validParams({ to: ["real@customer.com"], subject: "Report" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["real@customer.com"]);
    expect(body.subject).toBe("Report");
  });
});

/* -------------------------------------------------------------------------- */
/* sendEmail — retries & failure handling                                     */
/* -------------------------------------------------------------------------- */

describe("sendEmail — retries", () => {
  it("retries on 500 then succeeds, reporting attempt count", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(500, "boom"))
      .mockResolvedValueOnce(mockResponse(200, { id: "ok_after_retry" }));
    const result = await sendEmail(validParams());
    expect(result).toMatchObject({ ok: true, id: "ok_after_retry", attempts: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 (rate limit) then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(429, "slow down", { "retry-after": "0" }))
      .mockResolvedValueOnce(mockResponse(200, { id: "ok" }));
    const result = await sendEmail(validParams());
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on a thrown network error then succeeds", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(mockResponse(200, { id: "ok" }));
    const result = await sendEmail(validParams());
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it("exhausts retries on persistent 5xx and returns the last error", async () => {
    fetchMock.mockResolvedValue(mockResponse(503, "unavailable"));
    const result = await sendEmail(validParams({ retries: 2 }));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.attempts).toBe(3);
    expect(result.error).toMatch(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry a 422 (permanent validation error from Resend)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(422, { message: "domain not verified" })
    );
    const result = await sendEmail(validParams());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
    expect(result.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats an AbortError as a retryable timeout", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    fetchMock
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce(mockResponse(200, { id: "ok" }));
    const result = await sendEmail(validParams());
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it("respects retries:0 (single attempt, no retry)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, "boom"));
    const result = await sendEmail(validParams({ retries: 0 }));
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/* sendEmailOrThrow                                                           */
/* -------------------------------------------------------------------------- */

describe("sendEmailOrThrow", () => {
  it("returns the id on success", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: "msg" }));
    await expect(sendEmailOrThrow(validParams())).resolves.toEqual({ id: "msg" });
  });

  it("throws on a send failure", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(422, "bad"));
    await expect(sendEmailOrThrow(validParams())).rejects.toThrow(/Email send failed/);
  });

  it("throws on an intentional skip", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmailOrThrow(validParams())).rejects.toThrow(/Email skipped/);
  });
});

/* -------------------------------------------------------------------------- */
/* sendBatchEmails                                                            */
/* -------------------------------------------------------------------------- */

describe("sendBatchEmails", () => {
  it("POSTs an array to the batch endpoint and returns ids in order", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { data: [{ id: "a" }, { id: "b" }] })
    );
    const result = await sendBatchEmails([
      validParams({ to: "a@example.com", subject: "A" }),
      validParams({ to: "b@example.com", subject: "B" }),
    ]);
    expect(result).toMatchObject({ ok: true, ids: ["a", "b"], status: 200 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const body = JSON.parse(init.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].subject).toBe("A");
  });

  it("rejects an empty batch", async () => {
    const result = await sendBatchEmails([]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No messages/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a batch over the limit without sending", async () => {
    const big = Array.from({ length: RESEND_BATCH_LIMIT + 1 }, () =>
      validParams({ to: "x@example.com" })
    );
    const result = await sendBatchEmails(big);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Batch too large/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails fast (no network) when any message is invalid, naming the index", async () => {
    const result = await sendBatchEmails([
      validParams(),
      validParams({ to: "broken" }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Message 1:/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the batch under EMAIL_DRY_RUN", async () => {
    process.env.EMAIL_DRY_RUN = "1";
    const result = await sendBatchEmails([validParams()]);
    expect(result).toMatchObject({ ok: false, skipped: true, skipReason: "EMAIL_DRY_RUN" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a batch endpoint error", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, "down"));
    const result = await sendBatchEmails([validParams()]);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toMatch(/500/);
  });
});
