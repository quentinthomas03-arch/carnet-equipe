import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { QuickAddProvider, useQuickAdd } from './components/QuickAdd';
import { FirstRunNotice } from './components/FirstRunNotice';
import { ToastProvider } from './ui/Toast';
import { TeamPage } from './pages/TeamPage';
import { TodayPage } from './pages/TodayPage';
import { CollaboratorPage } from './pages/CollaboratorPage';
import { TopicsPage } from './pages/TopicsPage';
import { CommitmentsPage } from './pages/CommitmentsPage';

/*
 * Écrans chargés à la demande : l'écran d'accueil démarre plus vite.
 * Tous restent disponibles hors ligne (le service worker les met en cache à l'installation).
 */
const ReviewsPage = lazy(() => import('./pages/ReviewsPages').then((m) => ({ default: m.ReviewsPage })));
const ReviewPage = lazy(() => import('./pages/ReviewsPages').then((m) => ({ default: m.ReviewPage })));
const TeamYearPage = lazy(() => import('./pages/ReviewsPages').then((m) => ({ default: m.TeamYearPage })));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })));
const PrepPage = lazy(() => import('./pages/PrepPage').then((m) => ({ default: m.PrepPage })));
const DebriefPage = lazy(() => import('./pages/DebriefPage').then((m) => ({ default: m.DebriefPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const ModelsPage = lazy(() => import('./pages/TemplatesPages').then((m) => ({ default: m.ModelsPage })));
const OnboardingTemplatesPage = lazy(() => import('./pages/TemplatesPages').then((m) => ({ default: m.OnboardingTemplatesPage })));

function Shell() {
  const quickAdd = useQuickAdd();
  const { pathname } = useLocation();
  // Depuis la fiche, le point ou le bilan d'un collaborateur, le « + » le présélectionne.
  const current =
    matchPath('/c/:id', pathname)?.params.id ??
    matchPath('/points/:id/*', pathname)?.params.id ??
    matchPath('/bilans/:id', pathname)?.params.id;
  const contextId = current && current !== 'equipe' ? current : undefined;
  return (
    <>
      <main className="min-h-dvh max-w-lg mx-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<TeamPage />} />
          <Route path="/aujourdhui" element={<TodayPage />} />
          <Route path="/points" element={<MeetingsPage />} />
          <Route path="/points/:id/preparer" element={<PrepPage />} />
          <Route path="/points/:id/debrief" element={<DebriefPage />} />
          <Route path="/bilans" element={<ReviewsPage />} />
          <Route path="/bilans/equipe" element={<TeamYearPage />} />
          <Route path="/bilans/:id" element={<ReviewPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/reglages/onboarding" element={<OnboardingTemplatesPage />} />
          <Route path="/reglages/modeles" element={<ModelsPage />} />
          <Route path="/c/:id" element={<CollaboratorPage />} />
          <Route path="/a-aborder" element={<TopicsPage />} />
          <Route path="/engagements" element={<CommitmentsPage />} />
          <Route path="*" element={<TeamPage />} />
          <Route path="/recherche" element={<SearchPage />} />
        </Routes>
        </Suspense>
      </main>
      <TabBar onQuickAdd={() => quickAdd(contextId ? { collaboratorId: contextId } : undefined)} />
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
