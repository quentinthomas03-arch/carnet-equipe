import { describe, expect, it } from 'vitest';
import { needsBackupReminder, backupAgeDays } from './backupReminder';

const now = new Date('2026-03-31T12:00:00Z');

describe('rappel de sauvegarde', () => {
  it('pas de rappel sans données', () => {
    expect(needsBackupReminder({ hasData: false, firstUseAt: '2025-01-01T00:00:00Z' }, now)).toBe(false);
  });
  it('pas de rappel si sauvegarde récente (30 jours pile)', () => {
    expect(needsBackupReminder({ hasData: true, lastBackupAt: '2026-03-01T12:00:00Z' }, now)).toBe(false);
  });
  it('rappel au-delà de 30 jours', () => {
    expect(needsBackupReminder({ hasData: true, lastBackupAt: '2026-02-28T12:00:00Z' }, now)).toBe(true);
  });
  it("sans sauvegarde : compte depuis la première utilisation", () => {
    expect(needsBackupReminder({ hasData: true, firstUseAt: '2026-03-20T00:00:00Z' }, now)).toBe(false);
    expect(needsBackupReminder({ hasData: true, firstUseAt: '2026-02-01T00:00:00Z' }, now)).toBe(true);
    expect(backupAgeDays({ hasData: true, firstUseAt: '2026-03-21T12:00:00Z' }, now)).toBe(10);
  });
});
