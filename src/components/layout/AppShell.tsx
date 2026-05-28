import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { StageIndicator } from './StageIndicator';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

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
