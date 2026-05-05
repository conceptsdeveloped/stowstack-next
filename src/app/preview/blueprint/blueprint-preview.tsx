"use client";

/**
 * Blueprint theme preview — re-skin of the homepage hero in a cobalt
 * blue / black / white aesthetic. Lives at /preview/blueprint, isolated
 * from the live site. Uses existing copy from the marketing hero, only
 * the styling is new.
 *
 * Off-brand on purpose — see CLAUDE.md for the real palette.
 */

const COBALT = "#1a4cf0";
const COBALT_DEEP = "#0f3acf";
const INK = "#0a0a0a";
const PAPER = "#f5f5f3";
const PAPER_TINT = "#e8e8e2";

export function BlueprintPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: COBALT,
        fontFamily: "var(--font-primary, system-ui)",
        color: PAPER,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ─── Top chrome ─── */}
      <header
        style={{
          background: INK,
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading, var(--font-primary))",
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: "-0.01em",
            color: PAPER,
          }}
        >
          storageads
        </span>
        <Burst />
      </header>

      {/* ─── Body ─── */}
      <main
        style={{
          flex: 1,
          padding: "48px 22px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 36,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--serif, 'Lora', serif)",
            fontWeight: 400,
            fontSize: "clamp(2.5rem, 11vw, 4.5rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: PAPER,
            margin: 0,
          }}
        >
          The marketing
          <br />
          system that
          <br />
          proves
        </h1>

        {/* Card with corner brackets */}
        <div style={{ position: "relative", padding: 12 }}>
          <Brackets />
          <div
            style={{
              background: PAPER,
              color: INK,
              padding: "20px 22px 22px",
              borderRadius: 2,
              boxShadow: `inset 0 0 0 1px ${PAPER_TINT}`,
            }}
          >
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                fontFamily: "var(--font-primary, system-ui)",
                fontSize: 17,
                fontWeight: 500,
                color: INK,
                textDecoration: "underline",
                textUnderlineOffset: 4,
                textDecorationThickness: 1.5,
                display: "block",
                marginBottom: 10,
              }}
            >
              Part 1: Launching ad attribution
            </a>
            <p
              style={{
                fontFamily: "var(--font-primary, system-ui)",
                fontSize: 15.5,
                lineHeight: 1.45,
                color: "#1a1a18",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Every move-in traced to the ad that produced it. Custom landing
              pages with embedded rental flow — from first click to signed
              lease.
            </p>
          </div>
        </div>

        {/* Dithered illustration zone */}
        <DitherPanel />

        {/* CTA pill */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
          <button
            type="button"
            style={{
              background: PAPER,
              color: INK,
              border: "none",
              padding: "16px 28px 16px 22px",
              borderRadius: 999,
              fontFamily: "var(--font-primary, system-ui)",
              fontSize: 19,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <LinkGlyph />
            Get started
          </button>
        </div>
      </main>

      {/* ─── Bottom chrome ─── */}
      <footer
        style={{
          background: INK,
          padding: "16px 22px",
          textAlign: "center",
          fontFamily: "var(--font-primary, system-ui)",
          fontSize: 13,
          letterSpacing: "0.04em",
          fontWeight: 500,
          color: PAPER,
        }}
      >
        storageads.com
      </footer>
    </div>
  );
}

/* ─── Decorative bits ─── */

function Burst() {
  // 8-point asterisk burst, hairline white on black header
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {[0, 45, 90, 135].map((deg) => (
        <line
          key={deg}
          x1="11"
          y1="2"
          x2="11"
          y2="20"
          stroke={PAPER}
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${deg} 11 11)`}
        />
      ))}
    </svg>
  );
}

function Brackets() {
  // Four L-shaped corner crops around the white card. CSS borders on
  // four absolutely-positioned squares (SVG `d` doesn't accept calc()).
  const len = 14;
  const stroke = 1.5;
  type Corner = {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    borderTop?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;
  };
  const corners: Corner[] = [
    { top: 0, left: 0, borderTop: true, borderLeft: true },
    { top: 0, right: 0, borderTop: true, borderRight: true },
    { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
    { bottom: 0, right: 0, borderBottom: true, borderRight: true },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            width: len,
            height: len,
            borderTop: c.borderTop ? `${stroke}px solid ${PAPER}` : undefined,
            borderRight: c.borderRight ? `${stroke}px solid ${PAPER}` : undefined,
            borderBottom: c.borderBottom ? `${stroke}px solid ${PAPER}` : undefined,
            borderLeft: c.borderLeft ? `${stroke}px solid ${PAPER}` : undefined,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function DitherPanel() {
  // Pixelated radial cluster — pure CSS, no images. Two stacked layers
  // of dot grids at different scales, masked to a roughly circular blob
  // so the texture echoes the workbook screenshot without copying it.
  return (
    <div
      style={{
        position: "relative",
        height: 320,
        background: COBALT_DEEP,
        overflow: "hidden",
        borderRadius: 2,
        boxShadow: `inset 0 0 0 1px ${COBALT_DEEP}`,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${PAPER} 1px, transparent 1.4px)`,
          backgroundSize: "6px 6px",
          opacity: 0.55,
          maskImage:
            "radial-gradient(circle at 50% 45%, black 0%, black 32%, transparent 60%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 45%, black 0%, black 32%, transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${PAPER} 1px, transparent 1.4px)`,
          backgroundSize: "10px 10px",
          opacity: 0.7,
          maskImage:
            "radial-gradient(circle at 50% 70%, black 0%, black 22%, transparent 50%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 70%, black 0%, black 22%, transparent 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${COBALT_DEEP} 1px, transparent 1px)`,
          backgroundSize: "100% 4px",
          opacity: 0.35,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}

function LinkGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 14 A 4 4 0 0 1 10 8 L 13 5 A 4 4 0 0 1 19 11 L 17 13"
        fill="none"
        stroke={COBALT}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 10 A 4 4 0 0 1 14 16 L 11 19 A 4 4 0 0 1 5 13 L 7 11"
        fill="none"
        stroke={COBALT}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
