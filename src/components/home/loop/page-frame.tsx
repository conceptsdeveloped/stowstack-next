import type { CSSProperties, ReactNode } from "react";
import { DEMO, microLabel } from "./data";
import { DoorsIllustration } from "./ad-card";

/**
 * Stage 2 + 3 artifact: a browser frame whose hero visibly inherits the
 * ad (same campaign, same offer), with the storEDGE reserve module
 * embedded below. The pinned scene slides `contentY` to move from the
 * inherited hero to the reserve flow; the stacked fallback renders each
 * state separately.
 */

export function ReservePanel({
  active = false,
  style,
}: {
  active?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg)",
        border: `1px solid ${active ? "var(--accent)" : "var(--line-hi)"}`,
        ...style,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: "7px 10px", borderBottom: "1px solid var(--line-dim)" }}
      >
        <span style={{ ...microLabel, color: "var(--text-dim)" }}>
          Reserve a unit
        </span>
        <span style={{ ...microLabel, color: active ? "var(--accent)" : "var(--text-faint)" }}>
          storEDGE
        </span>
      </div>
      <div className="flex items-center justify-between gap-3" style={{ padding: "10px" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-accent)", lineHeight: 1.25 }}>
            {DEMO.campaign}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Climate controlled · {DEMO.rate}
          </p>
        </div>
        <span
          style={{
            ...microLabel,
            background: active ? "var(--accent)" : "var(--text)",
            color: "var(--bg)",
            padding: "7px 10px",
            whiteSpace: "nowrap",
          }}
        >
          Reserve this unit
        </span>
      </div>
      <p
        style={{
          fontSize: 10,
          color: "var(--text-faint)",
          padding: "0 10px 9px",
          lineHeight: 1.5,
        }}
      >
        The reservation lands in storEDGE the same as a walk-in.
      </p>
    </div>
  );
}

export default function PageFrame({
  children,
  contentY = 0,
  chromeOpacity = 1,
  style,
}: {
  /** The inherited ad artifact (rendered into the page hero slot). */
  children?: ReactNode;
  /** Vertical scroll of the page content, in % of content height. */
  contentY?: number;
  chromeOpacity?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-alt)",
        border: "1px solid var(--line-hi)",
        ...style,
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: "7px 10px",
          borderBottom: "1px solid var(--line)",
          opacity: chromeOpacity,
        }}
      >
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ width: 7, height: 7, border: "1px solid var(--line-hi)" }}
            />
          ))}
        </span>
        <span
          className="flex-1 min-w-0"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text-dim)",
            border: "1px solid var(--line-dim)",
            background: "var(--bg)",
            padding: "3px 8px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {DEMO.url}
        </span>
      </div>

      {/* Page viewport */}
      <div style={{ overflow: "hidden", position: "relative" }}>
        <div
          style={{
            transform: `translateY(-${contentY}%)`,
            willChange: "transform",
          }}
        >
          {/* Inherited hero slot */}
          <div style={{ padding: 12 }}>
            <p style={{ ...microLabel, color: "var(--accent)", marginBottom: 8 }}>
              Built from the ad
            </p>
            {children}
          </div>
          {/* Below the fold: the embedded reserve flow */}
          <div style={{ padding: "0 12px 12px" }}>
            <ReservePanel />
            <div className="grid grid-cols-3 gap-2" style={{ marginTop: 8 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 26, background: "var(--ink-a06)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static stage-2 visual for the stacked fallback: page with inherited ad. */
export function StaticPageWithAd() {
  return (
    <PageFrame>
      <div style={{ border: "1px solid var(--line-hi)", background: "var(--bg)" }}>
        <div style={{ position: "relative" }}>
          <DoorsIllustration height={64} />
          <span
            style={{
              ...microLabel,
              position: "absolute",
              left: 8,
              bottom: 8,
              background: "var(--text)",
              color: "var(--bg)",
              padding: "2px 6px",
            }}
          >
            {DEMO.campaign}
          </span>
        </div>
        <div style={{ padding: "9px 10px" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text-accent)", letterSpacing: "-0.02em" }}>
            {DEMO.creative}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-dim)" }}>
            {DEMO.facility}
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
