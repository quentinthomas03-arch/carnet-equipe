import { HashRouter, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { QuickAddProvider, useQuickAdd } from './components/QuickAdd';
import { FirstRunNotice } from './components/FirstRunNotice';
import { ToastProvider } from './ui/Toast';
import { TeamPage } from './pages/TeamPage';
import { TodayPage } from './pages/TodayPage';
import { ReviewsPage } from './pages/OtherPages';
import { MeetingsPage } from './pages/MeetingsPage';
import { PrepPage } from './pages/PrepPage';
import { DebriefPage } from './pages/DebriefPage';
import { SettingsPage } from './pages/SettingsPage';
import { CollaboratorPage } from './pages/CollaboratorPage';
import { TopicsPage } from './pages/TopicsPage';
import { CommitmentsPage } from './pages/CommitmentsPage';

function Shell() {
  const quickAdd = useQuickAdd();
  return (
    <>
      <main className="min-h-dvh max-w-lg mx-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<TeamPage />} />
          <Route path="/aujourdhui" element={<TodayPage />} />
          <Route path="/points" element={<MeetingsPage />} />
          <Route path="/points/:id/preparer" element={<PrepPage />} />
          <Route path="/points/:id/debrief" element={<DebriefPage />} />
          <Route path="/bilans" element={<ReviewsPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/c/:id" element={<CollaboratorPage />} />
          <Route path="/a-aborder" element={<TopicsPage />} />
          <Route path="/engagements" element={<CommitmentsPage />} />
          <Route path="*" element={<TeamPage />} />
        </Routes>
      </main>
      <TabBar onQuickAdd={() => quickAdd()} />
      <FirstRunNotice />
    </>
  );
}

/**
 * Coquille de l'appli. HashRouter (#/…) : compatible GitHub Pages sans configuration serveur.
 */
export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <QuickAddProvider>
          <Shell />
        </QuickAddProvider>
      </ToastProvider>
    </HashRouter>
  );
}
