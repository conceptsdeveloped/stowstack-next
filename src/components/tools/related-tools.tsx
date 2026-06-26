import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Compact cross-links between the operator tools. Rendered near the foot of
 * each calculator so a visitor (and a crawler) can reach the rest of the suite
 * — internal linking the SEO pages need, and a UX off-ramp instead of a dead
 * end. Pass the current tool's href to exclude it.
 */

type RelatedTool = { href: string; label: string; blurb: string };

const ALL_TOOLS: RelatedTool[] = [
  {
    href: "/tools/noi-calculator",
    label: "NOI Calculator",
    blurb: "Triangulate net operating income from income and storage expenses.",
  },
  {
    href: "/tools/rate-increase-calculator",
    label: "Rate Increase (ECRI) Impact",
    blurb: "Net revenue from a rate increase after move-outs.",
  },
  {
    href: "/tools/break-even-occupancy",
    label: "Break-Even Occupancy",
    blurb: "The occupancy you need to cover costs and debt.",
  },
  {
    href: "/tools/valuation-calculator",
    label: "Valuation & Cap Rate",
    blurb: "Value, cap rate, or NOI from the other two.",
  },
  {
    href: "/calculator",
    label: "Marketing ROI Calculator",
    blurb: "Move-ins and return on ad spend from your budget.",
  },
  {
    href: "/audit-tool",
    label: "Free Facility Audit",
    blurb: "A marketing diagnostic for your facility in minutes.",
  },
];

export default function RelatedTools({
  currentHref,
  limit = 3,
}: {
  currentHref: string;
  limit?: number;
}) {
  const related = ALL_TOOLS.filter((t) => t.href !== currentHref).slice(0, limit);

  return (
    <div className="mt-16 print:hidden">
      <div className="flex items-baseline justify-between mb-5">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-mid-gray)" }}
        >
          More operator tools
        </h2>
        <Link
          href="/tools"
          className="text-sm font-medium inline-flex items-center gap-1"
          style={{ color: "var(--color-dark)" }}
        >
          All tools
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {related.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-xl p-5 flex flex-col transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--color-light)",
              border: "1px solid var(--color-light-gray)",
            }}
          >
            <h3
              className="text-base font-semibold mb-1.5"
              style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
            >
              {t.label}
            </h3>
            <p
              className="text-sm leading-relaxed flex-1"
              style={{ color: "var(--color-body-text)" }}
            >
              {t.blurb}
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-medium mt-4"
              style={{ color: "var(--color-dark)" }}
            >
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
