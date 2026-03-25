'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Permission denied page shown when a user navigates to a page they don't have access to.
 * Does NOT reveal what the page contains.
 */
export function PermissionDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <Lock className="mx-auto mb-4 h-8 w-8" style={{ color: 'var(--color-mid-gray)' }} />
        <h2
          className="text-xl font-medium mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
        >
          You don't have access to this page
        </h2>
        <p
          className="text-sm mb-6"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
        >
          Contact your account owner for access.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          style={{
            fontFamily: 'var(--font-heading)',
            color: '#fff',
            backgroundColor: 'var(--color-gold)',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
