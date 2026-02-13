import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { useUiStore } from '../../store/uiStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    // Reset generating state so the header indicator doesn't get stuck
    useUiStore.getState().setIsGenerating(false);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="max-w-xl mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-error/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-text-secondary text-sm mb-2">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p className="text-text-muted text-xs mb-6">
            Your course data has been saved. You can safely reload.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary text-sm font-medium hover:bg-bg-card transition cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
