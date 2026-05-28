import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { SetupPage } from './pages/SetupPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { ResearchPage } from './pages/ResearchPage';
import { BuildPage } from './pages/BuildPage';
import { ExportPage } from './pages/ExportPage';
import { useCourseStore } from './store/courseStore';

function App() {
  const [hydrated, setHydrated] = useState(useCourseStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useCourseStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cb-ground-page)',
          fontFamily: 'var(--font-cb-serif)',
        }}
      >
        <div
          className="cb-italic"
          style={{
            fontSize: 15,
            color: 'var(--cb-text-muted)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <span
            className="cb-sc cb-mono"
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              color: 'var(--cb-accent-emphasis)',
            }}
          >
            cb · loading
          </span>
          <span>fetching local course data…</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/syllabus" element={<SyllabusPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
