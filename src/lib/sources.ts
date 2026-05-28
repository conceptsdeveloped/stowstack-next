/**
 * Single source of truth for every market-data citation referenced on the
 * marketing site. Numbered so inline footnote markers (`<Cite n={2} />`)
 * and the homepage SourcesNote block stay in lockstep.
 *
 * Adding a source: append to the array. Never re-order, never insert in the
 * middle — that would silently shift every existing inline reference.
 *
 * URLs: we only include URLs that are public, stable, and verifiable. Most
 * industry reports are paid or members-only — we cite by publisher and date
 * and let the operator verify. Better to under-promise than to fabricate.
 */

export type Source = {
  /** 1-indexed. Stable. Don't renumber. */
  id: number;
  /** Publisher name + publication date as it appears in a citation. */
  ref: string;
  /** What the source actually contains. */
  title: string;
  /** What homepage stats this source backs, in plain English. */
  backs: string;
  /** Optional stable public URL. Omit if paid / members-only / no canonical page. */
  url?: string;
};

export const SOURCES: Source[] = [
  {
    id: 1,
    ref: "Extra Space Storage, Q4 2025 earnings release",
    title: "Institutional same-store occupancy benchmark.",
    backs: "REIT same-store occupancy at 92.6%.",
    url: "https://ir.extraspace.com/news-events/press-releases",
  },
  {
    id: 2,
    ref: "TractIQ Self-Storage Market Report, September 2025",
    title: "Independent operator occupancy panel, n = 70,000+ properties.",
    backs: "Independent average occupancy at 87.2%. The 5+ point gap. National average at 82.2%.",
  },
  {
    id: 3,
    ref: "Yardi Matrix National Self-Storage Report, January 2026",
    title: "National asking rate, street rate, and web rate benchmarks.",
    backs: "$16.27/sq ft asking rate. $133 street, $119 web. Per-unit rate used to model the $72,000/yr revenue gap and $1.3M asset-value impact at a 5.5% cap.",
  },
  {
    id: 4,
    ref: "Inland Research, 2025",
    title: "U.S. self-storage real-estate value and NOI growth history.",
    backs: "Asset class size ($432B). NOI growth vs. inflation since 2008 (+4.4% / yr, 190 bps over inflation).",
  },
  {
    id: 5,
    ref: "Self Storage Association (SSA) Demand Study, 2025",
    title: "U.S. renter demand drivers, multi-select survey responses.",
    backs: "Why renters get a unit: 57% / 45% / 34% / 30% / 15% / 5%. 1-in-3 U.S. households use storage.",
    url: "https://www.selfstorage.org/research",
  },
  {
    id: 6,
    ref: "ICR REIT Market Review, 2025",
    title: "Public REIT marketing spend and digital footprint analysis.",
    backs: "Top REITs spend $250M+/yr on digital marketing. Independents are outspent ~1,000:1 on Google search. REITs handle 85% of customer interactions digitally.",
  },
  {
    id: 7,
    ref: "California Senate Bill 709, effective January 1, 2026",
    title: "Self-storage pricing disclosure and rate-increase cap legislation.",
    backs: "Caps annual existing-customer rate increases at the lower of 5% + CPI or 10%. Requires promotional rate disclosure.",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB709",
  },
  {
    id: 8,
    ref: "NYC DCWP enforcement action vs. Extra Space, 2026",
    title: "Active litigation over existing-customer rate-increase practices.",
    backs: "$5M civil penalties + $18M restitution sought. 100+ tenant complaints. The end of the bait-and-switch ECRI playbook.",
  },
  {
    id: 9,
    ref: "Cushman & Wakefield U.S. Self-Storage Report, 2025",
    title: "Cross-asset-class CRE comparison and cap-rate environment.",
    backs: "Self-storage NOI growth of +4.4%/yr vs. multifamily +3.1%, office +1.8%, retail +1.5%. CapEx at 8% of NOI vs. 13%+ for other CRE.",
  },
  {
    id: 10,
    ref: "Yardi Matrix Sun Belt Supply Pipeline, 2026",
    title: "New self-storage square footage by metro, 2026 deliveries.",
    backs: "San Antonio +656,000 sq ft in 2026. Houston +430,000. National supply growth slowing to 1.5%/yr through 2027.",
  },
];

/** Convenience: look up a source by its 1-indexed id. */
export function getSource(n: number): Source | undefined {
  return SOURCES.find((s) => s.id === n);
}

/** The anchor id used by SourcesNote entries (`#source-N`). */
export function sourceAnchorId(n: number): string {
  return `source-${n}`;
}
