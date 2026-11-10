import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initSettings } from './db/settings';
import { requestPersistence } from './lib/storage';
import './index.css';

// Service worker : met l'appli en cache pour un fonctionnement 100 % hors ligne,
// et installe silencieusement les nouvelles versions publiées (rechargement automatique).
// Sur iPhone, une appli installée est souvent « reprise » sans être relancée : on vérifie donc
// les mises à jour à chaque retour au premier plan, et toutes les heures.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 60 * 60 * 1000);
  },
});

// Demande au navigateur de ne pas effacer la base (voir lib/storage.ts).
void requestPersistence();
void initSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
