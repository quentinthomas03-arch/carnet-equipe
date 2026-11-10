import { emptySnapshot, type Collaborator, type Entry, type Snapshot } from '../db/types';

const T0 = '2026-01-05T09:00:00.000Z';

export function collaborator(over: Partial<Collaborator> = {}): Collaborator {
  return {
    id: 'c1',
    createdAt: T0,
    updatedAt: T0,
    firstName: 'Camille',
    lastName: 'Roux',
    role: 'Technicienne',
    site: 'Metz',
    activity: 'VLEP & Co',
    cadenceDays: 30,
    color: 'teal',
    ...over,
  };
}

export function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    createdAt: T0,
    updatedAt: T0,
    collaboratorId: 'c1',
    type: 'topic',
    text: 'Planning de décembre — « accents » & caractères spéciaux 🎯',
    status: 'open',
    postponeCount: 0,
    ...over,
  };
}

/** Un jeu de données couvrant toutes les tables. */
export function richSnapshot(): Snapshot {
  const s = emptySnapshot();
  s.collaborators = [collaborator(), collaborator({ id: 'c2', firstName: 'Julien', color: 'orange', archivedAt: T0 })];
  s.entries = [
    entry(),
    entry({ id: 'e2', type: 'myCommitment', dueDate: '2026-02-01', text: 'Commander le détecteur' }),
    entry({ id: 'e3', collaboratorId: 'team', type: 'success', text: 'Audit COFRAC sans écart' }),
  ];
  s.meetings = [
    {
      id: 'm1', createdAt: T0, updatedAt: T0, collaboratorId: 'c1', kind: 'regular', date: '2026-01-10',
      status: 'done', decisions: 'RAS', note: '', workload: 'ok', coveredEntryIds: ['e1'], postponedEntryIds: [],
    },
  ];
  s.objectives = [
    {
      id: 'o1', createdAt: T0, updatedAt: T0, collaboratorId: 'c1', title: 'Autonomie VLEP', description: '',
      category: 'metier', scope: 'individual', status: 'inProgress', progress: 40, notes: [{ date: '2026-01-10', text: 'OK' }],
    },
  ];
  s.skills = [{ id: 's1', createdAt: T0, updatedAt: T0, collaboratorId: 'c1', name: 'Orientation client', current: 2, target: 3 }];
  s.developmentPlans = [
    {
      id: 'd1', createdAt: T0, updatedAt: T0, collaboratorId: 'c1', wishes: 'Devenir référente aération', mobility: '',
      trainings: [{ id: 't1', label: 'Aération', status: 'wished' }], actionPlan: [{ id: 'a1', label: 'Tutorat', done: false }],
    },
  ];
  s.onboardingTemplates = [
    { id: 'ot1', createdAt: T0, updatedAt: T0, name: 'Générique', isDefault: true, trialPeriodDays: 90, steps: [{ id: 'st1', phase: 'J0', label: 'Accueil', offsetDays: 0 }] },
  ];
  s.onboardings = [
    { id: 'on1', createdAt: T0, updatedAt: T0, collaboratorId: 'c1', arrivalDate: '2026-01-05', trialEndDate: '2026-04-05', tasks: [{ id: 'k1', phase: 'J0', label: 'Accueil', dueDate: '2026-01-05', done: true }] },
  ];
  s.objectiveTemplates = [{ id: 'tpl1', createdAt: T0, updatedAt: T0, title: 'Sécurité', description: '', category: 'securite', scope: 'individual' }];
  s.settings = [{ key: 'sites', value: ['Metz', 'Strasbourg'], updatedAt: T0 }];
  return s;
}
