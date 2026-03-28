"use client";

import { useState } from "react";
import { LayoutList, Table2 } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sticky?: boolean;
  render: (row: T) => React.ReactNode;
  renderCard?: (row: T) => React.ReactNode;
}

interface MobileTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  cardRenderer?: (row: T) => React.ReactNode;
}

export function MobileTable<T>({ columns, data, keyExtractor, cardRenderer }: MobileTableProps<T>) {
  const [view, setView] = useState<"table" | "cards">("table");

  return (
    <div>
      {/* View toggle — only on mobile */}
      <div className="mb-3 flex justify-end md:hidden">
        <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-l-lg px-2.5 py-1.5 text-xs ${
              view === "table"
                ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                : "text-[var(--color-mid-gray)]"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`rounded-r-lg px-2.5 py-1.5 text-xs ${
              view === "cards"
                ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                : "text-[var(--color-mid-gray)]"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card view (mobile) */}
      {view === "cards" ? (
        <div className="space-y-3 md:hidden">
          {data.map((row) => (
            <div key={keyExtractor(row)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              {cardRenderer ? (
                cardRenderer(row)
              ) : (
                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-4 text-sm">
                      <span className="shrink-0 text-[var(--color-mid-gray)]">{col.label}</span>
                      <span className="text-right text-[var(--color-dark)]">
                        {col.renderCard ? col.renderCard(row) : col.render(row)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Table view — scrollable on mobile, standard on desktop */}
      <div className={`${view === "cards" ? "hidden md:block" : ""}`}>
        <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)] ${
                      col.sticky
                        ? "sticky left-0 z-10 bg-[var(--color-light)]"
                        : ""
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={keyExtractor(row)} className="border-b border-[var(--border-subtle)] last:border-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-3 text-[var(--color-dark)] ${
                        col.sticky
                          ? "sticky left-0 z-10 bg-[var(--color-light)]"
                          : ""
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
