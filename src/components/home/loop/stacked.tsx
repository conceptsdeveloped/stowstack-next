"use client";

import { Reveal } from "@/components/motion/reveal";
import { LOOP_STAGES, microLabel } from "./data";
import AdCard from "./ad-card";
import { StaticPageWithAd, ReservePanel } from "./page-frame";
import LedgerFinale from "./ledger-finale";

/**
 * The four loop stages as stacked panels — below lg, and on every
 * viewport under prefers-reduced-motion. Same artifacts, same copy,
 * no pinning.
 */
export default function LoopStacked({ forceVisible }: { forceVisible?: boolean }) {
  const visuals = [
    <AdCard key="ad" style={{ maxWidth: 340, margin: "0 auto" }} />,
    <StaticPageWithAd key="page" />,
    <ReservePanel key="reserve" active style={{ maxWidth: 420, margin: "0 auto" }} />,
    <LedgerFinale key="finale" />,
  ];

  return (
    <div className={forceVisible ? "block" : "lg:hidden"}>
      <div className="flex flex-col">
        {LOOP_STAGES.map((s, i) => (
          <Reveal key={s.title}>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-7 items-center py-10"
              style={{
                borderBottom:
                  i < LOOP_STAGES.length - 1 ? "1px solid var(--line-dim)" : undefined,
              }}
            >
              <div>
                <p style={{ ...microLabel, color: "var(--accent)", marginBottom: 8 }}>
                  Step {String(i + 1).padStart(2, "0")} · {s.pipeline} · {s.pipelineSub}
                </p>
                <h3 style={{ fontSize: "var(--type-h3)", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 480 }}>
                  {s.body}
                </p>
              </div>
              <div className="min-w-0">{visuals[i]}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
