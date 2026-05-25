import { readFileSync, readdirSync } from "fs";
import path from "path";

const RESEARCH_DIR = path.resolve(process.cwd(), "StorageAds-Market-Research");

let _cachedSummary: string | null = null;
let _cachedDocs: Map<string, string> | null = null;

/** Load executive summary — cached for function lifetime */
function getExecutiveSummary(): string {
  if (_cachedSummary) return _cachedSummary;
  try {
    _cachedSummary = readFileSync(
      path.join(RESEARCH_DIR, "EXECUTIVE_SUMMARY.md"),
      "utf-8",
    );
    return _cachedSummary;
  } catch {
    return "";
  }
}

/** Load all research docs into memory — cached */
function getAllDocs(): Map<string, string> {
  if (_cachedDocs) return _cachedDocs;
  _cachedDocs = new Map();

  try {
    const subdirs = readdirSync(RESEARCH_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subdir of subdirs) {
      const dirPath = path.join(RESEARCH_DIR, subdir);
      const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const content = readFileSync(path.join(dirPath, file), "utf-8");
        _cachedDocs!.set(`${subdir}/${file}`, content);
      }
    }
  } catch {
    // Research directory may not exist
  }

  return _cachedDocs;
}

/**
 * Get market intelligence context for ad copy generation.
 * Includes: competitive positioning, pricing psychology, customer pain points,
 * and channel-specific intelligence.
 */
export function getMarketContextForCopy(platform?: string): string {
  const summary = getExecutiveSummary();
  const docs = getAllDocs();

  const lines: string[] = [
    "--- MARKET INTELLIGENCE (use this to write smarter, more specific ads) ---",
  ];

  // Always include key competitive positioning from exec summary
  const competitiveSection = summary.slice(0, 800);
  if (competitiveSection) lines.push(competitiveSection);

  // Customer pain points — what operators' customers actually care about
  const painPoints = docs.get("03-Customer-Intel/operator-pain-points.md");
  if (painPoints) lines.push(painPoints.slice(0, 600));

  // Ideal customer profile
  const icp = docs.get("03-Customer-Intel/ideal-customer-profile.md");
  if (icp) lines.push(icp.slice(0, 400));

  // Platform-specific channel intelligence
  if (platform === "meta" || platform === "meta_feed" || platform === "meta_story") {
    const metaIntel = docs.get("05-Channels/meta-ads-landscape.md");
    if (metaIntel) lines.push(metaIntel.slice(0, 500));
  } else if (platform === "google_search" || platform === "google_display") {
    const googleIntel = docs.get("05-Channels/google-ads-landscape.md");
    if (googleIntel) lines.push(googleIntel.slice(0, 500));
  }

  // Pricing psychology
  const pricing = docs.get("02-Pricing/pricing-positioning.md");
  if (pricing) lines.push(pricing.slice(0, 400));

  return lines.join("\n\n");
}

/**
 * Get market intelligence for marketing plan generation.
 * More comprehensive — includes strategy, GTM, competitive moat.
 */
export function getMarketContextForStrategy(): string {
  const summary = getExecutiveSummary();
  const docs = getAllDocs();

  const lines: string[] = [
    "--- MARKET INTELLIGENCE (comprehensive — use for strategic planning) ---",
  ];

  if (summary) lines.push(summary.slice(0, 1500));

  const gtm = docs.get("06-Strategy/gtm-recommendations.md");
  if (gtm) lines.push(gtm.slice(0, 800));

  const moat = docs.get("06-Strategy/competitive-moat.md");
  if (moat) lines.push(moat.slice(0, 600));

  const trends = docs.get("04-Industry/industry-trends.md");
  if (trends) lines.push(trends.slice(0, 600));

  return lines.join("\n\n");
}

/**
 * Get competitive intelligence for ad differentiation.
 * Helps generate ads that position against aggregators and competitors.
 */
export function getCompetitiveContext(): string {
  const docs = getAllDocs();

  const lines: string[] = [
    "--- COMPETITIVE INTELLIGENCE (use to differentiate from competitors) ---",
  ];

  const deepDives = docs.get("01-Landscape/top-10-deep-dives.md");
  if (deepDives) lines.push(deepDives.slice(0, 800));

  const aggregators = docs.get("04-Industry/aggregator-assessment.md");
  if (aggregators) lines.push(aggregators.slice(0, 500));

  return lines.join("\n\n");
}
