import { describe, expect, it } from 'vitest';
import { commitmentReport, compileReview, compileTeamYear, defaultPeriod, expectedMeetings, objectiveInPeriod, type ReviewSource } from './review';
import { claudeReviewPrompt, claudeTeamPrompt, collaboratorDocument, documentToMarkdown, teamDocument } from './reviewDoc';
import { collaborator, entry } from '../test/fixtures';
import type { Meeting, Objective } from '../db/types';

const P = { start: '2026-01-01', end: '2026-12-31' };
const T = (d: string) => `${d}T10:00:00.000Z`;
const meeting = (date: string, over: Partial<Meeting> = {}): Meeting => ({
  id: `m${date}`, createdAt: T(date), updatedAt: T(date), collaboratorId: 'c1', kind: 'regular', date, status: 'done',
  decisions: '', note: '', coveredEntryIds: [], postponedEntryIds: [], ...over,
});
const objective = (over: Partial<Objective>): Objective => ({
  id: 'o1', createdAt: T('2026-01-10'), updatedAt: 'x', collaboratorId: 'c1', title: 'Autonomie VLEP', description: 'Autonomie 100 %',
  category: 'metier', scope: 'individual', startDate: '2026-01-01', dueDate: '2026-12-31', status: 'inProgress', progress: 60, notes: [], ...over,
});
const empty: ReviewSource = { entries: [], meetings: [], objectives: [], skills: [], plans: [], onboardings: [] };

