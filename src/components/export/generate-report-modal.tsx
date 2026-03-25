'use client';

import { useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { useFacility } from '@/lib/facility-context';
import { REPORT_TYPE_LABELS } from '@/types/reports';
import type { ReportType, ExportFormat, GenerateReportRequest } from '@/types/reports';

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (request: GenerateReportRequest) => Promise<void>;
}

export function GenerateReportModal({ open, onClose, onGenerate }: GenerateReportModalProps) {
  const { facilities, currentId } = useFacility();
  const [type, setType] = useState<ReportType>('monthly_performance');
  const [facilityId, setFacilityId] = useState(currentId);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      await onGenerate({
        type,
        facilityId,
        dateRange: { start: startDate, end: endDate },
        format,
        includeCharts: format === 'pdf' ? includeCharts : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
          >
            Generate Report
          </h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-mid-gray)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Report type */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Report Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
              style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
            >
              {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Facility */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Facility
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
              style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
            >
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
                style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
                style={{ backgroundColor: 'var(--color-light)', borderColor: 'var(--color-light-gray)', color: 'var(--color-dark)', fontFamily: 'var(--font-body)' }}
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}>
              Format
            </label>
            <div className="flex gap-2">
              {(['csv', 'pdf'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium text-center uppercase transition-colors"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    borderColor: format === f ? 'var(--color-gold)' : 'var(--color-light-gray)',
                    backgroundColor: format === f ? 'var(--color-gold-light)' : 'var(--color-light)',
                    color: format === f ? 'var(--color-gold)' : 'var(--color-body-text)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Include charts (PDF only) */}
          {format === 'pdf' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="accent-[var(--color-gold)]"
              />
              <span className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}>
                Include charts and visualizations
              </span>
            </label>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs mt-2" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-red)' }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-body-text)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !startDate || !endDate}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-heading)', color: '#fff', backgroundColor: 'var(--color-gold)' }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
