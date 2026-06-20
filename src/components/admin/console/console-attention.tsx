"use client";

import Link from "next/link";
import type { AttentionItem } from "@/lib/console";
import { SeverityDot } from "./signal";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";

const chip: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink)",
  border: "1px solid var(--bdr-strong)",
  borderRadius: 6,
  padding: "3px 9px",
  flexShrink: 0,
};

const lineClamp: React.CSSProperties = {
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function SkeletonRow({ last }: { last: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 6px",
        borderBottom: last ? "none" : "1px solid var(--bdr)",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <span className="animate-pulse" style={{ display: "block", height: 10, width: "44%", background: "rgba(0,0,0,0.07)", borderRadius: 3, marginBottom: 6 }} />
        <span className="animate-pulse" style={{ display: "block", height: 9, width: "68%", background: "rgba(0,0,0,0.06)", borderRadius: 3 }} />
      </span>
    </div>
  );
}

/** The Needs-Attention triage feed. Each row links to the relevant tool. */
export function ConsoleAttention({
  items,
  loading,
  emptyLabel = "All clear — nothing needs you right now.",
}: {
  items: AttentionItem[];
  loading: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div>
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i} last={i === 2} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "26px 0", textAlign: "center" }}>
        <span style={{ fontFamily: FONT, fontSize: 13, color: "var(--ink3)" }}>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div>
      {items.map((it, i) => (
        <Link
          key={it.id}
          href={it.href}
          aria-label={`${it.severity}: ${it.facilityName ? it.facilityName + " — " : ""}${it.title}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "10px 6px",
            borderBottom: i < items.length - 1 ? "1px solid var(--bdr)" : "none",
            textDecoration: "none",
            borderRadius: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <SeverityDot severity={it.severity} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ ...lineClamp, fontFamily: FONT, fontSize: 12.5, color: "var(--ink)" }}>
              {it.facilityName ? (
                <>
                  <span style={{ fontWeight: 600 }}>{it.facilityName}</span>
                  <span style={{ color: "var(--ink3)" }}> · </span>
                </>
              ) : null}
              <span style={{ fontWeight: 500 }}>{it.title}</span>
            </span>
            <span style={{ ...lineClamp, fontFamily: FONT, fontSize: 12, color: "var(--ink2)", marginTop: 1 }}>
              {it.detail}
            </span>
          </span>
          <span aria-hidden="true" style={chip}>
            {it.actionLabel}
          </span>
        </Link>
      ))}
    </div>
  );
}
