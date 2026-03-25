'use client';

import { useState } from 'react';
import { AlertTriangle, Download, LogOut, Trash2, Loader2 } from 'lucide-react';

interface DangerZoneProps {
  onLogout: () => void;
  onClearCache: () => void;
  onExportData?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export function DangerZone({
  onLogout,
  onClearCache,
  onExportData,
  onDeleteAccount,
}: DangerZoneProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canDelete = deleteInput === 'DELETE';

  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    if (!canDelete || !onDeleteAccount) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await onDeleteAccount();
      setShowDeleteModal(false);
      setDeleteInput('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed. Contact support.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!onExportData) return;
    setExporting(true);
    try {
      await onExportData();
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div
        className="rounded-xl p-6 mt-12"
        style={{
          border: '1px solid var(--color-red)',
          backgroundColor: 'var(--color-light)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} style={{ color: 'var(--color-red)' }} />
          <h3
            className="text-base font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-red)' }}
          >
            Danger zone
          </h3>
        </div>

        <div className="space-y-3">
          {/* Export data */}
          {onExportData && (
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
                >
                  Export all data
                </p>
                <p
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
                >
                  Download all your data as a ZIP file
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-body-text)',
                  borderColor: 'var(--color-light-gray)',
                }}
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Export
              </button>
            </div>
          )}

          {/* Logout */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
              >
                Sign out
              </p>
              <p
                className="text-xs"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
              >
                Sign out of the admin dashboard
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-red)',
                backgroundColor: 'rgba(176, 74, 58, 0.1)',
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Clear cache */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
              >
                Clear cache
              </p>
              <p
                className="text-xs"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
              >
                Clear local storage and reload
              </p>
            </div>
            <button
              type="button"
              onClick={onClearCache}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-red)',
                backgroundColor: 'rgba(176, 74, 58, 0.1)',
              }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>

          {/* Delete account */}
          {onDeleteAccount && (
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(176, 74, 58, 0.2)' }}>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-red)' }}
                >
                  Delete account
                </p>
                <p
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
                >
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: '#fff',
                  backgroundColor: 'var(--color-red)',
                }}
              >
                <Trash2 size={14} />
                Delete account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
          >
            <h3
              className="text-lg font-medium mb-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              Delete your StorageAds account
            </h3>
            <p
              className="text-sm mb-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
            >
              This will permanently delete your account, all facilities, all campaign data,
              and all reports. This action cannot be undone.
            </p>

            <label className="block mb-4">
              <span
                className="text-xs font-medium block mb-1.5"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
              >
                Type DELETE to confirm
              </span>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-red)]"
                style={{
                  backgroundColor: 'var(--color-light)',
                  borderColor: 'var(--color-light-gray)',
                  color: 'var(--color-dark)',
                  fontFamily: 'var(--font-heading)',
                }}
                autoFocus
              />
            </label>

            {deleteError && (
              <p className="text-xs mb-3" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-red)' }}>
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-body-text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: '#fff',
                  backgroundColor: canDelete ? 'var(--color-red)' : 'var(--color-mid-gray)',
                }}
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
