import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { StageIndicator } from './StageIndicator';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useUiStore } from '../../store/uiStore';

export function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const setError = useUiStore((s) => s.setError);

  // Clear the transient error banner when navigating between stages, so a
  // failure on one page (e.g. a SCORM export on Export) doesn't haunt the next
  // page. Errors raised while you stay on a page are unaffected.
  useEffect(() => {
    setError(null);
  }, [location.pathname, setError]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cb-ground-page)',
        color: 'var(--cb-text-default)',
      }}
    >
      <Header />
      <main style={{ paddingTop: 64 }}>
        {!isLanding && <StageIndicator />}
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
