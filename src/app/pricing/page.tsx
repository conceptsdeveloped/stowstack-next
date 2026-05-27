import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Minus } from "lucide-react";
import PricingCalculator from "@/components/marketing/pricing-calculator";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Founding facility pricing for StorageAds. One bill per facility per month. Ads, landing pages, site, and the dashboard. From $299/mo + $1,000 ad spend.",
  openGraph: {
    title: "Pricing — StorageAds",
    description:
      "Founding facility pricing for StorageAds. One bill per facility per month. From $299/mo + $1,000 ad spend.",
    url: "https://storageads.com/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — StorageAds",
    description:
      "Founding facility pricing for StorageAds. One bill per facility per month. From $299/mo + $1,000 ad spend.",
  },
};

type Tier = {
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  bestFor: string;
  isRecommended?: boolean;
  badge?: string;
  cta: string;
};

const tiers: Tier[] = [
  {
    name: "Signal",
    price: "$299",
    priceNote: "/mo per facility",
    tagline: "The cheapest way to find out if paid ads work at your facility.",
    description: "One channel. Two landing pages. The basics, running.",
    features: [
      "Meta or Google (pick one)",
      "2 ad-specific landing pages",
      "Static creative, 4 variations / month",
      "Monthly performance report",
      "Move-in tracking dashboard",
      "Email support",
    ],
    notIncluded: [
      "Custom facility website",
      "Video creative",
      "Retargeting",
      "Tuning calls",
    ],
    bestFor:
      "Solo operators who want to test the channel before committing to the full system. Month-to-month.",
    cta: "Start with Signal",
  },
  {
    name: "System",
    price: "$749",
    priceNote: "/mo per facility",
    tagline: "The full thing. One bill. Everything connected.",
    description:
      "Meta + Google + retargeting. Custom site with the storEDGE rental flow built in. Five landing pages tuned to the campaign. Bi-weekly calls to read the numbers and turn the dials.",
    features: [
      "Meta + Google + retargeting (all three)",
      "Custom facility website with storEDGE embed",
      "5 ad-specific landing pages",
      "Video + static creative",
      "A/B testing on ads and pages",
      "Bi-weekly tuning calls",
      "Weekly dashboard with channel breakdown",
      "Slack + email support",
    ],
    bestFor:
      "Independent operators with one to four facilities who want the full system without hiring an agency.",
    isRecommended: true,
    badge: "Most operators pick this",
    cta: "Start with System",
  },
  {
    name: "Compound",
    price: "$1,249",
    priceNote: "/mo per facility",
    tagline: "For facilities where every move-in is worth $2,400 or more.",
    description:
      "Everything in System, plus a named strategist running the account. Audience sync, churn predictions, Google Business Profile, priority creative. The full machine.",
    features: [
      "Everything in System",
      "Dedicated strategist (named contact)",
      "10 ad-specific landing pages",
      "Priority creative queue, 4 videos / month",
      "Audience sync (Meta + Google)",
      "Churn prediction from your FMS uploads",
      "Google Business Profile management",
      "Weekly tuning calls",
      "Quarterly business review",
      "Phone support",
    ],
    bestFor:
      "Climate-controlled, urban, or high-rent facilities where one extra move-in pays for the tier in a single month.",
    cta: "Start with Compound",
  },
];

const competitors = [
  {
    name: "SpareFoot",
    type: "Lead aggregator",
    cost: "2× first month's rent, per move-in",
    math: "On a $150/mo unit, $300 every time someone moves in — forever. At 10 move-ins/mo that's $36,000/yr in commissions, paid before your second month's rent shows up.",
    gotcha:
      "Those aren't your tenants. They're SpareFoot's. They get the email, the brand impression, and the relationship. You get the rental on day one and nothing else.",
  },
  {
    name: "Adverank",
    type: "Google Ads automation",
    cost: "$199–499 / mo per facility",
    math: "One channel: Google search. No Meta. No retargeting. No landing pages. No video. No website. No human to call when something's off.",
    gotcha:
      "The price tag is the pitch. The product is a third of one channel running on autopilot.",
  },
  {
    name: "G5 / full-service agencies",
    type: "Outsourced marketing retainer",
    cost: "$1,500–4,500 / mo + 15–20% markup on ad spend",
    math: "On $2,000/mo ad spend at 18% markup, $360/mo siphoned to overhead. That's $4,320 a year you paid to no one, for nothing.",
    gotcha:
      "The ad accounts, campaigns, landing pages, and creative are in their names, not yours. When the contract ends, you start from zero.",
  },
  {
    name: "Doing it yourself",
    type: "You + your phone",
    cost: "8–15 hours / week of your time",
    math: "If your time is worth $75/hr, that's $2,400–4,500/mo in opportunity cost — before any ad spend. And the campaigns are almost certainly underperforming what a team running 50 facilities can do.",
    gotcha:
      "Every lease-up day you didn't catch — because you were boosting a Facebook post instead of running the gate.",
  },
];

