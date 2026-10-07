import { FACILITY_TYPES, STAMPS, type FacilityType, type StampKey } from "@/lib/instrument-calm/stamps";

/**
 * Instrument Calm stamps and dials (library entry 008, COMPONENTS.md §5–6).
 * Stamps are the only icons: pixel blocks, ink = currentColor, crisp edges,
 * beside their words, never instead of them.
 */

/** Row runs → one path, so a 16×16 stamp is a single crisp shape per colour. */
function runs(rows: string[], char: string): string {
  let d = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== char) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] === char) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return d;
}

function framedRows(rows: string[]): string[] {
  const n = rows.length + 4;
  return [
    "#".repeat(n),
    `#${".".repeat(n - 2)}#`,
    ...rows.map((r) => `#.${r}.#`),
    `#${".".repeat(n - 2)}#`,
    "#".repeat(n),
  ];
}

export function Stamp({
  name,
  size = 24,
  accent = false,
  framed = false,
  className = "",
  title,
}: {
  name: StampKey;
  /** 16 in dense lists, 24 in rails, menus and buttons; framed only at 40 and up. */
  size?: number;
  /** The current item: the stamp's one accent group (its verb) turns navy. */
  accent?: boolean;
  framed?: boolean;
  className?: string;
  /** Only for a stamp without a visible label beside it. */
  title?: string;
}) {
  const rows = framed && size >= 40 ? framedRows(STAMPS[name].bitmap) : STAMPS[name].bitmap;
  const n = rows.length;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={`shrink-0 ${className}`}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={runs(rows, "#")} fill="currentColor" />
      <path d={runs(rows, "@")} fill={accent ? "var(--ic-signal-selected)" : "currentColor"} />
    </svg>
  );
}

/**
 * A facility stamp (STAMPS.md "Facility stamps"; geometry from tools/stamps.py
 * facility_svg on a 48-unit box): frame 1/16, two stenciled initials in IBM
 * Plex Mono Bold, and at 48px and up a rule, the unit-type primitive and the
 * two-digit sequence. Below 48px it is compact: frame and initials only, since
 * the name always sits beside it.
 */
export function FacilityStamp({
  initials,
  type,
  seq = 1,
  size = 48,
  label,
  className = "",
}: {
  initials: string;
  type: FacilityType;
  seq?: number;
  size?: number;
  /** Accessible name, e.g. "Maple Street Storage". */
  label: string;
  className?: string;
}) {
  const full = size >= 48;
  const mono = { fontFamily: 'var(--font-plex-mono), "IBM Plex Mono", ui-monospace, monospace', fontWeight: 700 };
  // Baselines from the kit's cap-height centring (Plex Mono cap height 0.698 em).
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role="img" aria-label={`${label}, facility stamp`} className={`shrink-0 ${className}`}>
      <path d="M0 0h48v48H0zM3 3v42h42V3z" fill="currentColor" fillRule="evenodd" />
      {full ? (
        <>
          <text x="24" y="24.83" textAnchor="middle" fontSize="21" fill="currentColor" style={mono}>
            {initials.slice(0, 2)}
          </text>
          <path d="M3 30h42v2H3z" fill="currentColor" />
          <path
            d={runs(FACILITY_TYPES[type].bitmap, "#")}
            fill="currentColor"
            transform="translate(6.5 34.5)"
            shapeRendering="crispEdges"
          />
          <text x="41.5" y="42.99" textAnchor="end" fontSize="10" fill="currentColor" style={mono}>
            {String(seq).padStart(2, "0")}
          </text>
        </>
      ) : (
        <text x="24" y="33.57" textAnchor="middle" fontSize="26" fill="currentColor" style={mono}>
          {initials.slice(0, 2)}
        </text>
      )}
    </svg>
  );
}

/**
 * The instrument dial (COMPONENTS.md §6): outer ring 2px, inner ring at 0.58r,
 * one filled segment from 12 o'clock clockwise, the readout centred in the
 * brand face at 800 with tabular numbers. At most one solid dial per view.
 */
export function Dial({
  fraction,
  size = 96,
  readout,
  mode = "solid",
  label,
}: {
  /** 0–1: how much of the ring the one segment fills. */
  fraction: number;
  size?: number;
  readout?: string;
  mode?: "solid" | "hatch";
  label: string;
}) {
  const f = Math.max(0, Math.min(0.9999, fraction));
  const R = 48;
  const r = R * 0.58;
  const a0 = -Math.PI / 2;
  const a1 = a0 + f * Math.PI * 2;
  const pt = (rad: number, ang: number) => `${50 + rad * Math.cos(ang)} ${50 + rad * Math.sin(ang)}`;
  const large = f > 0.5 ? 1 : 0;
  const seg = `M${pt(R, a0)}A${R} ${R} 0 ${large} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${large} 0 ${pt(r, a0)}Z`;
  const ink = "var(--ic-ink-primary)";
  const hatch: string[] = [];
  if (mode === "hatch") {
    for (let deg = 0; deg <= f * 360; deg += 3) {
      const ang = a0 + (deg * Math.PI) / 180;
      hatch.push(`M${pt(r, ang)}L${pt(R, ang)}`);
    }
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label} className="shrink-0">
      {f > 0 &&
        (mode === "solid" ? (
          <path d={seg} fill="var(--ic-signal-reading)" />
        ) : (
          <path d={hatch.join("")} stroke={ink} strokeWidth="0.9" fill="none" />
        ))}
      <circle cx="50" cy="50" r={R} fill="none" stroke={ink} strokeWidth="2" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={ink} strokeWidth="2" />
      {f > 0 && <path d={`M${pt(r, a0)}L${pt(R, a0)}M${pt(r, a1)}L${pt(R, a1)}`} stroke={ink} strokeWidth="2" />}
      {readout && (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fill={ink}
          style={{ fontFamily: "var(--ic-font-brand)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        >
          {readout}
        </text>
      )}
    </svg>
  );
}

/** The menu glyph: three solid ink bars, square ends (COMPONENTS.md §2). */
export function MenuBars() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M2 4h16v2.5H2zM2 8.75h16v2.5H2zM2 13.5h16V16H2z" fill="currentColor" />
    </svg>
  );
}
