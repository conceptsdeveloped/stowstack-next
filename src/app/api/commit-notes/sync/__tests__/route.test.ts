import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

vi.mock("@/lib/db", () => ({
  db: {
    commit_enrichments: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/with-rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/commit-enrichment", () => ({
  classifyCommit: vi.fn(() => "feature"),
  generateSummaries: vi.fn(async () => ({ laymans: "L", technical: "T" })),
}));

import { db } from "@/lib/db";
import { POST } from "../route";

const m = db as unknown as {
  commit_enrichments: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

const ghCommit = (sha: string, message = "feat: thing") => ({
  sha,
  commit: { message, author: { name: "Blake", date: "2026-06-20T10:00:00Z" } },
});

/** Build a minimal fetch Response stand-in for the GitHub call. */
function ghResponse(body: unknown, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    headers: { get: () => null },
  } as unknown as Response;
}

describe("POST /api/commit-notes/sync", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("401s without an admin key", async () => {
    const res = await POST(createMockRequest("/api/commit-notes/sync", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("502s when the GitHub API fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(ghResponse("rate limited", { ok: false, status: 403 }));
    const res = await POST(createAdminRequest("/api/commit-notes/sync", { method: "POST" }));
    expect(res.status).toBe(502);
  });

  it("returns synced:0 when GitHub has no commits", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(ghResponse([]));
    const res = await POST(createAdminRequest("/api/commit-notes/sync", { method: "POST" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.synced).toBe(0);
  });

  it("skips already-synced commits and does not re-upsert them", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(ghResponse([ghCommit("aaa"), ghCommit("bbb")]));
    // "aaa" already exists in the DB.
    m.commit_enrichments.findMany.mockResolvedValueOnce([{ commit_hash: "aaa" }]);
    m.commit_enrichments.upsert.mockResolvedValue({});

    const res = await POST(createAdminRequest("/api/commit-notes/sync", { method: "POST" }));
    const json = await res.json();

    expect(json.skipped).toBe(1);
    expect(json.synced).toBe(1);
    expect(m.commit_enrichments.upsert).toHaveBeenCalledOnce();
    const args = m.commit_enrichments.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ commit_hash: "bbb" });
    expect(args.create).toMatchObject({
      commit_hash: "bbb",
      dev_name: "Blake",
      laymans_summary: "L",
      technical_summary: "T",
      commit_type: "feature",
    });
  });

  it("returns 'all synced' when every commit already exists", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(ghResponse([ghCommit("aaa")]));
    m.commit_enrichments.findMany.mockResolvedValueOnce([{ commit_hash: "aaa" }]);

    const res = await POST(createAdminRequest("/api/commit-notes/sync", { method: "POST" }));
    const json = await res.json();
    expect(json.synced).toBe(0);
    expect(json.skipped).toBe(1);
    expect(m.commit_enrichments.upsert).not.toHaveBeenCalled();
  });

  it("splits the commit message into subject and body", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(ghResponse([ghCommit("ccc", "feat: headline\n\nlong body here")]));
    m.commit_enrichments.findMany.mockResolvedValueOnce([]);
    m.commit_enrichments.upsert.mockResolvedValue({});

    await POST(createAdminRequest("/api/commit-notes/sync", { method: "POST" }));
    const args = m.commit_enrichments.upsert.mock.calls[0][0];
    expect(args.create.subject).toBe("feat: headline");
    expect(args.create.body).toBe("long body here");
  });
});
