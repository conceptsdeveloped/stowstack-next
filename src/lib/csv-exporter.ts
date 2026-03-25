// Client-side CSV generation and download
// Handles UTF-8 BOM for Excel compatibility, proper quoting, and ISO dates.

import type { CsvExportConfig } from '@/types/reports';

/** Escape a CSV cell value — wrap in quotes if it contains commas, quotes, or newlines */
function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Generate a CSV string from config */
export function buildCsvString(config: CsvExportConfig): string {
  const { columns, data } = config;

  // Header row
  const header = columns.map((col) => escapeCell(col.header)).join(',');

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        if (raw === null || raw === undefined) return '';
        const formatted = col.formatter ? col.formatter(raw) : String(raw);
        return escapeCell(formatted);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/** Generate and trigger download of a CSV file */
export function downloadCsv(config: CsvExportConfig): void {
  const csv = buildCsvString(config);

  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Build a standard filename: storageads-[type]-[facility]-[daterange].csv */
export function buildExportFilename(
  type: string,
  facilityName?: string,
  dateRange?: { start: string; end: string }
): string {
  const parts = ['storageads', type.replace(/[^a-z0-9]+/gi, '-').toLowerCase()];
  if (facilityName) {
    parts.push(facilityName.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  }
  if (dateRange) {
    parts.push(dateRange.start.slice(0, 7)); // YYYY-MM
  }
  return parts.join('-') + '.csv';
}
