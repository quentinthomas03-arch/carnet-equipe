import { describe, expect, it } from 'vitest';
import { buildPrep, meetingSummary, planDebrief, prepEntries } from './meetingPrep';
import { collaborator, entry } from '../test/fixtures';
import type { Meeting, Objective } from '../db/types';

const meeting = (over: Partial<Meeting> = {}): Meeting => ({
  id: 'm1', createdAt: '2026-10-01T10:00:00Z', updatedAt: 'x', collaboratorId: 'c1', kind: 'regular', date: '2026-10-01',
  status: 'done', decisions: '', note: '', coveredEntryIds: [], postponedEntryIds: [], ...over,
});
const objective = (over: Partial<Objective> = {}): Objective => ({
  id: 'o1', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', title: 'Autonomie', description: '', category: 'metier',
  scope: 'individual', status: 'inProgress', progress: 50, notes: [], ...over,
});

describe('préparer le point', () => {
  const entries = [
    entry({ id: 't1', type: 'topic' }),
    entry({ id: 't2', type: 'topic', postponeCount: 1 }),
    entry({ id: 't3', type: 'topic', status: 'done' }),
    entry({ id: 'm1', type: 'myCommitment', dueDate: '2026-12-01' }),
    entry({ id: 'm2', type: 'myCommitment', dueDate: '2026-11-01' }),
    entry({ id: 'h1', type: 'theirCommitment' }),
    entry({ id: 's1', type: 'success' }),
    entry({ id: 'a1', type: 'alert' }),
    entry({ id: 'x1', collaboratorId: 'c2', type: 'topic' }),
  ];

  it('sépare les sujets restés en suspens la dernière fois', () => {
    const p = buildPrep(collaborator(), entries, [meeting({ postponedEntryIds: ['t2'] })], []);
    expect(p.leftOver.map((e) => e.id)).toEqual(['t2']);
    expect(p.topics.map((e) => e.id)).toEqual(['t1']);
  });

  it('trie les engagements par échéance et ignore les autres collaborateurs', () => {
    const p = buildPrep(collaborator(), entries, [], []);
    expect(p.myCommitments.map((e) => e.id)).toEqual(['m2', 'm1']);
    expect(p.theirCommitments.map((e) => e.id)).toEqual(['h1']);
    expect(p.successes).toHaveLength(1);
    expect(p.alerts).toHaveLength(1);
    expect(prepEntries(p).some((e) => e.id === 'x1')).toBe(false);
  });

  it('prend le point le plus récent comme « dernier point »', () => {
    const p = buildPrep(collaborator(), [], [meeting({ id: 'a', date: '2026-09-01' }), meeting({ id: 'b', date: '2026-10-15' })], []);
    expect(p.lastMeeting?.id).toBe('b');
  });

  it('ne montre que les objectifs en cours', () => {
    const p = buildPrep(collaborator(), [], [], [objective(), objective({ id: 'o2', status: 'achieved' }), objective({ id: 'o3', collaboratorId: 'c2' })]);
    expect(p.objectives.map((o) => o.id)).toEqual(['o1']);
  });
});

describe('débriefer le point', () => {
  it('coché → traité ; sujet non coché → reporté ; engagement non coché → inchangé', () => {
    const presented = [
      entry({ id: 't1', type: 'topic' }),
      entry({ id: 't2', type: 'topic' }),
      entry({ id: 'm1', type: 'myCommitment' }),
      entry({ id: 'm2', type: 'myCommitment' }),
      entry({ id: 's1', type: 'success' }),
    ];
    const plan = planDebrief({ presented, checkedIds: ['t1', 'm1', 's1'] });
    expect(plan.resolve).toEqual(['t1', 'm1', 's1']);
    expect(plan.postpone).toEqual(['t2']);
  });

  it('résumé lisible pour l’historique', () => {
    expect(meetingSummary(meeting({ decisions: '\nPasser en autonomie sur Aération\nAutre', coveredEntryIds: ['a', 'b'], postponedEntryIds: ['c'] })))
      .toBe('Passer en autonomie sur Aération · 2 traités, 1 reporté');
  });
});
