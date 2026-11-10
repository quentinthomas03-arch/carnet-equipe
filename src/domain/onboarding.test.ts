import { describe, expect, it } from 'vitest';
import { defaultTemplate, genericTemplate, groupByPhase, instantiateOnboarding, offsetLabel, onboardingProgress } from './onboarding';
import type { OnboardingTemplate } from '../db/types';

let n = 0;
const ids = () => ({ onboarding: 'ob1', newId: () => `id${n++}` });

describe('onboarding relatif à la date d’arrivée', () => {
  const tpl: OnboardingTemplate = {
    id: 't', createdAt: 'x', updatedAt: 'x', name: 'Test', isDefault: true, trialPeriodDays: 90,
    steps: [
      { id: 's3', phase: 'Premier mois', label: 'Point S+4', offsetDays: 28, createsMeeting: true },
      { id: 's1', phase: 'Préparation', label: 'Commander les EPI', offsetDays: -20, notes: 'tailles' },
      { id: 's2', phase: 'Jour 1', label: 'Welcome Day', offsetDays: 0 },
    ],
  };

  it('date chaque étape à partir de l’arrivée (y compris avant l’arrivée)', () => {
    const { onboarding } = instantiateOnboarding(tpl, 'c1', '2026-12-07', ids());
    expect(onboarding.tasks.map((t) => [t.label, t.dueDate])).toEqual([
      ['Commander les EPI', '2026-11-17'],
      ['Welcome Day', '2026-12-07'],
      ['Point S+4', '2027-01-04'],
    ]);
    expect(onboarding.tasks[0].note).toBe('tailles');
    expect(onboarding.trialEndDate).toBe('2027-03-07');
    expect(onboarding.collaboratorId).toBe('c1');
  });

  it('crée les points de suivi planifiés', () => {
    const { meetings } = instantiateOnboarding(tpl, 'c1', '2026-12-07', ids());
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({ kind: 'onboarding', status: 'planned', date: '2027-01-04', label: 'Point S+4', collaboratorId: 'c1' });
  });

  it('progression, retards, étape suivante et stade', () => {
    const { onboarding } = instantiateOnboarding(tpl, 'c1', '2026-12-07', ids());
    onboarding.tasks[0].done = true;
    const p = onboardingProgress(onboarding, '2026-12-10');
    expect(p).toMatchObject({ done: 1, total: 3, percent: 33, stage: 'Semaine 1' });
    expect(p.late.map((t) => t.label)).toEqual(['Welcome Day']);
    expect(p.next?.label).toBe('Welcome Day');
    expect(onboardingProgress(onboarding, '2026-12-01').stage).toBe('Arrivée dans 6 j');
    expect(onboardingProgress(onboarding, '2027-02-15').stage).toBe('Mois 3');
    expect(onboardingProgress(onboarding, '2027-03-01').trialDaysLeft).toBe(6);
  });

  it('regroupe par phase dans l’ordre chronologique', () => {
    const { onboarding } = instantiateOnboarding(tpl, 'c1', '2026-12-07', ids());
    expect(groupByPhase(onboarding.tasks).map((g) => g.phase)).toEqual(['Préparation', 'Jour 1', 'Premier mois']);
  });

  it('le modèle générique est complet et cohérent', () => {
    const g = genericTemplate();
    expect(g.steps.length).toBeGreaterThan(5);
    expect(g.steps.filter((s) => s.createsMeeting).map((s) => s.offsetDays)).toEqual([7, 30, 60]);
  });

  it('modèle par défaut : marqué par défaut, le plus récent', () => {
    const a = { ...tpl, id: 'a', isDefault: true, updatedAt: '2026-01-01' };
    const b = { ...tpl, id: 'b', isDefault: true, updatedAt: '2026-06-01' };
    const c = { ...tpl, id: 'c', isDefault: false, updatedAt: '2026-12-01' };
    expect(defaultTemplate([a, c, b])?.id).toBe('b');
  });

  it('libellés de décalage', () => {
    expect([offsetLabel(-20), offsetLabel(0), offsetLabel(28)]).toEqual(['J-20', 'J0', 'J+28']);
  });
});
