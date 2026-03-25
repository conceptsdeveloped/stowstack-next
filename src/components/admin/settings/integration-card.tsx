'use client';

import { useState } from 'react';
import { Loader2, Unplug, Plug, AlertCircle, RefreshCw } from 'lucide-react';
import { RelativeTime } from '@/components/date/relative-time';
import type { IntegrationConnection } from '@/types/settings';

interface IntegrationCardProps {
  platform: IntegrationConnection['platform'];
  connection: IntegrationConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  /** For storEDGE: render inline API key form instead of OAuth redirect */
  connectForm?: React.ReactNode;
}

const PLATFORM_META: Record<string, { name: string; description: string }> = {
  storedge: { name: 'storEDGE', description: 'Property management & online reservations' },
  meta: { name: 'Meta Ads', description: 'Facebook & Instagram advertising' },
  google: { name: 'Google Ads', description: 'Google Search & Display advertising' },
  twilio: { name: 'Twilio', description: 'SMS & call tracking' },
  tiktok: { name: 'TikTok Ads', description: 'TikTok advertising' },
};

function StatusBadge({ status }: { status: IntegrationConnection['status'] }) {
  const config = {
    connected: { label: 'Connected', color: 'var(--color-green)', bg: 'rgba(120, 140, 93, 0.15)' },
    disconnected: { label: 'Not connected', color: 'var(--color-mid-gray)', bg: 'var(--color-light-gray)' },
    error: { label: 'Connection error', color: 'var(--color-red)', bg: 'rgba(176, 74, 58, 0.1)' },
    syncing: { label: 'Syncing...', color: 'var(--color-gold)', bg: 'var(--color-gold-light)' },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        fontFamily: 'var(--font-heading)',
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {status === 'syncing' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'error' && <AlertCircle className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

export function IntegrationCard({
  platform,
  connection,
  onConnect,
  onDisconnect,
  connectForm,
}: IntegrationCardProps) {
  const meta = PLATFORM_META[platform] ?? { name: platform, description: '' };
  const [showForm, setShowForm] = useState(false);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--color-light)',
        borderColor: connection.status === 'error'
          ? 'var(--color-red)'
          : 'var(--color-light-gray)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4
              className="text-base font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
            >
              {meta.name}
            </h4>
            <StatusBadge status={connection.status} />
          </div>
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
          >
            {meta.description}
          </p>

          {connection.accountName && connection.status === 'connected' && (
            <p
              className="mt-1.5 text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-body-text)' }}
            >
              {connection.accountName}
              {connection.lastSyncAt && (
                <span style={{ color: 'var(--color-mid-gray)' }}>
                  {' '} · Last sync <RelativeTime date={connection.lastSyncAt} />
                </span>
              )}
            </p>
          )}

          {connection.status === 'error' && connection.errorMessage && (
            <p
              className="mt-1.5 text-xs"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-red)' }}
            >
              {connection.errorMessage}
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {connection.status === 'connected' && (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-mid-gray)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-light-gray)',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-red)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-red)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-light-gray)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-mid-gray)';
              }}
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          )}

          {connection.status === 'disconnected' && (
            <button
              type="button"
              onClick={connectForm ? () => setShowForm(!showForm) : onConnect}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                backgroundColor: 'var(--color-gold)',
              }}
            >
              <Plug className="h-3.5 w-3.5" />
              Connect
            </button>
          )}

          {connection.status === 'error' && (
            <button
              type="button"
              onClick={onConnect}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                backgroundColor: 'var(--color-gold)',
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Inline connect form (storEDGE API key) */}
      {showForm && connectForm && (
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--color-light-gray)' }}
        >
          {connectForm}
        </div>
      )}
    </div>
  );
}
