import { describe, expect, it } from 'vitest';
import { commitmentStatus, daysLate, dueShortcuts, dueState } from './entries';
import { entry } from '../test/fixtures';

describe('échéances', () => {
  const today = '2026-11-10';
  it('classe les échéances', () => {
    expect(dueState(entry({ dueDate: '2026-11-09' }), today)).toBe('late');
    expect(dueState(entry({ dueDate: '2026-11-10' }), today)).toBe('today');
    expect(dueState(entry({ dueDate: '2026-11-17' }), today)).toBe('soon');
    expect(dueState(entry({ dueDate: '2026-11-18' }), today)).toBe('later');
    expect(dueState(entry({}), today)).toBe('none');
  });
  it('une entrée traitée n’est jamais en retard', () => {
    expect(dueState(entry({ dueDate: '2026-01-01', status: 'done' }), today)).toBe('none');
    expect(commitmentStatus(entry({ dueDate: '2026-01-01', status: 'done' }), today)).toBe('done');
  });
  it('statut des engagements', () => {
    expect(commitmentStatus(entry({ dueDate: '2026-11-01' }), today)).toBe('late');
    expect(commitmentStatus(entry({ dueDate: '2026-12-01' }), today)).toBe('todo');
    expect(commitmentStatus(entry({ status: 'dropped' }), today)).toBe('dropped');
    expect(daysLate(entry({ dueDate: '2026-11-01' }), today)).toBe(9);
  });
  it('raccourcis d’échéance (mardi 10 novembre)', () => {
    const s = Object.fromEntries(dueShortcuts(today).map((x) => [x.label, x.date]));
    expect(s).toEqual({ Demain: '2026-11-11', Vendredi: '2026-11-13', '1 semaine': '2026-11-17', 'Fin du mois': '2026-11-30' });
  });
  it('un vendredi, « Vendredi » = la semaine suivante', () => {
    expect(dueShortcuts('2026-11-13').find((x) => x.label === 'Vendredi')!.date).toBe('2026-11-20');
  });
});
