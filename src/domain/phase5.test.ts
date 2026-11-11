import { describe, expect, it } from 'vitest';
import { toWeekday } from './dates';
import { needsBackupReminder } from './backupReminder';
import { matches, search } from './search';
import { campaignProgress, campaignStatus, setCampaignStatus } from './campaign';
import { demoSnapshot, isDemoId } from './demo';
import { meetingSchedule } from './cadence';
import { collaborator, entry } from '../test/fixtures';

describe('jours ouvrés', () => {
  it('décale samedi et dimanche au lundi', () => {
    expect(toWeekday('2026-11-14')).toBe('2026-11-16');
    expect(toWeekday('2026-11-15')).toBe('2026-11-16');
    expect(toWeekday('2026-11-16')).toBe('2026-11-16');
  });
  it('la date suggérée du prochain point ne tombe jamais un week-end, la date validée est respectée', () => {
    // 2026-10-02 + 30 j = dimanche 1er novembre → lundi 2
    const m = { id: 'm', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', kind: 'regular' as const, date: '2026-10-02', status: 'done' as const, decisions: '', note: '', coveredEntryIds: [], postponedEntryIds: [] };
    expect(meetingSchedule(collaborator(), [m], '2026-10-10').next).toBe('2026-11-02');
    expect(meetingSchedule(collaborator({ nextMeetingDate: '2026-11-14' }), [m], '2026-10-10').next).toBe('2026-11-14');
  });
});

describe('rappel de sauvegarde après modifications', () => {
  it('se déclenche à 50 modifications même si la sauvegarde est récente', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(needsBackupReminder({ hasData: true, lastBackupAt: '2026-11-09T12:00:00Z', changesSinceBackup: 49 }, now)).toBe(false);
    expect(needsBackupReminder({ hasData: true, lastBackupAt: '2026-11-09T12:00:00Z', changesSinceBackup: 50 }, now)).toBe(true);
  });
});

describe('recherche', () => {
  it('insensible aux accents, à la casse et à l’ordre des mots', () => {
    expect(matches('Qualification aération', 'AERATION qualif')).toBe(true);
    expect(matches('Planning', '')).toBe(false);
  });
  it('cherche dans les collaborateurs, entrées, décisions et objectifs', () => {
    const r = search('relecture', {
      collaborators: [collaborator()],
      entries: [entry({ text: 'Rapports en relecture' }), entry({ id: 'e2', text: 'Autre' })],
      meetings: [{ id: 'm', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', kind: 'regular', date: '2026-01-01', status: 'done', decisions: 'Relecture croisée', note: '', coveredEntryIds: [], postponedEntryIds: [] }],
      objectives: [],
    });
    expect(r.total).toBe(2);
    expect(search('metz', { collaborators: [collaborator()], entries: [], meetings: [], objectives: [] }).collaborators).toHaveLength(1);
  });
});

describe('campagne d’entretiens', () => {
  it('statut par année et avancement', () => {
    let c = setCampaignStatus(undefined, '2026', 'a', 'done');
    c = setCampaignStatus(c, '2026', 'b', 'ready');
    c = setCampaignStatus(c, '2025', 'b', 'signed');
    expect(campaignStatus(c, '2026', 'b')).toBe('ready');
    expect(campaignStatus(c, '2026', 'z')).toBe('todo');
    expect(campaignProgress(c, '2026', ['a', 'b', 'z'])).toEqual({ done: 1, total: 3 });
  });
});

describe('données d’exemple', () => {
  it('cohérentes et toutes repérables', () => {
    const s = demoSnapshot('2026-11-10');
    expect(s.collaborators).toHaveLength(4);
    const ids = new Set(s.collaborators.map((c) => c.id));
    for (const e of s.entries) expect(e.collaboratorId === 'team' || ids.has(e.collaboratorId)).toBe(true);
    for (const t of ['collaborators', 'entries', 'meetings', 'objectives', 'skills', 'developmentPlans', 'onboardings'] as const) {
      for (const r of s[t]) expect(isDemoId(r.id)).toBe(true);
    }
    expect(s.meetings.some((m) => m.status === 'planned')).toBe(true);
  });
});
