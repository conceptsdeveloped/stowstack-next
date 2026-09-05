/**
 * The language registry against the real database (MISSION.md RESPOND r10).
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const { languageFor, languagesFor, setLanguage, noteLanguageFromReply } = await import("@/lib/messaging/language");

const A = "+15125558001"; // learns Spanish from a reply
const B = "+15125558002"; // states Spanish on a form
const C = "+15125558003"; // operator-pinned English
const D = "+15125558004"; // never heard from
const ALL = [A, B, C, D];

const clean = () => db.$executeRaw`DELETE FROM contact_language WHERE phone = ANY(${ALL}::text[])`;
beforeAll(clean);
afterAll(async () => { await clean(); await db.$disconnect(); });

describe("defaults", () => {
  it("an unknown number is English, without a row being created", async () => {
    expect(await languageFor(D)).toBe("en");
    const rows = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM contact_language WHERE phone = ${D}`;
    expect(rows[0].n).toBe(0);
  });
  it("a junk number resolves to English rather than throwing", async () => {
    expect(await languageFor("nonsense")).toBe("en");
    expect(await languageFor(null)).toBe("en");
  });
});

describe("learning from a reply", () => {
  it("records Spanish the first time somebody writes it", async () => {
    expect(await noteLanguageFromReply(A, "Hola, cuanto cuesta?")).toBe("es");
    expect(await languageFor(A)).toBe("es");
  });

  // A STOP tells us nothing about language, and must not reset them.
  it("a later signal-free reply leaves the preference alone", async () => {
    expect(await noteLanguageFromReply(A, "STOP")).toBe("es");
    expect(await noteLanguageFromReply(A, "ok")).toBe("es");
    expect(await languageFor(A)).toBe("es");
  });

  it("is idempotent — the same reply twice leaves one row", async () => {
    await noteLanguageFromReply(A, "hola");
    const rows = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM contact_language WHERE phone = ${A}`;
    expect(rows[0].n).toBe(1);
  });
});

describe("precedence", () => {
  it("a form statement is recorded as a deliberate choice", async () => {
    expect(await setLanguage(B, "es", "form")).toBe("es");
    const rows = await db.$queryRaw<{ source: string }[]>`
      SELECT source FROM contact_language WHERE phone = ${B}`;
    expect(rows[0].source).toBe("form");
  });

  /**
   * The rule that matters. An operator who has spoken to this person and set
   * English outranks our reading of one ambiguous reply — and `setLanguage`
   * returns the language that is now STORED, so the caller replies in the right
   * one rather than in the one it guessed.
   */
  it("a guessed reply cannot overwrite what an operator set", async () => {
    await setLanguage(C, "en", "operator");
    expect(await setLanguage(C, "es", "reply")).toBe("en");
    expect(await languageFor(C)).toBe("en");
    expect(await noteLanguageFromReply(C, "hola")).toBe("en");
  });

  it("an operator can still change their own mind", async () => {
    expect(await setLanguage(C, "es", "operator")).toBe("es");
    expect(await languageFor(C)).toBe("es");
    await setLanguage(C, "en", "operator");
  });

  it("a form can overrule an earlier guess", async () => {
    expect(await setLanguage(A, "en", "form")).toBe("en");
    expect(await languageFor(A)).toBe("en");
    await setLanguage(A, "es", "form");
  });
});

describe("bulk lookup", () => {
  it("answers for a whole batch in one query, omitting unknowns", async () => {
    const map = await languagesFor(ALL);
    expect(map.get(A)).toBe("es");
    expect(map.get(B)).toBe("es");
    expect(map.get(C)).toBe("en");
    expect(map.has(D)).toBe(false); // never heard from — caller defaults it
  });
  it("handles an empty and a junk-only batch without touching the database", async () => {
    expect((await languagesFor([])).size).toBe(0);
    expect((await languagesFor([null, undefined, "junk"])).size).toBe(0);
  });
  it("de-duplicates a batch that repeats a number", async () => {
    const map = await languagesFor([A, A, A, B]);
    expect(map.size).toBe(2);
  });
});
