import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { classifyCommit, generateSummaries } from "../commit-enrichment";

describe("classifyCommit", () => {
  describe("fix", () => {
    it.each([
      "fix: login redirect",
      "fix(auth): null session",
      "hotfix urgent prod issue",
      "patch the broken import",
      "resolve race condition",
      "revert bad migration",
      "repair the webhook handler",
      "Handle bug fix for billing",
      "Page crash on empty state",
      "Header is broken on mobile",
    ])("classifies %j as fix", (subject) => {
      expect(classifyCommit(subject)).toBe("fix");
    });
  });

  describe("feature", () => {
    it.each([
      "feat: cost-of-inaction page",
      "feat(partner): rev-share backend",
      "add related posts module",
      "new pricing tier",
      "implement audit funnel",
      "introduce command palette",
      "launch the blog",
      "create landing page builder",
      "build the ECRI tool",
      "enable two-factor auth",
    ])("classifies %j as feature", (subject) => {
      expect(classifyCommit(subject)).toBe("feature");
    });
  });

  describe("improvement (default)", () => {
    it.each([
      "chore: bump deps",
      "refactor: split hero component",
      "docs: update README",
      "perf: memoize selectors",
      "style: tidy spacing",
      "Update copy on pricing page",
      "Tighten the eslint config",
      "",
    ])("classifies %j as improvement", (subject) => {
      expect(classifyCommit(subject)).toBe("improvement");
    });
  });

  it("is case-insensitive", () => {
    expect(classifyCommit("FIX: broken thing")).toBe("fix");
    expect(classifyCommit("FEAT: shiny thing")).toBe("feature");
  });

  it("checks fix before feature (fix wins when both could match)", () => {
    // "add" would match feature, but "broken" matches fix and is checked first.
    expect(classifyCommit("add handling for broken uploads")).toBe("fix");
  });

  it("treats a feat that mentions fixing as a feature", () => {
    // "feat: fix bug" — no fix pattern matches ("bug fix" order differs), so feature.
    expect(classifyCommit("feat: fix the onboarding flow")).toBe("feature");
  });

  it("handles non-string-ish empty input safely", () => {
    expect(classifyCommit("")).toBe("improvement");
  });
});

describe("generateSummaries (fallback path, no API key)", () => {
  const original = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original;
  });

  it("strips the conventional prefix and capitalizes the layman summary", async () => {
    const { laymans, technical } = await generateSummaries(
      "feat(admin): add changelog dashboard",
      "Wires up the commit_enrichments table.",
    );
    expect(laymans).toBe("Add changelog dashboard.");
    expect(technical).toBe("Wires up the commit_enrichments table.");
  });

  it("prefers the developer note for the layman summary when provided", async () => {
    const { laymans } = await generateSummaries(
      "fix(billing): proration edge case",
      "Recomputes the invoice total.",
      "Stops double-charging annual upgrades.",
    );
    expect(laymans).toBe("Stops double-charging annual upgrades.");
  });

  it("falls back to the subject for the technical summary when body is empty", async () => {
    const { technical } = await generateSummaries("refactor: split hero", "");
    expect(technical).toBe("refactor: split hero");
  });

  it("uses safe defaults when everything is empty", async () => {
    const { laymans, technical } = await generateSummaries("", "");
    expect(laymans).toBe("Code update.");
    expect(technical).toBe("No details available.");
  });

  it("does not throw and always returns both fields", async () => {
    const result = await generateSummaries("chore: misc", "body text", "");
    expect(result).toHaveProperty("laymans");
    expect(result).toHaveProperty("technical");
    expect(typeof result.laymans).toBe("string");
    expect(typeof result.technical).toBe("string");
  });
});
