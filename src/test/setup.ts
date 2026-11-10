// IndexedDB simulée pour les tests (Node n'en a pas).
import 'fake-indexeddb/auto';
(globalThis as Record<string, unknown>).__APP_VERSION__ = 'test';
