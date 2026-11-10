import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initSettings } from './db/settings';
import { requestPersistence } from './lib/storage';
import './index.css';

// Service worker : met l'appli en cache pour un fonctionnement 100 % hors ligne,
// et installe silencieusement les nouvelles versions publiées.
registerSW({ immediate: true });

// Demande au navigateur de ne pas effacer la base (voir lib/storage.ts).
void requestPersistence();
void initSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
