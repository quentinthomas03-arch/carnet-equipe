import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SETTING } from '../db/settings';
import { backupAgeDays, needsBackupReminder } from '../domain/backupReminder';
import { isDemoId } from '../domain/demo';

/** État de sauvegarde, recalculé automatiquement quand la base change. */
export function useBackupState() {
  return useLiveQuery(async () => {
    const [last, first] = await Promise.all([db.settings.get(SETTING.lastBackupAt), db.settings.get(SETTING.firstUseAt)]);
    const lastBackupAt = last?.value as string | undefined;
    const since = lastBackupAt ?? '';
    // Données réelles uniquement : les données d'exemple ne déclenchent pas de rappel.
    const real = (r: { id: string; collaboratorId?: string }) => !isDemoId(r.id) && !(r.collaboratorId && isDemoId(r.collaboratorId));
    const tables = [db.collaborators, db.entries, db.meetings, db.objectives, db.onboardings] as const;
    const counts = await Promise.all(tables.map((t) => (t as typeof db.entries).filter((r) => real(r) && r.updatedAt > since).count()));
    const total = await Promise.all([db.collaborators.filter(real).count(), db.entries.filter(real).count()]);
    const state = {
      lastBackupAt,
      firstUseAt: first?.value as string | undefined,
      hasData: total[0] + total[1] > 0,
      changesSinceBackup: lastBackupAt ? counts.reduce((a, b) => a + b, 0) : 0,
    };
    return { ...state, ageDays: backupAgeDays(state), needsReminder: needsBackupReminder(state) };
  }, []);
}