const comparisonRows: { label: string; values: [string, string, string, string, string] }[] = [
  {
    label: "Meta ads (Facebook + Instagram)",
    values: ["✓", "—", "—", "✓", "DIY"],
  },
  {
    label: "Google ads",
    values: ["✓", "—", "✓", "✓", "DIY"],
  },
  {
    label: "Retargeting",
    values: ["✓", "—", "—", "✓", "—"],
  },
  {
    label: "Video creative",
    values: ["✓", "—", "—", "Add-on", "DIY"],
  },
  {
    label: "Custom facility website",
    values: ["✓", "—", "—", "✓", "DIY"],
  },
  {
    label: "storEDGE rental flow embedded",
    values: ["✓", "—", "—", "—", "—"],
  },
  {
    label: "5+ ad-specific landing pages",
    values: ["✓", "—", "—", "✓", "—"],
  },
  {
    label: "Move-in dashboard",
    values: ["✓", "—", "Partial", "Partial", "—"],
  },
  {
    label: "Markup on ad spend",
    values: ["None", "2× first rent", "None", "15–20%", "None"],
  },
  {
    label: "You own the leads & assets",
    values: ["✓", "✗", "✓", "✗", "✓"],
  },
  {
    label: "Contract length",
    values: ["Month-to-month", "Pay-per-lead", "Annual", "12–24 mo", "—"],
  },
  {
    label: "All-in / mo (1 facility)",
    values: ["$1,749", "$3,000 at 10 moves", "$199–499", "$3,000+", "$0 + 30–60 hrs"],
  },
];

const enterpriseFeatures = [
  "Everything in Compound, run across the portfolio",
  "White-label option — runs under your brand",
  "Cross-facility budget allocation",
  "Multi-tenant admin dashboard",
  "API access for PMS, BI, custom integrations",
  "Dedicated team: strategist + ops + creative lead",
  "Portfolio-level reporting and quarterly executive review",
  "Volume pricing: $599/facility at 10–24, $499 at 25–49, $449 at 50+",
];

const notInTheBill = [
  {
    item: "Ad spend",
    detail:
      "Paid directly to Meta and Google. $1,000/mo minimum per facility. We don't mark it up. You see what you spent.",
  },
  {
    item: "Phone tracking",
    detail:
      "Twilio call tracking is built in. Numbers billed at cost (a few dollars per month per facility).",
  },
  {
    item: "Stock photos and AI images",
    detail:
      "We don't use either. Real photos from your facility, or we shoot what we need.",
  },
];

const faqs = [
  {
    q: "Why is there a minimum ad spend?",
    a: "Because below $1,000/mo, paid ads can't gather enough data to tune. You'd pay us to run a campaign that can't optimize. The floor isn't a margin grab — it's the line below which the channel doesn't work.",
  },
  {
    q: "Do I have to commit?",
    a: "Signal and Compound are month-to-month. System is six months because the site build is included — if you leave before then, we keep the site fee. After month six, you're month-to-month like everyone else.",
  },
  {
    q: "What if it doesn't work?",
    a: "If your move-in count hasn't moved in the right direction by the end of month three, month four is on us. No invoice. No fine print. We eat it.",
  },
  {
    q: "Will the price stay this low?",
    a: "Not forever. These are founding facility prices and they roughly double once we're out of alpha. If you sign in alpha, your price is locked for twelve months.",
  },
  {
    q: "What about management companies?",
    a: "There's a separate tier for portfolios of ten or more facilities, with white-label options and a dedicated team. Email blake@storageads.com or book a call below.",
  },
  {
    q: "Can I just buy the website?",
    a: "No. The site exists because it's part of the system — the ads send traffic to it, the rental flow lives on it, and the dashboard reads from it. Selling it alone would defeat the point.",
  },
];

