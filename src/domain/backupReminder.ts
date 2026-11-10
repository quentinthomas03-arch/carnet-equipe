/**
 * Rappel de sauvegarde mensuel.
 * Référence = date de la dernière sauvegarde, ou à défaut date de première utilisation
 * (pour ne pas réclamer un export le jour même de l'installation).
 */
export const BACKUP_REMINDER_DAYS = 30;

export interface BackupState {
  lastBackupAt?: string;
  firstUseAt?: string;
  /** Faux si la base est vide : rien à sauvegarder, pas de rappel. */
  hasData: boolean;
}

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

export function backupAgeDays(state: BackupState, now = new Date()): number | null {
  const ref = state.lastBackupAt ?? state.firstUseAt;
  return ref ? daysSince(ref, now) : null;
}

export function needsBackupReminder(state: BackupState, now = new Date()): boolean {
  if (!state.hasData) return false;
  const age = backupAgeDays(state, now);
  return age === null || age > BACKUP_REMINDER_DAYS;
}
