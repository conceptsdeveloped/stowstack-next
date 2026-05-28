"use client";

import { getSource, sourceAnchorId } from "@/lib/sources";

/**
 * Inline footnote marker. Renders a tiny superscript number that links to
 * the matching entry in the SourcesNote block at the bottom of the page.
 *
 * Usage:
 *   <p>REITs run 92.6% occupancy<Cite n={1} />.</p>
 *
 * The link uses a plain in-page anchor so it works without JavaScript —
 * a browser hash jump scrolls the operator straight to the source row.
 * Hover shows the publisher name as a native tooltip.
 *
 * If multiple sources back the same claim, pass an array of ids:
 *   <Cite n={[1, 2]} />     →    1, 2
 */

type CiteProps = {
  n: number | number[];
  /** Optional class hook for surfaces that need to tune color/spacing. */
  className?: string;
};

export default function Cite({ n, className }: CiteProps) {
  const ids = Array.isArray(n) ? n : [n];
  return (
    <sup
      className={className}
      style={{
        fontSize: "0.7em",
        lineHeight: 1,
        marginLeft: "0.15em",
        fontFamily: "var(--font-heading)",
        fontFeatureSettings: '"tnum" 1',
        letterSpacing: "0.02em",
      }}
    >
      {ids.map((id, i) => {
        const src = getSource(id);
        const title = src ? `${src.ref}` : `Source ${id}`;
        return (
          <span key={id}>
            {i > 0 && <span style={{ opacity: 0.5 }}>,&thinsp;</span>}
            <a
              href={`#${sourceAnchorId(id)}`}
              title={title}
              aria-label={`Footnote ${id}: ${title}`}
              style={{
                color: "currentColor",
                opacity: 0.55,
                textDecoration: "none",
                borderBottom: "1px dotted currentColor",
                paddingBottom: "1px",
                transition: "opacity 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.55";
              }}
            >
              {id}
            </a>
          </span>
        );
      })}
    </sup>
  );
}
