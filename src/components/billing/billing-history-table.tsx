'use client';

import { Download } from 'lucide-react';
import { INVOICE_STATUS_CONFIG } from '@/types/billing';
import type { Invoice } from '@/types/billing';

interface BillingHistoryTableProps {
  invoices: Invoice[];
}

export function BillingHistoryTable({ invoices }: BillingHistoryTableProps) {
  if (invoices.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--color-light-gray)' }}
      >
        <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
          No invoices yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-light-gray)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-light-gray)' }}>
            {['Invoice', 'Date', 'Period', 'Amount', 'Status', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, idx) => {
            const statusCfg = INVOICE_STATUS_CONFIG[inv.status] ?? INVOICE_STATUS_CONFIG.pending;
            return (
              <tr
                key={inv.id}
                style={{
                  borderBottom: idx < invoices.length - 1 ? '1px solid var(--color-light-gray)' : undefined,
                }}
              >
                <td className="px-4 py-3">
                  <span className="font-medium" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)', fontSize: '13px' }}>
                    {inv.number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
                    {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
                    {new Date(inv.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(inv.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, color: 'var(--color-dark)' }}>
                    ${inv.total.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ fontFamily: 'var(--font-heading)', color: statusCfg.color, backgroundColor: statusCfg.bg }}
                  >
                    {statusCfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded transition-colors inline-flex"
                      style={{ color: 'var(--color-mid-gray)' }}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
