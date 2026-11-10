import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SETTING } from '../db/settings';
import { backupAgeDays, needsBackupReminder } from '../domain/backupReminder';

/** État de sauvegarde, recalculé automatiquement quand la base change. */
export function useBackupState() {
  return useLiveQuery(async () => {
    const [last, first, nCollab, nEntries] = await Promise.all([
      db.settings.get(SETTING.lastBackupAt),
      db.settings.get(SETTING.firstUseAt),
      db.collaborators.count(),
      db.entries.count(),
    ]);
    const state = {
      lastBackupAt: last?.value as string | undefined,
      firstUseAt: first?.value as string | undefined,
      hasData: nCollab + nEntries > 0,
    };
    return { ...state, ageDays: backupAgeDays(state), needsReminder: needsBackupReminder(state) };
  }, []);
}
