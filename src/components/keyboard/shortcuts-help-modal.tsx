'use client';

import { X } from 'lucide-react';
import { KeyPill } from './key-pill';
import { SHORTCUT_CATEGORIES } from '@/types/shortcuts';

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4">
        <div
          className="rounded-xl shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--color-light)', border: '1px solid var(--color-light-gray)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--color-light-gray)' }}
          >
            <h3
              className="text-lg font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              Keyboard shortcuts
            </h3>
            <button type="button" onClick={onClose} style={{ color: 'var(--color-mid-gray)' }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Shortcuts grid */}
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SHORTCUT_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <h4
                    className="text-xs font-medium uppercase tracking-wider mb-3"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-mid-gray)' }}
                  >
                    {cat.label}
                  </h4>
                  <div className="space-y-2">
                    {cat.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between"
                      >
                        <span
                          className="text-sm"
                          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
                        >
                          {shortcut.label}
                        </span>
                        <KeyPill keys={shortcut.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 border-t text-center"
            style={{ borderColor: 'var(--color-light-gray)' }}
          >
            <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}>
              Press <KeyPill keys={['?']} /> to toggle this help
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
