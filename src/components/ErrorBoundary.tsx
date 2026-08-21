import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching and displaying React errors.
 * Prevents the entire app from crashing when a component throws.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="grid min-h-[50vh] place-items-center p-6">
          <div className="grid max-w-md gap-4 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50">
              <div className="text-2xl text-red-600">⚠️</div>
            </div>
            <div className="grid gap-2">
              <h2 className="text-lg font-medium text-fg">Something went wrong</h2>
              <p className="text-sm text-fgMuted">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button
              onClick={this.resetError}
              className="button-primary inline-flex min-h-9 items-center justify-center gap-2"
            >
              <RefreshCw size={16} strokeWidth={1.75} />
              Try again
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 rounded border border-border bg-surfaceAlt p-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-fg">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-fgMuted">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-level error boundary fallback with navigation option.
 */
export function RouteErrorFallback({
  error,
  reset,
  onNavigateHome,
}: {
  error: Error;
  reset: () => void;
  onNavigateHome?: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] animate-rise place-items-center p-6">
      <div className="grid max-w-lg gap-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-50">
          <div className="text-3xl text-red-600">⚠️</div>
        </div>
        <div className="grid gap-3">
          <h1 className="text-xl font-medium text-fg">Something went wrong</h1>
          <p className="text-base text-fgMuted">
            {error.message || 'An unexpected error occurred while loading this page'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="button-primary inline-flex min-h-9 items-center gap-2">
            <RefreshCw size={16} strokeWidth={1.75} />
            Try again
          </button>
          {onNavigateHome && (
            <button onClick={onNavigateHome} className="button-secondary min-h-9">
              Go to Move
            </button>
          )}
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 rounded-lg border border-border bg-surfaceAlt p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              Error details (dev only)
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-fgMuted">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
