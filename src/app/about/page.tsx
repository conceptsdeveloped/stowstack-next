import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "About StorageAds — Built by an Operator",
  description:
    "StorageAds was built by a storage operator who got tired of guessing which ads were filling units. Every feature is tested on real facilities before it ships.",
  openGraph: {
    title: "About StorageAds — Built by an Operator",
    description: "StorageAds was built by a storage operator who got tired of guessing which ads were filling units. Every feature is tested on real facilities before it ships.",
    url: "https://storageads.com/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About StorageAds — Built by an Operator",
    description: "Built by a storage operator who got tired of guessing which ads were filling units.",
  },
};

export default function AboutPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-light)", color: "var(--color-dark)" }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-[100] border-b"
        style={{
          background: "var(--color-light)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            <span style={{ color: "var(--color-dark)" }}>storage</span>
            <span style={{ color: "var(--color-gold)" }}>ads</span>
          </span>
          <span
            className="text-sm ml-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            / About
          </span>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-2xl mx-auto px-6 pt-24 pb-32">
        <h1
          className="font-semibold mb-12"
          style={{
            fontSize: "var(--text-section-head)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Built by an operator.{" "}
          <span style={{ color: "var(--color-gold)" }}>For operators.</span>
        </h1>

        <div
          className="space-y-6"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-body-lg)",
            lineHeight: "var(--leading-normal)",
            color: "var(--text-secondary)",
          }}
        >
          <p>
            I run a storage facility. I spend my own money on ads every month.
            And for years, I had the same problem every operator has: I
            couldn&apos;t tell which ads were actually driving move-ins.
          </p>

          <p>
            My agency sent pretty dashboards. Clicks were up. Impressions looked
            great. But when I asked how many of those clicks turned into tenants,
            nobody had an answer.
          </p>

          <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            So I started building the tracking system I wished existed.
          </p>

          <p>
            Not a generic marketing platform. Not something designed for
            e-commerce and retrofitted for storage. A system built specifically
            for the way storage operators think about their business:
            move-ins, occupancy, and revenue.
          </p>

          {/* Divider */}
          <div
            className="my-12"
            style={{
              height: "1px",
              background: "var(--border-subtle)",
            }}
          />

          <p>
            I tested it across my own facilities first. Every dollar of ad
            spend, tracked to the phone call, the walk-in, the move-in. For
            the first time, I could see exactly which campaigns were making
            money and which were wasting it.
          </p>

          <p>
            The results changed how I run marketing entirely. I cut spend that
            looked good on paper but wasn&apos;t converting. I doubled down on
            what actually worked. My cost per move-in dropped. My confidence in
            every marketing dollar went up.
          </p>

          <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            That&apos;s when other operators started asking what I was doing
            differently.
          </p>

          {/* Divider */}
          <div
            className="my-12"
            style={{
              height: "1px",
              background: "var(--border-subtle)",
            }}
          />

          <p>
            StorageAds exists because operators deserve to know where their money
            is going. Not &quot;impressions&quot; and &quot;click-through
            rates&quot;: real answers. How many move-ins did my ads drive this
            month? What did each one cost? Which campaigns should I keep and
            which should I kill?
          </p>

          <p>
            I still operate. I still spend my own money on ads. Every feature we
            build gets tested on my own facilities before it reaches yours. If it
            doesn&apos;t work for me, it doesn&apos;t ship.
          </p>

          <p
            className="text-xl font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
            }}
          >
            This isn&apos;t a marketing agency. It&apos;s a demand engine built
            by someone who signs the same checks you do.
          </p>

          {/* Sign-off */}
          <div className="pt-8">
            <p
              className="font-semibold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              Blake
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              Founder, StorageAds.com
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              Storage operator &amp; founder
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-16 rounded-lg p-8 text-center"
          style={{
            background: "rgba(181,139,63,0.06)",
            border: "1px solid var(--color-gold)",
          }}
        >
          <p
            className="font-semibold mb-2"
            style={{
              fontSize: "var(--text-subhead)",
              fontFamily: "var(--font-heading)",
            }}
          >
            Want to see what this looks like for your facility?
          </p>
          <p
            className="mb-6 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Get a free diagnostic: no pitch deck, no commitment.
          </p>
          <Link href="/diagnostic" className="btn-primary inline-block">
            Get your free facility audit
          </Link>
        </div>
      </article>
    </div>
  );
}
