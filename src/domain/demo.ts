/**
 * Données d'exemple, pour essayer toutes les fonctions avant de saisir les vraies.
 * Tous les identifiants commencent par « demo- » : on peut les retirer proprement à tout moment.
 * Les noms sont fictifs.
 */
import { emptySnapshot, type Entry, type EntryType, type Meeting, type Snapshot } from '../db/types';
import { addDaysISO } from './dates';
import { genericTemplate, instantiateOnboarding } from './onboarding';

export const DEMO_PREFIX = 'demo-';
export const isDemoId = (id: string) => id.startsWith(DEMO_PREFIX);

export function demoSnapshot(today: DateISOLike): Snapshot {
  let n = 0;
  const id = () => `${DEMO_PREFIX}${++n}`;
  const at = (offset: number) => `${addDaysISO(today, offset)}T09:00:00.000Z`;
  const base = (offset: number) => ({ createdAt: at(offset), updatedAt: at(offset) });
  const s = emptySnapshot();

  const people = [
    { key: 'a', firstName: 'Camille', lastName: 'Exemple', role: 'Technicienne VLEP', site: 'Metz', activity: 'VLEP & Co', color: 'teal', arrival: -400 },
    { key: 'b', firstName: 'Julien', lastName: 'Exemple', role: 'Chargé d’études acoustique', site: 'Metz', activity: 'Bruit', color: 'orange', arrival: -900 },
    { key: 'c', firstName: 'Inès', lastName: 'Exemple', role: 'Technicienne Bruit', site: 'Strasbourg', activity: 'Bruit', color: 'violet', arrival: -200 },
    { key: 'd', firstName: 'Léo', lastName: 'Exemple', role: 'Technicien VLEP', site: 'Strasbourg', activity: 'VLEP & Co', color: 'blue', arrival: 5 },
  ];
  const cid: Record<string, string> = {};
  for (const p of people) {
    cid[p.key] = `${DEMO_PREFIX}c-${p.key}`;
    s.collaborators.push({
      id: cid[p.key], ...base(-60), firstName: p.firstName, lastName: p.lastName, role: p.role, site: p.site, activity: p.activity,
      arrivalDate: addDaysISO(today, p.arrival), cadenceDays: 30, color: p.color,
    });
  }

  const entry = (who: string, type: EntryType, text: string, created: number, extra: Partial<Entry> = {}) =>
    s.entries.push({ id: id(), ...base(created), collaboratorId: who === 'team' ? 'team' : cid[who], type, text, status: 'open', postponeCount: 0, ...extra });
  entry('a', 'topic', 'Planning des prélèvements du mois prochain', -5);
  entry('a', 'topic', 'Qualification aération : où en est le tutorat ?', -20, { postponeCount: 1 });
  entry('a', 'myCommitment', 'Commander un détecteur de remplacement', -12, { dueDate: addDaysISO(today, -3) });
  entry('a', 'theirCommitment', 'Finir le module e-learning amiante', -12, { dueDate: addDaysISO(today, 6) });
  entry('a', 'success', 'Rapport rendu en avance, client très satisfait', -8);
  entry('b', 'topic', 'Souhait de piloter les mesures de nuit', -3);
  entry('b', 'alert', 'Deux rapports en relecture depuis 10 jours', -4);
  entry('b', 'myCommitment', 'Valider sa demande de formation', -30, { dueDate: addDaysISO(today, -40), status: 'done', resolvedAt: at(-38) });
  entry('c', 'theirCommitment', 'Envoyer le planning des interventions', -2, { dueDate: addDaysISO(today, 1) });
  entry('c', 'success', 'Première mission en autonomie', -15);
  entry('team', 'success', 'Audit qualité sans écart', -25);

  const meeting = (who: string, offset: number, extra: Partial<Meeting> = {}) =>
    s.meetings.push({ id: id(), ...base(offset), collaboratorId: cid[who], kind: 'regular', date: addDaysISO(today, offset), status: 'done',
      decisions: '', note: '', coveredEntryIds: [], postponedEntryIds: [], ...extra });
  meeting('a', -40, { decisions: 'Camille prend en charge le planning des prélèvements', workload: 'ok' });
  meeting('b', -25, { decisions: 'Point sur la charge en fin de mois', workload: 'tense' });
  meeting('c', -12, { workload: 'ok' });

  const year = today.slice(0, 4);
  s.objectives.push({
    id: id(), ...base(-60), collaboratorId: cid.a, title: 'Autonomie sur les missions VLEP', description: 'Autonomie à 100 % sur une mission type\nQualification aération', category: 'metier',
    scope: 'individual', startDate: `${year}-01-01`, dueDate: `${year}-12-31`, status: 'inProgress', progress: 60, weight: 40,
    notes: [{ date: addDaysISO(today, -40), text: 'Mène seule les prélèvements simples' }],
  });
  s.objectives.push({
    id: id(), ...base(-60), collaboratorId: cid.b, title: 'Délais de rendu des rapports', description: '0 retard sur les rapports', category: 'qualite',
    scope: 'individual', startDate: `${year}-01-01`, dueDate: `${year}-12-31`, status: 'inProgress', progress: 40, notes: [],
  });
  s.skills.push({ id: id(), ...base(-60), collaboratorId: cid.a, name: 'Rigueur et qualité', current: 3, target: 3 });
  s.skills.push({ id: id(), ...base(-60), collaboratorId: cid.a, name: 'Prise d’initiative', current: 2, target: 3 });
  s.developmentPlans.push({ id: id(), ...base(-60), collaboratorId: cid.a, wishes: 'Devenir référente aération', mobility: '', trainings: [{ id: id(), label: 'Qualification aération', status: 'planned' }], actionPlan: [] });

  // Recrue qui arrive dans 5 jours, avec le parcours générique.
  const { onboarding, meetings } = instantiateOnboarding({ ...genericTemplate(), id: `${DEMO_PREFIX}tpl` }, cid.d, addDaysISO(today, 5), { onboarding: id(), newId: id }, at(-1));
  onboarding.tasks[0].done = true;
  s.onboardings.push({ ...onboarding, templateId: undefined });
  s.meetings.push(...meetings);
  return s;
}

type DateISOLike = string;
