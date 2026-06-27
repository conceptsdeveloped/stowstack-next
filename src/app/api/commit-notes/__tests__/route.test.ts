import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminRequest, createMockRequest } from "@/test/helpers";

// Route uses Prisma model methods; supply a focused db mock for what it calls.
vi.mock("@/lib/db", () => ({
  db: {
    commit_enrichments: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Rate limiter is a no-op in tests (avoids hitting Upstash).
vi.mock("@/lib/with-rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

// Keep the AI summary generation deterministic and offline.
vi.mock("@/lib/commit-enrichment", () => ({
  classifyCommit: vi.fn(() => "feature"),
  generateSummaries: vi.fn(async () => ({
    laymans: "Mock layman.",
    technical: "Mock technical.",
  })),
}));

import { db } from "@/lib/db";
import { GET, POST, PATCH } from "../route";

const m = db as unknown as {
  commit_enrichments: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const row = (over: Record<string, unknown> = {}) => ({
  id: "id-1",
  commit_hash: "abc1234def5678",
  subject: "feat(admin): add changelog",
  body: "body text",
  dev_note: "a dev note",
  dev_name: "Blake",
  commit_type: "feature",
  laymans_summary: "Added the changelog.",
  technical_summary: "Wires up commit_enrichments.",
  committed_at: new Date("2026-06-20T10:00:00Z"),
  created_at: new Date("2026-06-20T10:00:00Z"),
  ...over,
});

/**
 * Wire the mocks for one GET call. findMany is invoked twice (entries, then the
 * distinct dev-name query); count is invoked four times (total, feature, fix,
 * improvement) — all in deterministic order.
 */
function primeMocks({
  entries,
  devs = [{ dev_name: "Blake" }, { dev_name: "Angelo" }],
  total = 1,
  feature = 1,
  fix = 0,
  improvement = 0,
}: {
  entries: ReturnType<typeof row>[];
  devs?: { dev_name: string }[];
  total?: number;
  feature?: number;
  fix?: number;
  improvement?: number;
}) {
  m.commit_enrichments.findMany
    .mockResolvedValueOnce(entries) // entries
    .mockResolvedValueOnce(devs); // distinct dev names
  m.commit_enrichments.count
    .mockResolvedValueOnce(total)
    .mockResolvedValueOnce(feature)
    .mockResolvedValueOnce(fix)
    .mockResolvedValueOnce(improvement);
}

describe("GET /api/commit-notes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s without an admin key", async () => {
    const res = await GET(createMockRequest("/api/commit-notes"));
    expect(res.status).toBe(401);
  });

  it("shapes a row into the frontend entry contract", async () => {
    primeMocks({ entries: [row()], total: 1, feature: 1 });
    const res = await GET(createAdminRequest("/api/commit-notes"));
    expect(res.status).toBe(200);
    const json = await res.json();
    const e = json.entries[0];
    expect(e).toMatchObject({
      id: "id-1",
      commitHash: "abc1234def5678",
      title: "Added the changelog.",
      description: "Wires up commit_enrichments.",
      type: "feature",
      devName: "Blake",
      devNote: "a dev note",
      subject: "feat(admin): add changelog",
    });
    expect(e.date).toBe(new Date("2026-06-20T10:00:00Z").toISOString());
  });

  it("falls back to the cleaned subject when there is no layman summary", async () => {
    primeMocks({
      entries: [row({ laymans_summary: null, subject: "fix: header overlap", technical_summary: null })],
    });
    const json = await (await GET(createAdminRequest("/api/commit-notes"))).json();
    expect(json.entries[0].title).toBe("header overlap");
    expect(json.entries[0].description).toBe("body text"); // technical null → body
  });

  it("falls back to the short hash when subject and summary are empty", async () => {
    primeMocks({
      entries: [row({ laymans_summary: null, subject: "", commit_hash: "deadbeefcafe" })],
    });
    const json = await (await GET(createAdminRequest("/api/commit-notes"))).json();
    expect(json.entries[0].title).toBe("deadbee");
  });

  it("returns developers, typeCounts, and hasMore", async () => {
    primeMocks({ entries: [row()], total: 3, feature: 2, fix: 1, improvement: 0 });
    const json = await (await GET(createAdminRequest("/api/commit-notes"))).json();
    expect(json.developers).toEqual(["Blake", "Angelo"]);
    expect(json.typeCounts).toEqual({ feature: 2, fix: 1, improvement: 0, all: 3 });
    expect(json.hasMore).toBe(false); // offset(0) + limit(50) >= total(3)
  });

  it("clamps limit to a max of 200 and floors offset at 0", async () => {
    primeMocks({ entries: [] });
    await GET(createAdminRequest("/api/commit-notes?limit=999&offset=-5"));
    const firstCall = m.commit_enrichments.findMany.mock.calls[0][0];
    expect(firstCall.take).toBe(200);
    expect(firstCall.skip).toBe(0);
  });

  it("applies type, dev, and search filters to the where clause", async () => {
    primeMocks({ entries: [] });
    await GET(
      createAdminRequest("/api/commit-notes?type=fix&dev=blake&search=onboarding"),
    );
    const where = m.commit_enrichments.findMany.mock.calls[0][0].where;
    expect(where.commit_type).toBe("fix");
    expect(where.dev_name).toEqual({ contains: "blake", mode: "insensitive" });
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toContainEqual({ commit_hash: { startsWith: "onboarding" } });
  });

  it("ignores an invalid type filter", async () => {
    primeMocks({ entries: [] });
    await GET(createAdminRequest("/api/commit-notes?type=bogus"));
    const where = m.commit_enrichments.findMany.mock.calls[0][0].where;
    expect(where.commit_type).toBeUndefined();
  });
});

describe("POST /api/commit-notes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s without an admin key", async () => {
    const res = await POST(
      createMockRequest("/api/commit-notes", {
        method: "POST",
        body: { commitHash: "abc", devName: "Blake" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when commitHash is missing", async () => {
    const res = await POST(
      createAdminRequest("/api/commit-notes", { method: "POST", body: { devName: "Blake" } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s when devName is missing", async () => {
    const res = await POST(
      createAdminRequest("/api/commit-notes", { method: "POST", body: { commitHash: "abc1234" } }),
    );
    expect(res.status).toBe(400);
  });

  it("upserts an enrichment and returns 201", async () => {
    m.commit_enrichments.upsert.mockResolvedValueOnce({ id: "x", commit_hash: "abc1234" });
    const res = await POST(
      createAdminRequest("/api/commit-notes", {
        method: "POST",
        body: { commitHash: "abc1234", devName: "Blake", subject: "feat: x", body: "b" },
      }),
    );
    expect(res.status).toBe(201);
    expect(m.commit_enrichments.upsert).toHaveBeenCalledOnce();
    const args = m.commit_enrichments.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ commit_hash: "abc1234" });
    expect(args.create).toMatchObject({
      commit_hash: "abc1234",
      dev_name: "Blake",
      laymans_summary: "Mock layman.",
      technical_summary: "Mock technical.",
      commit_type: "feature",
    });
  });
});

describe("PATCH /api/commit-notes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s without an admin key", async () => {
    const res = await PATCH(
      createMockRequest("/api/commit-notes", { method: "PATCH", body: { commitHash: "abc" } }),
    );
    expect(res.status).toBe(401);
  });

  it("404s when the commit has no existing enrichment", async () => {
    m.commit_enrichments.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(
      createAdminRequest("/api/commit-notes", { method: "PATCH", body: { commitHash: "ghost" } }),
    );
    expect(res.status).toBe(404);
  });

  it("regenerates summaries and updates an existing enrichment", async () => {
    m.commit_enrichments.findUnique.mockResolvedValueOnce({
      commit_hash: "abc1234",
      subject: "feat: x",
      body: "old body",
      dev_note: "old note",
    });
    m.commit_enrichments.update.mockResolvedValueOnce({ id: "x", commit_hash: "abc1234" });
    const res = await PATCH(
      createAdminRequest("/api/commit-notes", {
        method: "PATCH",
        body: { commitHash: "abc1234", devNote: "new note" },
      }),
    );
    expect(res.status).toBe(200);
    const args = m.commit_enrichments.update.mock.calls[0][0];
    expect(args.where).toEqual({ commit_hash: "abc1234" });
    expect(args.data).toMatchObject({
      dev_note: "new note",
      laymans_summary: "Mock layman.",
      technical_summary: "Mock technical.",
    });
  });
});
