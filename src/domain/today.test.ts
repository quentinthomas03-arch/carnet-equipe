import { describe, expect, it } from 'vitest';
import { buildToday } from './today';
import { summarize } from './cadence';
import { collaborator, entry } from '../test/fixtures';

describe("écran Aujourd'hui", () => {
  it('regroupe retards, aujourd’hui, semaine et points à planifier', () => {
    const today = '2026-11-10';
    const entries = [
      entry({ id: 'late', type: 'myCommitment', dueDate: '2026-11-05' }),
      entry({ id: 'late2', type: 'theirCommitment', dueDate: '2026-11-01' }),
      entry({ id: 'now', type: 'topic', dueDate: today }),
      entry({ id: 'week', type: 'myCommitment', dueDate: '2026-11-14' }),
      entry({ id: 'far', type: 'myCommitment', dueDate: '2026-12-30' }),
      entry({ id: 'done', type: 'myCommitment', dueDate: '2026-11-01', status: 'done' }),
    ];
    const s = summarize(collaborator({ createdAt: '2026-09-01T00:00:00Z' }), entries, [], today);
    const v = buildToday(entries, [s], today);
    expect(v.late.map((e) => e.id)).toEqual(['late2', 'late']);
    expect(v.today.map((e) => e.id)).toEqual(['now']);
    expect(v.week.map((e) => e.id)).toEqual(['week']);
    expect(v.meetings).toHaveLength(1);
    expect(v.badge).toBe(4);
  });
});
