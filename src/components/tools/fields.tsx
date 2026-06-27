"use client";

import { useState } from "react";
import { round2, usd0 } from "@/lib/tools/format";

/* ──────────────────────────────────────────────────────────────────────────
   Shared input + display primitives for the operator tools at /tools.

   The number fields keep their own text buffer so a user can clear a field or
   type a decimal point freely. They resync from the external value during
   render (React supports setState-in-render) — not in an effect — so a basis
   toggle, reset, or persisted load updates the field without a setState-in-
   effect cascade, and live typing is never clobbered.

   Formatters + numeric helpers live in @/lib/tools/format (pure, unit-tested);
   re-exported here so calculator clients can import everything from one place.
   ────────────────────────────────────────────────────────────────────────── */

export { usd0, usd2, pct, num0, round2, clampPct, nonNeg } from "@/lib/tools/format";

/* ── Money input ($ prefix) ─────────────────────────────────────────────── */
export function MoneyField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(() => (value ? String(round2(value)) : ""));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text) || 0;
    if (Math.abs(parsed - value) > 0.005) {
      setText(value ? String(round2(value)) : "");
    }
  }

  return (
    <label className="block">
      <span
        className="text-sm font-medium block mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {label}
      </span>
      <div
        className="flex items-center rounded-lg overflow-hidden focus-within:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      >
        <span
          className="pl-3 pr-1 text-sm select-none"
          style={{ color: "var(--color-mid-gray)" }}
        >
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = raw === "" || raw === "." ? 0 : parseFloat(raw);
            const safe = Number.isFinite(n) ? n : 0;
            setSynced(safe);
            onChange(safe);
          }}
          className="w-full bg-transparent py-2.5 pr-3 text-sm tabular-nums outline-none"
          style={{ color: "var(--color-dark)" }}
        />
      </div>
      {help && <FieldHelp>{help}</FieldHelp>}
    </label>
  );
}

/* ── Percent input (% suffix, optional derived $ readout) ───────────────── */
export function PercentField({
  label,
  help,
  value,
  onChange,
  derivedDollars,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (n: number) => void;
  derivedDollars?: number;
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text) || 0;
    if (Math.abs(parsed - value) > 0.005) {
      setText(value ? String(value) : "");
    }
  }

  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-dark)" }}
        >
          {label}
        </span>
        {derivedDollars != null && derivedDollars > 0 && (
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--color-mid-gray)" }}
          >
            ≈ {usd0(derivedDollars)}
          </span>
        )}
      </div>
      <div
        className="flex items-center rounded-lg overflow-hidden focus-within:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = raw === "" || raw === "." ? 0 : parseFloat(raw);
            const safe = Number.isFinite(n) ? n : 0;
            setSynced(safe);
            onChange(safe);
          }}
          className="w-full bg-transparent py-2.5 pl-3 text-sm tabular-nums outline-none"
          style={{ color: "var(--color-dark)" }}
        />
        <span
          className="pr-3 pl-1 text-sm select-none"
          style={{ color: "var(--color-mid-gray)" }}
        >
          %
        </span>
      </div>
      {help && <FieldHelp>{help}</FieldHelp>}
    </label>
  );
}

/* ── Decimal input (no $ prefix, optional unit suffix e.g. "x", "yrs") ───── */
export function DecimalField({
  label,
  help,
  value,
  onChange,
  suffix,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  const [text, setText] = useState(() => (value ? String(round2(value)) : ""));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text) || 0;
    if (Math.abs(parsed - value) > 0.005) {
      setText(value ? String(round2(value)) : "");
    }
  }

  return (
    <label className="block">
      <span
        className="text-sm font-medium block mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {label}
      </span>
      <div
        className="flex items-center rounded-lg overflow-hidden focus-within:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = raw === "" || raw === "." ? 0 : parseFloat(raw);
            const safe = Number.isFinite(n) ? n : 0;
            setSynced(safe);
            onChange(safe);
          }}
          className="w-full bg-transparent py-2.5 pl-3 text-sm tabular-nums outline-none"
          style={{ color: "var(--color-dark)" }}
        />
        {suffix && (
          <span
            className="pr-3 pl-1 text-sm select-none"
            style={{ color: "var(--color-mid-gray)" }}
          >
            {suffix}
          </span>
        )}
      </div>
      {help && <FieldHelp>{help}</FieldHelp>}
    </label>
  );
}

/* ── Plain integer input ────────────────────────────────────────────────── */
export function PlainNumber({
  label,
  value,
  onChange,
  help,
  placeholder = "0",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  help?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => (value ? String(value) : ""));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const parsed = text === "" ? 0 : parseInt(text, 10) || 0;
    if (parsed !== value) {
      setText(value ? String(value) : "");
    }
  }
  return (
    <label className="block">
      <span
        className="text-sm font-medium block mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setText(raw);
          const n = raw === "" ? 0 : parseInt(raw, 10);
          const safe = Number.isFinite(n) ? n : 0;
          setSynced(safe);
          onChange(safe);
        }}
        className="w-full rounded-lg py-2.5 px-3 text-sm tabular-nums outline-none focus:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          color: "var(--color-dark)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      />
      {help && <FieldHelp>{help}</FieldHelp>}
    </label>
  );
}

/* ── Plain text input ───────────────────────────────────────────────────── */
export function TextField({
  label,
  value,
  onChange,
  placeholder = "Optional",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span
        className="text-sm font-medium block mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2"
        style={{
          border: "1px solid var(--color-light-gray)",
          background: "var(--color-light)",
          color: "var(--color-dark)",
          ["--tw-ring-color" as string]: "var(--color-dark)",
        }}
      />
    </label>
  );
}

/* ── Range slider (label + live value + min/max ticks) ──────────────────── */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  help?: string;
}) {
  return (
    <div className="block">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-dark)" }}
        >
          {label}
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: "var(--color-dark)" }}
        >
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-dark)]"
        aria-label={label}
      />
      <div
        className="flex justify-between text-xs mt-1 tabular-nums"
        style={{ color: "var(--color-mid-gray)" }}
      >
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {help && <FieldHelp>{help}</FieldHelp>}
    </div>
  );
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs mt-1.5 leading-snug"
      style={{ color: "var(--color-mid-gray)" }}
    >
      {children}
    </p>
  );
}

/* ── Layout / display ───────────────────────────────────────────────────── */
export function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5 sm:p-7"
      style={{
        background: "var(--color-light)",
        border: "1px solid var(--color-light-gray)",
      }}
    >
      <div className="mb-5">
        {step && (
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-mid-gray)" }}
          >
            {step}
          </span>
        )}
        <h2
          className="text-xl font-semibold mt-1"
          style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-sm mt-1 leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function ResultRow({
  label,
  value,
  strong,
  muted,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span
        className="text-sm"
        style={{
          color: muted ? "var(--color-mid-gray)" : "var(--color-body-text)",
          fontWeight: strong ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        className="text-sm tabular-nums"
        style={{
          color: negative ? "var(--color-red)" : "var(--color-dark)",
          fontWeight: strong ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* MiniStat sits inside the dark results panel. */
export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3" style={{ background: "var(--color-dark)" }}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-0.5"
        style={{ color: "var(--color-mid-gray)" }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: "var(--color-light)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-base font-semibold mb-1.5"
        style={{ color: "var(--color-dark)" }}
      >
        {q}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--color-body-text)" }}
      >
        {children}
      </p>
    </div>
  );
}