describe('période', () => {
  it('année précédente en janvier-mars, année en cours ensuite', () => {
    expect(defaultPeriod('2027-02-10')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(defaultPeriod('2026-11-10')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
  it('objectifs recoupant la période', () => {
    expect(objectiveInPeriod(objective({}), P)).toBe(true);
    expect(objectiveInPeriod(objective({ startDate: '2025-01-01', dueDate: '2025-12-31' }), P)).toBe(false);
    expect(objectiveInPeriod(objective({ startDate: undefined, dueDate: undefined, createdAt: T('2026-05-01') }), P)).toBe(true);
  });
});

describe('engagements tenus / non tenus', () => {
  const entries = [
    entry({ id: 'a', type: 'myCommitment', createdAt: T('2026-02-01'), dueDate: '2026-02-10', status: 'done', resolvedAt: T('2026-02-08') }),
    entry({ id: 'b', type: 'myCommitment', createdAt: T('2026-03-01'), dueDate: '2026-03-10', status: 'done', resolvedAt: T('2026-03-20') }),
    entry({ id: 'c', type: 'myCommitment', createdAt: T('2026-04-01'), dueDate: '2026-04-10' }),
    entry({ id: 'd', type: 'myCommitment', createdAt: T('2026-05-01'), status: 'dropped' }),
    entry({ id: 'e', type: 'myCommitment', createdAt: T('2026-11-01'), dueDate: '2026-12-15' }),
    entry({ id: 'f', type: 'myCommitment', createdAt: T('2025-03-01'), dueDate: '2025-04-01', status: 'done', resolvedAt: T('2025-04-01') }),
    entry({ id: 'g', type: 'theirCommitment', createdAt: T('2026-02-01') }),
  ];
  it('classe et calcule le taux de tenue', () => {
    const r = commitmentReport(entries, 'myCommitment', P, '2026-11-10');
    expect(r.kept.map((e) => e.id)).toEqual(['a', 'b']);
    expect(r.keptLate.map((e) => e.id)).toEqual(['b']);
    expect(r.notKept.map((e) => e.id)).toEqual(['c', 'd']);
    expect(r.open.map((e) => e.id)).toEqual(['e']);
    expect(r.rate).toBe(50);
  });
  it('aucun engagement évaluable → taux null', () => {
    expect(commitmentReport([], 'myCommitment', P, '2026-11-10').rate).toBeNull();
  });
});

describe('bilan d’un collaborateur', () => {
  const src: ReviewSource = {
    ...empty,
    entries: [
      entry({ id: 's1', type: 'success', text: 'Audit sans écart', createdAt: T('2026-03-01') }),
      entry({ id: 's0', type: 'success', text: 'Ancienne réussite', createdAt: T('2025-06-01') }),
      entry({ id: 'al', type: 'alert', text: 'Retards de rapports', createdAt: T('2026-04-01'), status: 'done' }),
      entry({ id: 't1', type: 'topic', text: 'Planning', status: 'done', resolvedAt: T('2026-05-01') }),
      entry({ id: 't2', type: 'topic', text: 'Qualification', createdAt: T('2026-06-01') }),
      entry({ id: 'x', collaboratorId: 'c2', type: 'success', createdAt: T('2026-03-01') }),
    ],
    meetings: [meeting('2026-03-05', { workload: 'ok', decisions: 'Passer en autonomie' }), meeting('2026-04-05', { workload: 'tense' }), meeting('2026-05-05', { status: 'planned' })],
    objectives: [objective({ notes: [{ date: '2026-06-01', text: 'Bonne progression' }], rating: 3, weight: 40 })],
    skills: [{ id: 'sk', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', name: 'Rigueur', current: 2, target: 3 }],
    plans: [{ id: 'p', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c1', wishes: 'Référente aération', mobility: 'Non', trainings: [{ id: 'tr', label: 'Aération', status: 'done', date: '2026-09-01' }], actionPlan: [] }],
  };
  const r = compileReview(collaborator(), src, P, '2026-11-10');

  it('ne garde que la période et le collaborateur', () => {
    expect(r.successes.map((e) => e.id)).toEqual(['s1']);
    expect(r.alerts.map((e) => e.id)).toEqual(['al']);
    expect(r.topicsCovered.map((e) => e.id)).toEqual(['t1']);
    expect(r.topicsPending.map((e) => e.id)).toEqual(['t2']);
    expect(r.meetings).toHaveLength(2);
    expect(r.workload).toEqual({ ok: 1, tense: 1, overloaded: 0 });
  });

  it('document : rubriques, faits datés, décisions, compétences, formations', () => {
    const md = documentToMarkdown(collaboratorDocument(r, { withLastName: false }));
    expect(md).toContain('# Bilan — Camille');
    expect(md).not.toContain('Roux');
    expect(md).toContain('Année 2026');
    expect(md).toContain('- Audit sans écart (1 mars 2026)');
    expect(md).toContain('Métier — Autonomie VLEP');
    expect(md).toContain('appréciation : Répond aux attentes');
    expect(md).toContain('Suivi 1 juin 2026 : Bonne progression');
    expect(md).toContain('Passer en autonomie');
    expect(md).toContain('Rigueur : En cours d’acquisition (visé : Acquis)');
    expect(md).toContain('Formation réalisée : Aération');
    expect(md).not.toContain('Ancienne réussite');
  });

  it('nom de famille seulement sur demande', () => {
    expect(collaboratorDocument(r, { withLastName: true }).title).toBe('Bilan — Camille Roux');
  });

  it('texte pour Claude : consigne, rubriques du formulaire, règles anti-invention, données', () => {
    const text = claudeReviewPrompt(collaboratorDocument(r, { withLastName: false }), 'Camille');
    expect(text).toContain("n'invente aucun fait");
    expect(text).toContain('Objectifs proposés pour l\'année suivante');
    expect(text).toContain('pondération totale de 100 %');
    expect(text).toContain('DONNÉES');
    expect(text).toContain('Audit sans écart');
  });
});

describe('année de l’équipe', () => {
  it('compte arrivées, points attendus/réalisés, réussites et progression', () => {
    const c1 = collaborator({ id: 'c1', createdAt: T('2025-01-01'), cadenceDays: 30 });
    const c2 = collaborator({ id: 'c2', firstName: 'Léa', arrivalDate: '2026-09-01', createdAt: T('2026-08-20'), cadenceDays: 30 });
    const old = collaborator({ id: 'c3', firstName: 'Ancien', createdAt: T('2024-01-01'), archivedAt: T('2025-06-01') });
    const src: ReviewSource = {
      ...empty,
      entries: [
        entry({ id: 'ts', collaboratorId: 'team', type: 'success', text: 'Budget atteint', createdAt: T('2026-10-01') }),
        entry({ id: 'is', collaboratorId: 'c2', type: 'success', text: 'Premier rapport', createdAt: T('2026-10-05') }),
      ],
      meetings: [meeting('2026-03-01'), { ...meeting('2026-10-01'), collaboratorId: 'c2', id: 'm2' }],
      onboardings: [{ id: 'o', createdAt: 'x', updatedAt: 'x', collaboratorId: 'c2', arrivalDate: '2026-09-01', trialEndDate: '2026-11-30', tasks: [], completedAt: T('2026-11-05') }],
    };
    const t = compileTeamYear([c1, c2, old], src, P, '2026-12-31');
    expect(t.members.map((m) => m.collaborator.id).sort()).toEqual(['c1', 'c2']);
    expect(t.arrivals.map((c) => c.id)).toEqual(['c2']);
    expect(t.onboardingsCompleted).toBe(1);
    expect(t.teamSuccesses.map((e) => e.id)).toEqual(['ts']);
    expect(t.individualSuccesses.map((e) => e.id)).toEqual(['is']);
    expect(t.meetingsDone).toBe(2);
    expect(expectedMeetings(c1, P, '2026-12-31')).toBe(12);
    expect(expectedMeetings(c2, P, '2026-12-31')).toBe(4);
    const text = claudeTeamPrompt(teamDocument(t, { withLastName: false }));
    expect(text).toContain('chef de groupe');
    expect(text).toContain('Budget atteint');
    expect(text).toContain('Léa : Premier rapport');
    expect(text).toContain('sur 16 attendus');
  });
});
