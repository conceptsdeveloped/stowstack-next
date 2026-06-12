import type { ReactNode } from "react";

/**
 * Stage copy for the closed-loop scene. All claim-bearing strings are
 * verbatim from the previous HowItWorks / SystemOverview sections (see
 * _redesign-notes/copy-inventory.md §3–4). The demo artifacts (Two Paws
 * campaign, $1 First Month creative, $94 cost per move-in, $130 rate,
 * the example URL) trace to the existing hero demo data and copy.
 */

export type LoopStage = {
  pipeline: string;
  pipelineSub: string;
  title: string;
  body: ReactNode;
};

export const LOOP_STAGES: LoopStage[] = [
  {
    pipeline: "Ad",
    pipelineSub: "Meta / Google",
    title: "Ads on Meta and Google.",
    body: (
      <>
        The Ad Creator builds Meta and Google campaigns from your facility
        data. The Publishing Manager puts them live. Meta reaches renters
        before they search. Google catches the ones already looking.
        Retargeting brings back the ones who left.
      </>
    ),
  },
  {
    pipeline: "Page",
    pipelineSub: "Custom LP",
    title: "Landing pages built for the ad.",
    body: (
      <>
        Each ad gets its own page. Your facility. Your rates. Your offer.
        Built around your storEDGE reserve button so the renter books on your
        branded page.
      </>
    ),
  },
  {
    pipeline: "Reserve",
    pipelineSub: "storEDGE",
    title: "The renter books on your page.",
    body: (
      <>
        Every campaign gets its own landing page with your storEDGE reserve
        flow built in. The renter books on your page, under your brand. The
        reservation lands in storEDGE the same as a walk-in. No redirects. No
        third-party directory.
      </>
    ),
  },
  {
    pipeline: "Move-in",
    pipelineSub: "Signed lease",
    title: "You see what's working.",
    body: (
      <>
        Every ad dollar tied to the unit it filled. What you spent, what you
        got, what each move-in cost. One dashboard. No mystery.
      </>
    ),
  },
];

/** Step 01 from the previous HowItWorks — runs before the loop. */
export const MARKET_STEP = {
  title: "Your market, mapped.",
  body: "We map your trade area: every competitor, their pricing, their reviews, their positioning. It updates automatically. You see the field before you spend a dollar.",
};

export const LOOP_KICKER =
  "A page for every ad. 8.7% of visitors reserve, against a 2.1% industry average on generic pages.";

/* Demo artifacts threaded through the four visuals. */
export const DEMO = {
  facility: "Two Paws Storage",
  facilityShort: "TP",
  campaign: "10×10 Climate",
  creative: "$1 First Month",
  url: "[your-facility].storageads.com/climate-pawpaw",
  rate: "$130/mo",
  costPerMoveIn: "$94",
} as const;

export const microLabel: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
};
