import { Component } from 'react';
import type { ReactNode, ErrorInfo, CSSProperties } from 'react';
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
    useUiStore.getState().setIsGenerating(false);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const wrapStyle: CSSProperties = {
        maxWidth: 640,
        margin: '0 auto',
        padding: '80px 24px',
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
        textAlign: 'center',
      };

      return (
        <div style={wrapStyle}>
          <div
            className="cb-sc"
            style={{
              fontSize: 12,
              letterSpacing: '0.18em',
              color: 'var(--cb-accent-emphasis)',
              marginBottom: 6,
            }}
          >
            something gave way
          </div>
          <h2
            className="cb-italic"
            style={{
              margin: '0 0 10px',
              fontSize: 34,
              fontWeight: 500,
              lineHeight: 1.1,
              fontVariationSettings: '"opsz" 28',
            }}
          >
            We caught it before it tipped over.
          </h2>
          <p
            className="cb-italic"
            style={{
              margin: '0 auto 4px',
              fontSize: 16,
              lineHeight: 1.55,
              color: 'var(--cb-text-muted)',
              maxWidth: 520,
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p
            style={{
              margin: '0 auto 28px',
              fontSize: 13.5,
              color: 'var(--cb-text-subtle)',
              maxWidth: 520,
              fontStyle: 'italic',
            }}
          >
            Your course data is saved locally — reload is safe.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="cb-mono cb-focus"
              style={{
                background: 'var(--cb-accent-emphasis)',
                color: '#fff',
                border: 0,
                padding: '8px 16px',
                borderRadius: 2,
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cb-mono cb-focus"
              style={{
                background: 'transparent',
                color: 'var(--cb-text-muted)',
                border: '1px solid var(--cb-border-default)',
                padding: '8px 16px',
                borderRadius: 2,
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
