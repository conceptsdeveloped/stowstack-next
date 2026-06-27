"use client";

import { useRef } from "react";

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Accessible segmented control / tablist with roving tabindex + arrow-key
 * navigation. Replaces the hand-rolled range toggles in campaigns/reports.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 ${className}`}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? "bg-[var(--color-dark)] text-[var(--color-light)]"
                : "text-[var(--color-body-text)] hover:text-[var(--color-dark)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
