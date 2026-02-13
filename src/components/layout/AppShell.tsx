import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { StageIndicator } from './StageIndicator';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <main className="pt-16">
        {!isLanding && (
          <div className="max-w-7xl mx-auto px-6 pt-4">
            <StageIndicator />
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
