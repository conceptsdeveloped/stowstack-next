import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Cross-tool handoff. A result from one calculator pre-fills another via the
   shared URL-param seeding (see @/lib/tools/share). Rendered as a small card of
   internal deep links so a visitor can carry their numbers from, say, the NOI
   calculator into Valuation, DSCR, or Break-Even without re-typing.

   Pure presentation — the caller builds each href with the destination tool's
   param keys. Server-safe (no hooks); uses next/link for client-side nav, which
   the destination still reads from window.location on mount.
   ────────────────────────────────────────────────────────────────────────── */

export interface HandoffLink {
  href: string;
  label: string;
  sub?: string;
}

export default function ToolHandoff({
  title,
  subtitle,
  links,
}: {
  title: string;
  subtitle?: string;
  links: HandoffLink[];
}) {
  if (links.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5 mt-6 print:hidden"
      style={{
        background: "var(--color-light)",
        border: "1px solid var(--color-light-gray)",
      }}
    >
      <h3
        className="text-sm font-semibold mb-1"
        style={{ color: "var(--color-dark)" }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="text-xs leading-snug mb-3"
          style={{ color: "var(--color-mid-gray)" }}
        >
          {subtitle}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors"
            style={{
              border: "1px solid var(--color-light-gray)",
              color: "var(--color-dark)",
            }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">{l.label}</span>
              {l.sub && (
                <span
                  className="block text-xs mt-0.5 truncate"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  {l.sub}
                </span>
              )}
            </span>
            <ArrowUpRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