export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-light)", color: "var(--color-dark)" }}
    >
      <header
        className="sticky top-0 z-[100] border-b"
        style={{
          background: "var(--color-light)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Back to home"
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
            <span style={{ color: "var(--brand-gold)" }}>ads</span>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-12 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 uppercase"
          style={{
            background: "var(--color-light-gray)",
            color: "var(--color-dark)",
            border: "1px solid var(--border-subtle)",
            letterSpacing: "var(--tracking-wide)",
          }}
        >
          Founding facility pricing
        </div>
        <h1
          className="font-semibold mb-6"
          style={{
            fontSize: "var(--text-section-head)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          One bill per facility. One number to read.
        </h1>
        <p
          className="mx-auto mb-4"
          style={{
            maxWidth: "640px",
            color: "var(--color-dark)",
            fontSize: "var(--text-body)",
            lineHeight: "var(--leading-normal)",
            fontWeight: 500,
          }}
        >
          Half the price of an agency. Everything the cheap tools leave out.
          The whole system, in one bill.
        </p>
        <p
          className="mx-auto"
          style={{
            maxWidth: "620px",
            color: "var(--text-secondary)",
            fontSize: "var(--text-body)",
            lineHeight: "var(--leading-normal)",
          }}
        >
          A move-in is worth about $1,800 over a year. The system costs less
          than two of those a month. Everything past that goes in your pocket.
        </p>
      </section>

      {/* Founding facility frame */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div
          className="rounded-xl p-6 grid gap-6 md:grid-cols-3 text-sm"
          style={{
            background: "var(--color-light-gray)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <p
              className="text-xs uppercase mb-2 font-semibold"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Locked for 12 months
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Sign in alpha, your price is locked for a year — even when we
              double the list price.
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase mb-2 font-semibold"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Month-three guarantee
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              If your move-in count hasn&apos;t moved by month three, month four
              is on us. No invoice. No fine print.
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase mb-2 font-semibold"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Direct line
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              You work with Blake and the team. No account-management layer
              between you and the people doing the work.
            </p>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl p-6 flex flex-col relative"
                style={{
                  background: tier.isRecommended
                    ? "var(--color-dark)"
                    : "var(--color-light)",
                  color: tier.isRecommended
                    ? "var(--color-light)"
                    : "var(--color-dark)",
                  border: tier.isRecommended
                    ? "1px solid var(--color-dark)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                {tier.badge && (
                  <span
                    className="absolute -top-3 left-6 text-xs font-semibold uppercase px-3 py-1 rounded-full"
                    style={{
                      background: "var(--color-light)",
                      color: "var(--color-dark)",
                      letterSpacing: "var(--tracking-wide)",
                      border: "1px solid var(--color-dark)",
                    }}
                  >
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                <p
                  className="text-sm mb-4"
                  style={{
                    color: tier.isRecommended
                      ? "rgba(250,249,245,0.7)"
                      : "var(--text-secondary)",
                  }}
                >
                  {tier.tagline}
                </p>
                <div className="mb-1">
                  <span
                    className="text-3xl font-semibold"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {tier.price}
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{
                      color: tier.isRecommended
                        ? "rgba(250,249,245,0.6)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {tier.priceNote}
                  </span>
                </div>
                <p
                  className="text-xs mb-5"
                  style={{
                    color: tier.isRecommended
                      ? "rgba(250,249,245,0.6)"
                      : "var(--text-tertiary)",
                  }}
                >
                  + $1,000/mo ad spend minimum
                </p>

                <p
                  className="text-sm mb-5"
                  style={{
                    color: tier.isRecommended
                      ? "rgba(250,249,245,0.85)"
                      : "var(--text-secondary)",
                    lineHeight: "var(--leading-normal)",
                  }}
                >
                  {tier.description}
                </p>

                <ul className="space-y-2.5 mb-5 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2 text-sm"
                      style={{
                        color: tier.isRecommended
                          ? "rgba(250,249,245,0.9)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <Check
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          color: tier.isRecommended
                            ? "var(--color-light)"
                            : "var(--color-dark)",
                        }}
                      />
                      {feature}
                    </li>
                  ))}
                  {tier.notIncluded?.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2 text-sm"
                      style={{
                        color: tier.isRecommended
                          ? "rgba(250,249,245,0.5)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      <Minus
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          color: tier.isRecommended
                            ? "rgba(250,249,245,0.5)"
                            : "var(--text-tertiary)",
                        }}
                      />
                      <span style={{ textDecoration: "line-through" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <p
                  className="text-xs pt-4 mb-5 border-t"
                  style={{
                    color: tier.isRecommended
                      ? "rgba(250,249,245,0.7)"
                      : "var(--text-secondary)",
                    borderColor: tier.isRecommended
                      ? "rgba(250,249,245,0.2)"
                      : "var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      color: tier.isRecommended
                        ? "rgba(250,249,245,0.5)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    Best for:{" "}
                  </span>
                  {tier.bestFor}
                </p>

                <Link
                  href="#cta"
                  className="text-center text-sm font-medium rounded-md py-3 px-4 transition-colors"
                  style={{
                    background: tier.isRecommended
                      ? "var(--color-light)"
                      : "var(--color-dark)",
                    color: tier.isRecommended
                      ? "var(--color-dark)"
                      : "var(--color-light)",
                  }}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p
            className="text-xs text-center mt-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            All prices per facility per month. Ad spend ($1,000/mo minimum)
            paid directly to Meta and Google — not marked up.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <PricingCalculator />

      {/* Competition. Named. */}
      <section className="py-20" style={{ background: "var(--color-light)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p
              className="text-xs uppercase mb-3 font-semibold"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              The competition. Named.
            </p>
            <h2
              className="font-semibold mb-4"
              style={{
                fontSize: "var(--text-section-head)",
                lineHeight: "var(--leading-tight)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              Half the price of the agency. Everything the cheap tools leave out.
            </h2>
            <p
              className="mx-auto"
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-body)",
                maxWidth: "620px",
              }}
            >
              Most independent operators are already paying for one of these.
              Sometimes two. Here&apos;s what each one actually sells — and
              what it leaves out.
            </p>
          </div>

          <div className="space-y-4">
            {competitors.map((c) => (
              <div
                key={c.name}
                className="rounded-xl p-6 md:p-8 grid gap-6 md:grid-cols-[200px_1fr]"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <div>
                  <h3
                    className="font-semibold mb-1"
                    style={{ color: "var(--color-dark)", fontSize: "1.125rem" }}
                  >
                    {c.name}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {c.type}
                  </p>
                  <p
                    className="text-sm font-semibold mt-3"
                    style={{
                      color: "var(--color-dark)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.cost}
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <p style={{ color: "var(--text-secondary)", lineHeight: "var(--leading-normal)" }}>
                    <span style={{ color: "var(--color-dark)", fontWeight: 600 }}>
                      The math:
                    </span>{" "}
                    {c.math}
                  </p>
                  <p style={{ color: "var(--text-secondary)", lineHeight: "var(--leading-normal)" }}>
                    <span style={{ color: "var(--color-dark)", fontWeight: 600 }}>
                      What they don&apos;t tell you:
                    </span>{" "}
                    {c.gotcha}
                  </p>
                </div>
              </div>
            ))}

            <div
              className="rounded-xl p-6 md:p-8 grid gap-6 md:grid-cols-[200px_1fr]"
              style={{
                background: "var(--color-dark)",
                color: "var(--color-light)",
              }}
            >
              <div>
                <h3
                  className="font-semibold mb-1"
                  style={{ fontSize: "1.125rem" }}
                >
                  StorageAds
                </h3>
                <p className="text-xs" style={{ opacity: 0.6 }}>
                  Every column above, in one bill
                </p>
                <p
                  className="text-sm font-semibold mt-3"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  $749/mo + $1,000 ad spend
                </p>
              </div>
              <div className="space-y-3 text-sm" style={{ opacity: 0.9 }}>
                <p style={{ lineHeight: "var(--leading-normal)" }}>
                  <span style={{ fontWeight: 600 }}>The math:</span> Meta + Google + retargeting + custom site + 5 landing pages + video + the dashboard. At 10 move-ins/mo on a $150 unit, your effective cost is{" "}
                  <strong>$175 per move-in</strong> — and you keep every month&apos;s rent, including the first.
                </p>
                <p style={{ lineHeight: "var(--leading-normal)" }}>
                  <span style={{ fontWeight: 600 }}>What we&apos;ll tell you:</span> Your ad accounts are in your name. The site is yours. The creative is yours. When the contract ends, you keep the keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16" style={{ background: "var(--color-light)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="font-semibold mb-3 text-center"
            style={{
              fontSize: "var(--text-subhead)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            Side by side.
          </h2>
          <p
            className="mb-10 text-center mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              maxWidth: "520px",
            }}
          >
            Same checklist, six options. Scroll the table if you&apos;re on
            your phone — it&apos;s a lot of columns because we do a lot of
            things.
          </p>

          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            <table className="w-full text-sm" style={{ minWidth: "1040px" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--color-light-gray)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <th
                    className="text-left p-4 font-semibold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    What you get
                  </th>
                  <th
                    className="p-4 font-semibold"
                    style={{
                      background: "var(--color-dark)",
                      color: "var(--color-light)",
                    }}
                  >
                    StorageAds
                  </th>
                  <th
                    className="p-4 font-semibold text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    SpareFoot
                  </th>
                  <th
                    className="p-4 font-semibold text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Adverank
                  </th>
                  <th
                    className="p-4 font-semibold text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    G5 / agency
                  </th>
                  <th
                    className="p-4 font-semibold text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    DIY
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom:
                        i === comparisonRows.length - 1
                          ? "none"
                          : "1px solid var(--border-subtle)",
                    }}
                  >
                    <td
                      className="p-4 font-medium"
                      style={{ color: "var(--color-dark)" }}
                    >
                      {row.label}
                    </td>
                    <td
                      className="p-4 text-center"
                      style={{
                        background: "rgba(20,20,19,0.04)",
                        color: "var(--color-dark)",
                        fontWeight: 600,
                      }}
                    >
                      {row.values[0]}
                    </td>
                    {row.values.slice(1).map((v, j) => (
                      <td
                        key={j}
                        className="p-4 text-center"
                        style={{
                          color:
                            v === "—" || v === "✗"
                              ? "var(--text-tertiary)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p
            className="text-xs text-center mt-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Competitor pricing reflects typical published rates for
            independent operators. Your mileage may vary — call them and ask.
          </p>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-20" style={{ background: "var(--color-light)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <div
            className="rounded-2xl p-8 md:p-12"
            style={{
              background: "var(--color-light-gray)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-xs uppercase mb-3 font-semibold"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Enterprise · 10+ facilities
            </p>
            <h2
              className="font-semibold mb-4"
              style={{
                fontSize: "var(--text-subhead)",
                lineHeight: "var(--leading-snug)",
              }}
            >
              Managing a portfolio? You need a different conversation.
            </h2>
            <p
              className="mb-8"
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-body)",
                maxWidth: "640px",
              }}
            >
              Management companies don&apos;t want three SKUs and a credit card
              form. They want one team, one login, one bill, and the option to
              run it under their own brand. That&apos;s Enterprise.
            </p>
            <ul className="grid gap-3 md:grid-cols-2 mb-8">
              {enterpriseFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Check
                    size={16}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: "var(--color-dark)" }}
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="#cta"
              className="btn-primary inline-flex items-center justify-center"
            >
              Talk to us about the portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* What's not in the bill */}
      <section className="py-20" style={{ background: "var(--color-light)" }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="font-semibold mb-4 text-center"
            style={{
              fontSize: "var(--text-subhead)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            What&apos;s not in the bill.
          </h2>
          <p
            className="mb-10 text-center mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              maxWidth: "560px",
            }}
          >
            Three things sit outside the monthly number. We separate them so
            you see exactly what goes where.
          </p>
          <div className="space-y-4">
            {notInTheBill.map((item) => (
              <div
                key={item.item}
                className="rounded-xl p-5"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <h3
                  className="font-semibold mb-1"
                  style={{ color: "var(--color-dark)" }}
                >
                  {item.item}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: "var(--leading-normal)",
                  }}
                >
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20" style={{ background: "var(--color-light)" }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="font-semibold mb-10 text-center"
            style={{
              fontSize: "var(--text-subhead)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            Questions operators actually ask.
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-6"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <h3
                  className="font-semibold mb-2"
                  style={{ color: "var(--color-dark)" }}
                >
                  {faq.q}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: "var(--leading-normal)",
                  }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className="py-24"
        style={{ background: "var(--color-light)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="font-semibold mb-4"
            style={{
              fontSize: "var(--text-subhead)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            Let&apos;s talk about your facility.
          </h2>
          <p
            className="mb-8 mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              maxWidth: "520px",
            }}
          >
            Book 30 minutes. We&apos;ll pull up your facility, run the audit
            tool live, and tell you what we&apos;d do if it were ours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={process.env.NEXT_PUBLIC_CALCOM_LINK || "https://cal.com/storageads/30min"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block text-center"
            >
              Book a call
            </a>
            <Link
              href="/audit-tool"
              className="inline-block text-center px-6 py-3 rounded-md text-sm font-medium"
              style={{
                border: "1px solid var(--color-dark)",
                color: "var(--color-dark)",
              }}
            >
              Run the free audit first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
