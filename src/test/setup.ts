// IndexedDB simulée pour les tests (Node n'en a pas).
import 'fake-indexeddb/auto';
(globalThis as Record<string, unknown>).__APP_VERSION__ = 'test';
(globalThis as Record<string, unknown>).__BUILD_DATE__ = '2026-01-01T00:00:00Z';
