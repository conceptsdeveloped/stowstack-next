import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

/**
 * KPI tile. Delta is shown with an arrow icon in addition to color so the
 * trend is not conveyed by color alone (a11y).
 */
export function StatCard({
  label,
  value,
  delta,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  /** Percentage change; sign drives the arrow + color. Omit to hide. */
  delta?: number;
  icon?: ReactNode;
  hint?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--color-mid-gray)]">{label}</p>
        {icon && <span className="text-[var(--color-mid-gray)]">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-dark)]">{value}</p>
      {(delta !== undefined || hint) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                up ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
              }`}
            >
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-[var(--color-mid-gray)]">{hint}</span>}
        </div>
      )}
    </div>
  );
}
