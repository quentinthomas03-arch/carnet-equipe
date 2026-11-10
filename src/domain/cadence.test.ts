import { describe, expect, it } from 'vitest';
import { meetingSchedule, summarize, sortByPriority, lastMeetingDate } from './cadence';
import { collaborator, entry } from '../test/fixtures';
import type { Meeting } from '../db/types';

const meeting = (date: string, status: 'done' | 'planned' = 'done', id = date): Meeting => ({
  id, createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', kind: 'regular', date, status,
  decisions: '', note: '', coveredEntryIds: [], postponedEntryIds: [],
});

describe('rythme des points', () => {
  it('prochain point = dernier point + rythme', () => {
    const s = meetingSchedule(collaborator({ cadenceDays: 30 }), [meeting('2026-10-02'), meeting('2026-09-01')], '2026-11-10');
    expect(s.last).toBe('2026-10-02');
    expect(s.next).toBe('2026-11-01');
    expect(s.suggested).toBe(true);
    expect(s.overdue).toBe(true);
    expect(s.daysUntil).toBe(-9);
  });

  it('ignore les points seulement planifiés pour le « dernier point »', () => {
    expect(lastMeetingDate([meeting('2026-10-02'), meeting('2026-12-01', 'planned')])).toBe('2026-10-02');
  });

  it('sans point : part de la date d’arrivée, sinon de la création de la fiche', () => {
    expect(meetingSchedule(collaborator({ arrivalDate: '2026-11-02', cadenceDays: 14 }), [], '2026-11-10').next).toBe('2026-11-16');
    expect(meetingSchedule(collaborator({ createdAt: '2026-11-05T10:00:00Z', cadenceDays: 30 }), [], '2026-11-10').next).toBe('2026-12-05');
  });

  it('respecte la date validée par le manager', () => {
    const s = meetingSchedule(collaborator({ nextMeetingDate: '2026-11-20' }), [meeting('2026-10-02')], '2026-11-10');
    expect(s.next).toBe('2026-11-20');
    expect(s.suggested).toBe(false);
    expect(s.overdue).toBe(false);
  });

  it('ignore une date validée devenue obsolète (antérieure au dernier point)', () => {
    const s = meetingSchedule(collaborator({ nextMeetingDate: '2026-10-01', cadenceDays: 30 }), [meeting('2026-10-05')], '2026-10-10');
    expect(s.next).toBe('2026-11-04');
    expect(s.suggested).toBe(true);
  });

  it('gère les fins de mois et années bissextiles', () => {
    expect(meetingSchedule(collaborator({ cadenceDays: 30 }), [meeting('2028-01-31')], '2028-02-01').next).toBe('2028-03-01');
  });
});

describe('résumé et tri', () => {
  const entries = [
    entry({ id: 'a', type: 'topic' }),
    entry({ id: 'b', type: 'topic', status: 'done' }),
    entry({ id: 'c', type: 'myCommitment', dueDate: '2026-11-01' }),
    entry({ id: 'd', type: 'theirCommitment', dueDate: '2026-12-01' }),
    entry({ id: 'e', collaboratorId: 'c2', type: 'topic' }),
  ];

  it('compte les éléments en attente et les retards', () => {
    const s = summarize(collaborator(), entries, [], '2026-11-10');
    expect(s).toMatchObject({ topics: 1, myOpen: 1, myLate: 1, theirOpen: 1, theirLate: 0 });
  });

  it('fait remonter le collaborateur en retard de point', () => {
    const late = summarize(collaborator({ id: 'c1', firstName: 'Zoé' }), [], [meeting('2026-09-01')], '2026-11-10');
    const fine = summarize(collaborator({ id: 'c2', firstName: 'Anna' }), [], [{ ...meeting('2026-11-05'), collaboratorId: 'c2' }], '2026-11-10');
    expect(sortByPriority([fine, late]).map((s) => s.collaborator.firstName)).toEqual(['Zoé', 'Anna']);
  });

  it('mes engagements en retard pèsent plus que les sujets', () => {
    const recent = [{ ...meeting('2026-11-05'), collaboratorId: 'c1' }, { ...meeting('2026-11-05', 'done', 'm2'), collaboratorId: 'c2' }];
    const a = summarize(collaborator({ id: 'c1', firstName: 'A' }), [entry({ collaboratorId: 'c1', type: 'myCommitment', dueDate: '2026-11-01' })], recent, '2026-11-10');
    const b = summarize(collaborator({ id: 'c2', firstName: 'B' }), [entry({ id: 't1', collaboratorId: 'c2' }), entry({ id: 't2', collaboratorId: 'c2' })], recent, '2026-11-10');
    expect(sortByPriority([b, a])[0].collaborator.firstName).toBe('A');
  });
});
