import { describe, expect, it } from 'vitest';
import { defaultObjectivePeriod, weightTotal } from './objectives';
import type { Objective } from '../db/types';

const o = (over: Partial<Objective>): Objective => ({
  id: 'o', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', title: 't', description: '', category: 'metier',
  scope: 'individual', status: 'inProgress', progress: 0, notes: [], ...over,
});

describe('objectifs', () => {
  it('période par défaut = année civile', () => {
    expect(defaultObjectivePeriod('2026-11-10')).toEqual({ startDate: '2026-01-01', dueDate: '2026-12-31' });
  });
  it('somme des pondérations (null si aucune)', () => {
    expect(weightTotal([o({})])).toBeNull();
    expect(weightTotal([o({ weight: 40 }), o({ weight: 30 }), o({})])).toBe(70);
  });
});
