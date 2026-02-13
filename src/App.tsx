import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { SetupPage } from './pages/SetupPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { ResearchPage } from './pages/ResearchPage';
import { BuildPage } from './pages/BuildPage';
import { ExportPage } from './pages/ExportPage';

function App() {
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
