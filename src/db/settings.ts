import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** Clés de réglages connues. */
export const SETTING = {
  /** Horodatage du dernier export réussi. */
  lastBackupAt: 'lastBackupAt',
  /** Horodatage de la première ouverture de l'appli sur cet appareil. */
  firstUseAt: 'firstUseAt',
  /** Rappel « données sensibles » lu et accepté. */
  sensitiveNoticeAck: 'sensitiveNoticeAck',
  /** Dernier collaborateur / type utilisés dans la saisie rapide. */
  lastQuickAdd: 'lastQuickAdd',
  /** Listes modifiables. */
  sites: 'sites',
  activities: 'activities',
  /** Référentiel de compétences proposé sur chaque fiche. */
  skillCatalog: 'skillCatalog',
} as const;

/**
 * Réglages propres à CET appareil : ils ne sont ni exportés ni écrasés par un import.
 * (La date de dernière sauvegarde d'un téléphone n'a pas de sens sur un autre.)
 */
export const LOCAL_ONLY_SETTINGS: string[] = [
  SETTING.lastBackupAt,
  SETTING.firstUseAt,
  SETTING.sensitiveNoticeAck,
  SETTING.lastQuickAdd,
];

export const DEFAULT_SITES = ['Metz', 'Strasbourg'];
export const DEFAULT_ACTIVITIES = ['Bruit', 'VLEP & Co'];

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const s = await db.settings.get(key);
  return s?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: new Date().toISOString() });
}

/** Lecture réactive d'un réglage (l'écran se met à jour quand la valeur change). */
export function useSetting<T>(key: string, fallback: T): T {
  const v = useLiveQuery(() => db.settings.get(key), [key]);
  return (v?.value as T | undefined) ?? fallback;
}

/** À appeler au démarrage : initialise les réglages par défaut s'ils n'existent pas. */
export async function initSettings(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    if (!(await db.settings.get(SETTING.firstUseAt))) await setSetting(SETTING.firstUseAt, new Date().toISOString());
    if (!(await db.settings.get(SETTING.sites))) await setSetting(SETTING.sites, DEFAULT_SITES);
    if (!(await db.settings.get(SETTING.activities))) await setSetting(SETTING.activities, DEFAULT_ACTIVITIES);
  });
}
