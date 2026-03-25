'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  onCsvExport: () => void;
  onPdfExport?: () => void;
  loading?: boolean;
  label?: string;
}

/**
 * Export button with dropdown for CSV/PDF format selection.
 * Position at top-right of data tables alongside date range selector.
 */
export function ExportButton({
  onCsvExport,
  onPdfExport,
  loading,
  label = 'Export',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const handleCsv = () => {
    setOpen(false);
    onCsvExport();
  };

  const handlePdf = () => {
    setOpen(false);
    onPdfExport?.();
  };

  // If only CSV (no PDF option), just trigger directly
  if (!onPdfExport) {
    return (
      <button
        type="button"
        onClick={onCsvExport}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-body-text)',
          borderColor: 'var(--color-light-gray)',
          backgroundColor: 'transparent',
        }}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {label}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-body-text)',
          borderColor: 'var(--color-light-gray)',
          backgroundColor: 'transparent',
        }}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {label}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[160px]"
          style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
        >
          <button
            type="button"
            onClick={handleCsv}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-light-gray)')}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          >
            <Table className="h-4 w-4" style={{ color: 'var(--color-mid-gray)' }} />
            Download CSV
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-dark)' }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-light-gray)')}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          >
            <FileText className="h-4 w-4" style={{ color: 'var(--color-mid-gray)' }} />
            Generate PDF Report
          </button>
        </div>
      )}
    </div>
  );
}
