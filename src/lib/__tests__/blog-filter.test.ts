import { describe, it, expect } from "vitest";
import {
  buildSearchText,
  collectTags,
  countByPillar,
  filterPosts,
  sortPosts,
  isDefaultView,
  type BlogListItem,
} from "../blog-filter";

function make(overrides: Partial<BlogListItem>): BlogListItem {
  const base: BlogListItem = {
    slug: "s",
    title: "Title",
    description: "Desc",
    pillar: "operator-math",
    pillarLabel: "Operator Math",
    tags: [],
    date: "2026-01-01",
    readingTime: 5,
    featured: false,
    searchText: "",
  };
  const merged = { ...base, ...overrides };
  merged.searchText = buildSearchText(
    merged.title,
    merged.description,
    merged.tags,
    merged.pillarLabel,
  );
  return merged;
}

const posts: BlogListItem[] = [
  make({
    slug: "reviews",
    title: "Get 50 Google Reviews",
    description: "A review playbook for operators",
    pillar: "whats-working",
    pillarLabel: "What's Working",
    tags: ["reviews", "local-search"],
    date: "2026-05-15",
    readingTime: 6,
  }),
  make({
    slug: "pricing",
    title: "The Web Rate Street Rate Spread",
    description: "Pricing power signal",
    pillar: "operator-math",
    pillarLabel: "Operator Math",
    tags: ["pricing", "revenue"],
    date: "2026-05-22",
    readingTime: 9,
  }),
  make({
    slug: "map",
    title: "Win the Local Map",
    description: "Outrank the REIT on reviews and proximity",
    pillar: "operators-edge",
    pillarLabel: "Operator's Edge",
    tags: ["local-search", "reviews", "google-business-profile"],
    date: "2026-06-26",
    readingTime: 8,
    featured: true,
  }),
];

describe("blog-filter", () => {
  describe("buildSearchText", () => {
    it("lowercases and concatenates title, description, pillar, tags", () => {
      const t = buildSearchText("Big Title", "Some Desc", ["TagA"], "Pillar Label");
      expect(t).toBe("big title some desc pillar label taga");
    });
  });

  describe("collectTags", () => {
    it("counts tags and sorts by frequency then alpha", () => {
      const tags = collectTags(posts);
      expect(tags[0]).toEqual({ tag: "local-search", count: 2 });
      expect(tags[1]).toEqual({ tag: "reviews", count: 2 });
      // remaining all count 1, alpha order
      const single = tags.slice(2).map((t) => t.tag);
      expect(single).toEqual([...single].sort());
    });
    it("returns empty for no tags", () => {
      expect(collectTags([make({ tags: [] })])).toEqual([]);
    });
  });

  describe("countByPillar", () => {
    it("tallies posts per pillar", () => {
      expect(countByPillar(posts)).toEqual({
        "whats-working": 1,
        "operator-math": 1,
        "operators-edge": 1,
      });
    });
  });

  describe("filterPosts", () => {
    it("returns all when filter empty", () => {
      expect(filterPosts(posts, {}).length).toBe(3);
    });
    it("filters by pillar exactly", () => {
      const r = filterPosts(posts, { pillar: "operator-math" });
      expect(r.map((p) => p.slug)).toEqual(["pricing"]);
    });
    it("matches query terms with AND across the haystack", () => {
      expect(filterPosts(posts, { query: "reviews" }).map((p) => p.slug).sort()).toEqual([
        "map",
        "reviews",
      ]);
      // two terms, both must match (AND)
      expect(filterPosts(posts, { query: "local map" }).map((p) => p.slug)).toEqual(["map"]);
    });
    it("is case-insensitive and ignores extra whitespace", () => {
      expect(filterPosts(posts, { query: "  PRICING   power " }).map((p) => p.slug)).toEqual([
        "pricing",
      ]);
    });
    it("filters by tags using ANY-of semantics", () => {
      const r = filterPosts(posts, { tags: ["pricing", "google-business-profile"] });
      expect(r.map((p) => p.slug).sort()).toEqual(["map", "pricing"]);
    });
    it("combines pillar AND query AND tags", () => {
      const r = filterPosts(posts, {
        pillar: "operators-edge",
        query: "reit",
        tags: ["reviews"],
      });
      expect(r.map((p) => p.slug)).toEqual(["map"]);
    });
    it("returns empty when nothing matches", () => {
      expect(filterPosts(posts, { query: "nonexistentxyz" })).toEqual([]);
    });
  });

  describe("sortPosts", () => {
    it("does not mutate the input array", () => {
      const before = posts.map((p) => p.slug);
      sortPosts(posts, "az");
      expect(posts.map((p) => p.slug)).toEqual(before);
    });
    it("newest sorts by date desc", () => {
      expect(sortPosts(posts, "newest").map((p) => p.slug)).toEqual(["map", "pricing", "reviews"]);
    });
    it("oldest sorts by date asc", () => {
      expect(sortPosts(posts, "oldest").map((p) => p.slug)).toEqual(["reviews", "pricing", "map"]);
    });
    it("shortest sorts by reading time asc", () => {
      expect(sortPosts(posts, "shortest").map((p) => p.readingTime)).toEqual([6, 8, 9]);
    });
    it("longest sorts by reading time desc", () => {
      expect(sortPosts(posts, "longest").map((p) => p.readingTime)).toEqual([9, 8, 6]);
    });
    it("az sorts by title", () => {
      expect(sortPosts(posts, "az").map((p) => p.title)).toEqual([
        "Get 50 Google Reviews",
        "The Web Rate Street Rate Spread",
        "Win the Local Map",
      ]);
    });
  });

  describe("isDefaultView", () => {
    it("true when no filters", () => {
      expect(isDefaultView({})).toBe(true);
      expect(isDefaultView({ query: "  ", pillar: null, tags: [] })).toBe(true);
    });
    it("false when any filter active", () => {
      expect(isDefaultView({ query: "x" })).toBe(false);
      expect(isDefaultView({ pillar: "operator-math" })).toBe(false);
      expect(isDefaultView({ tags: ["reviews"] })).toBe(false);
    });
  });
});
