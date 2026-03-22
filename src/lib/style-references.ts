import { db } from "@/lib/db";

interface StyleAnalysis {
  style_directive?: string;
  [key: string]: unknown;
}

/**
 * Fetch active style reference directives for prompt injection.
 * Global — all active references apply to all generation across all facilities.
 * Max 5 most recent, formatted for prompt injection.
 */
export async function getStyleDirectives(
  _facilityId?: string,
): Promise<string> {
  try {
    const refs = await db.style_references.findMany({
      where: { active: true },
      select: { analysis: true },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    if (refs.length === 0) return "";

    const directives = refs
      .map((r) => (r.analysis as StyleAnalysis).style_directive)
      .filter(Boolean);

    if (directives.length === 0) return "";

    return `\nSTYLE REFERENCES (from curated reference images — incorporate these visual qualities):\n${directives.map((d, i) => `${i + 1}. ${d}`).join("\n")}`;
  } catch {
    return "";
  }
}
