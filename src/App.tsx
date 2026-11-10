import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { QuickAddSheet } from './components/QuickAddSheet';
import { FirstRunNotice } from './components/FirstRunNotice';
import { TeamPage } from './pages/TeamPage';
import { TodayPage, MeetingsPage, ReviewsPage } from './pages/OtherPages';
import { SettingsPage } from './pages/SettingsPage';

/**
 * Coquille de l'appli. HashRouter (#/…) : compatible GitHub Pages sans configuration serveur.
 */
export function App() {
  const [quickAdd, setQuickAdd] = useState(false);
  return (
    <HashRouter>
      <main className="min-h-dvh max-w-lg mx-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<TeamPage />} />
          <Route path="/aujourdhui" element={<TodayPage />} />
          <Route path="/points" element={<MeetingsPage />} />
          <Route path="/bilans" element={<ReviewsPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="*" element={<TeamPage />} />
        </Routes>
      </main>
      <TabBar onQuickAdd={() => setQuickAdd(true)} />
      <QuickAddSheet open={quickAdd} onClose={() => setQuickAdd(false)} />
      <FirstRunNotice />
    </HashRouter>
  );
}
