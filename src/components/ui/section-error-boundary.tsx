'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Section-level error boundary.
 * When a chart, table, or section crashes, it shows a contained error UI
 * instead of taking down the whole page. Rest of the dashboard stays functional.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Section error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border p-6 text-center"
          style={{
            backgroundColor: 'var(--color-light)',
            borderColor: 'var(--color-light-gray)',
          }}
        >
          <AlertCircle
            className="mx-auto mb-3 h-6 w-6"
            style={{ color: 'var(--color-mid-gray)' }}
          />
          <p
            className="text-sm font-medium mb-1"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-dark)' }}
          >
            {this.props.fallbackTitle || "This section couldn't load"}
          </p>
          <p
            className="text-xs mb-4"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-mid-gray)' }}
          >
            Something went wrong. The rest of the page should still work.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-gold)',
              backgroundColor: 'var(--color-gold-light)',
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
