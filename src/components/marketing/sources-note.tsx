"use client";

import { ExternalLink } from "lucide-react";
import { useInView } from "./use-in-view";
import { SOURCES, sourceAnchorId } from "@/lib/sources";

/**
 * Numbered source disclosure for every market stat cited across the
 * homepage. Inline `<Cite n={N} />` references throughout the page
 * anchor-link to entries here via `id={sourceAnchorId(N)}`.
 *
 * Source list is owned by `src/lib/sources.ts` — never duplicate it here.
 */

export default function SourcesNote() {
  const { ref, isVisible } = useInView(0.05);

  return (
    <section
      ref={ref}
      id="sources"
      aria-label="Sources for the market data cited on this page"
      className="relative border-t"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--color-light)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-10 sm:py-14">
        <div
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="flex items-baseline justify-between mb-5">
            <p
              className="text-[11px] font-semibold uppercase"
              style={{
                color: "var(--color-dark)",
                letterSpacing: "var(--tracking-wide)",
                fontFamily: "var(--font-heading)",
              }}
            >
              Sources
            </p>
            <p
              className="text-[10px]"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.04em",
              }}
            >
              n = {SOURCES.length} · upstream publishers · click any¹ inline above
            </p>
          </div>

          <p
            className="text-sm mb-6 max-w-3xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Every market stat cited on this page is sourced from a third-party
            publisher. The superscript number next to each claim links here.
            Links are included where the publisher has a stable public page.
            Most industry reports are paid or members-only, so for those we
            cite by publisher and date.
          </p>

          <div
            className="border"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {SOURCES.map((s, i) => (
              <div
                key={s.id}
                id={sourceAnchorId(s.id)}
                className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-x-6 gap-y-1 px-4 sm:px-6 py-4 scroll-mt-24"
                style={{
                  borderBottom:
                    i < SOURCES.length - 1
                      ? "1px solid var(--border-subtle)"
                      : undefined,
                  background:
                    i % 2 === 0 ? "var(--color-light)" : "var(--color-light-gray)",
                }}
              >
                <div className="flex items-start gap-3 md:block md:pt-0.5">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: "var(--color-dark)",
                      color: "var(--color-light)",
                      fontFamily: "var(--font-heading)",
                      fontFeatureSettings: '"tnum" 1',
                    }}
                    aria-label={`Source ${s.id}`}
                  >
                    {s.id}
                  </span>
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase mb-1"
                    style={{
                      color: "var(--text-tertiary)",
                      letterSpacing: "var(--tracking-wide)",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    Publisher
                  </p>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold inline-flex items-center gap-1.5 underline decoration-1 underline-offset-2 hover:opacity-80"
                      style={{ color: "var(--color-dark)" }}
                    >
                      {s.ref}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ) : (
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-dark)" }}
                    >
                      {s.ref}
                    </p>
                  )}
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.title}
                  </p>
                </div>
                <div className="md:pt-0.5">
                  <p
                    className="text-[10px] uppercase mb-1"
                    style={{
                      color: "var(--text-tertiary)",
                      letterSpacing: "var(--tracking-wide)",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    Backs
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.backs}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p
            className="text-[11px] mt-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Spotted a stat that looks off? Email{" "}
            <a
              href="mailto:blake@storageads.com"
              className="underline decoration-1 underline-offset-2"
              style={{ color: "var(--color-dark)" }}
            >
              blake@storageads.com
            </a>
            . We&apos;d rather get a correction than ship a wrong number.
          </p>
        </div>
      </div>
    </section>
  );
}
