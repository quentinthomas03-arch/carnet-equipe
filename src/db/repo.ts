/**
 * Opérations d'écriture sur la base. Toutes mettent à jour `updatedAt`
 * (indispensable pour la fusion lors d'un import).
 */
import { db as defaultDb, type CarnetDB } from './db';
import type {
  ActionStep, Collaborator, DateISO, DevelopmentPlan, Entry, EntryType, Meeting, Objective, ObjectiveTemplate,
  Onboarding, OnboardingTask, OnboardingTemplate, Skill, Training,
} from './types';
import { DEFAULT_TEMPLATE_ID, genericTemplate, instantiateOnboarding } from '../domain/onboarding';
import { planDebrief, type DebriefInput } from '../domain/meetingPrep';

export const newId = (): string => crypto.randomUUID();
const now = () => new Date().toISOString();

// --- Collaborateurs --------------------------------------------------------

export type CollaboratorInput = Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;

export async function createCollaborator(input: CollaboratorInput, d: CarnetDB = defaultDb): Promise<string> {
  const id = newId();
  const t = now();
  await d.collaborators.add({ ...input, id, createdAt: t, updatedAt: t });
  return id;
}

export async function updateCollaborator(id: string, patch: Partial<CollaboratorInput>, d: CarnetDB = defaultDb) {
  await d.collaborators.update(id, { ...patch, updatedAt: now() });
}

export async function setArchived(id: string, archived: boolean, d: CarnetDB = defaultDb) {
  const c = await d.collaborators.get(id);
  if (!c) return;
  const { archivedAt: _ignored, ...rest } = c;
  await d.collaborators.put(archived ? { ...c, archivedAt: now(), updatedAt: now() } : { ...rest, updatedAt: now() });
}

// --- Entrées ---------------------------------------------------------------

export interface QuickEntryInput {
  /** Un ou plusieurs collaborateurs (ou TEAM_ID) : une copie indépendante par destinataire. */
  collaboratorIds: string[];
  type: EntryType;
  text: string;
  dueDate?: DateISO;
}

export async function createEntries(input: QuickEntryInput, d: CarnetDB = defaultDb): Promise<string[]> {
  const t = now();
  const text = input.text.trim();
  if (!text) throw new Error('Texte vide');
  const rows: Entry[] = input.collaboratorIds.map((collaboratorId) => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    collaboratorId,
    type: input.type,
    text,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    status: 'open',
    postponeCount: 0,
  }));
  await d.entries.bulkAdd(rows);
  return rows.map((r) => r.id);
}

export async function updateEntry(id: string, patch: Partial<Pick<Entry, 'text' | 'type' | 'dueDate' | 'collaboratorId'>>, d: CarnetDB = defaultDb) {
  const e = await d.entries.get(id);
  if (!e) return;
  const next: Entry = { ...e, ...patch, updatedAt: now() };
  if (!patch.dueDate && 'dueDate' in patch) delete next.dueDate;
  await d.entries.put(next);
}

/** Marque traité (abordé / fait / noté). */
export async function resolveEntry(id: string, d: CarnetDB = defaultDb) {
  await d.entries.update(id, { status: 'done', resolvedAt: now(), updatedAt: now() });
}

/** Rouvre une entrée traitée par erreur. */
export async function reopenEntry(id: string, d: CarnetDB = defaultDb) {
  const e = await d.entries.get(id);
  if (!e) return;
  const { resolvedAt: _r, ...rest } = e;
  await d.entries.put({ ...rest, status: 'open', updatedAt: now() });
}

/** Reporte un sujet : il reste en attente, le compteur de reports augmente. */
export async function postponeEntry(id: string, d: CarnetDB = defaultDb) {
  const e = await d.entries.get(id);
  if (!e) return;
  await d.entries.put({ ...e, status: 'open', postponeCount: e.postponeCount + 1, updatedAt: now() });
}

/** Abandonne un engagement (ni fait, ni en retard : il ne compte plus). */
export async function dropEntry(id: string, d: CarnetDB = defaultDb) {
  await d.entries.update(id, { status: 'dropped', resolvedAt: now(), updatedAt: now() });
}

export async function deleteEntry(id: string, d: CarnetDB = defaultDb) {
  await d.entries.delete(id);
}

// --- Points individuels ----------------------------------------------------


/**
 * Enregistre un point effectué, en une seule transaction :
 * crée le point, archive les éléments cochés, reporte les sujets non abordés,
 * crée les nouveaux engagements et fixe la date du prochain point.
 */
export async function saveDebrief(input: DebriefInput, d: CarnetDB = defaultDb): Promise<string> {
  const plan = planDebrief(input);
  const t = now();
  const meetingId = newId();
  let resultId = meetingId;
  await d.transaction('rw', d.meetings, d.entries, d.collaborators, async () => {
    const planned = input.plannedMeetingId ? await d.meetings.get(input.plannedMeetingId) : undefined;
    const meeting: Meeting = {
      id: planned?.id ?? meetingId,
      createdAt: planned?.createdAt ?? t,
      updatedAt: t,
      collaboratorId: input.collaboratorId,
      kind: planned?.kind ?? 'regular',
      ...(planned?.label ? { label: planned.label } : {}),
      date: input.date,
      status: 'done',
      decisions: input.decisions.trim(),
      note: input.note.trim(),
      ...(input.workload ? { workload: input.workload } : {}),
      coveredEntryIds: plan.resolve,
      postponedEntryIds: plan.postpone,
    };
    await d.meetings.put(meeting);
    const mid = meeting.id;
    for (const id of plan.resolve) await d.entries.update(id, { status: 'done', resolvedAt: t, meetingId: mid, updatedAt: t });
    for (const id of plan.postpone) {
      const e = await d.entries.get(id);
      if (e) await d.entries.put({ ...e, status: 'open', postponeCount: e.postponeCount + 1, updatedAt: t });
    }
    const fresh = input.newCommitments.filter((c) => c.text.trim());
    await d.entries.bulkAdd(
      fresh.map((c) => ({
        id: newId(), createdAt: t, updatedAt: t, collaboratorId: input.collaboratorId, type: c.type, text: c.text.trim(),
        ...(c.dueDate ? { dueDate: c.dueDate } : {}), status: 'open' as const, postponeCount: 0, meetingId: mid,
      })),
    );
    const col = await d.collaborators.get(input.collaboratorId);
    if (col) {
      const { nextMeetingDate: _n, ...rest } = col;
      await d.collaborators.put(input.nextMeetingDate ? { ...rest, nextMeetingDate: input.nextMeetingDate, updatedAt: t } : { ...rest, updatedAt: t });
    }
    resultId = mid;
  });
  return resultId;
}

export async function updateMeeting(id: string, patch: Partial<Pick<Meeting, 'date' | 'decisions' | 'note' | 'workload'>>, d: CarnetDB = defaultDb) {
  await d.meetings.update(id, { ...patch, updatedAt: now() });
}

/** Supprime un point de l'historique (les entrées traitées restent traitées). */
export async function deleteMeeting(id: string, d: CarnetDB = defaultDb) {
  await d.meetings.delete(id);
}

// --- Objectifs ---------------------------------------------------------------

export type ObjectiveInput = Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveObjective(input: ObjectiveInput, id?: string, d: CarnetDB = defaultDb): Promise<string> {
  const t = now();
  if (id) {
    const cur = await d.objectives.get(id);
    await d.objectives.put({ ...input, id, createdAt: cur?.createdAt ?? t, updatedAt: t });
    return id;
  }
  const nid = newId();
  await d.objectives.add({ ...input, id: nid, createdAt: t, updatedAt: t });
  return nid;
}

export async function deleteObjective(id: string, d: CarnetDB = defaultDb) {
  await d.objectives.delete(id);
}

export async function saveObjectiveTemplate(input: Omit<ObjectiveTemplate, 'id' | 'createdAt' | 'updatedAt'>, d: CarnetDB = defaultDb) {
  const t = now();
  await d.objectiveTemplates.add({ ...input, id: newId(), createdAt: t, updatedAt: t });
}

export async function deleteObjectiveTemplate(id: string, d: CarnetDB = defaultDb) {
  await d.objectiveTemplates.delete(id);
}

// --- Compétences -------------------------------------------------------------

export async function addSkills(collaboratorId: string, names: string[], d: CarnetDB = defaultDb) {
  const t = now();
  const existing = new Set((await d.skills.where('collaboratorId').equals(collaboratorId).toArray()).map((s) => s.name.toLowerCase()));
  const fresh: Skill[] = names
    .map((n) => n.trim())
    .filter((n) => n && !existing.has(n.toLowerCase()))
    .map((name) => ({ id: newId(), createdAt: t, updatedAt: t, collaboratorId, name, current: 0, target: 0 }));
  await d.skills.bulkAdd(fresh);
}

export async function updateSkill(id: string, patch: Partial<Pick<Skill, 'name' | 'current' | 'target'>>, d: CarnetDB = defaultDb) {
  await d.skills.update(id, { ...patch, updatedAt: now() });
}

export async function deleteSkill(id: string, d: CarnetDB = defaultDb) {
  await d.skills.delete(id);
}

// --- Évolution ---------------------------------------------------------------

export async function saveDevelopmentPlan(
  collaboratorId: string,
  patch: Partial<{ wishes: string; mobility: string; trainings: Training[]; actionPlan: ActionStep[] }>,
  d: CarnetDB = defaultDb,
) {
  const t = now();
  const cur = await d.developmentPlans.where('collaboratorId').equals(collaboratorId).first();
  const base: DevelopmentPlan = cur ?? { id: newId(), createdAt: t, updatedAt: t, collaboratorId, wishes: '', mobility: '', trainings: [], actionPlan: [] };
  await d.developmentPlans.put({ ...base, ...patch, updatedAt: t });
}

// --- Onboarding ----------------------------------------------------------------

/** Installe le modèle générique s'il n'existe aucun modèle. */
export async function ensureOnboardingTemplate(d: CarnetDB = defaultDb) {
  if ((await d.onboardingTemplates.count()) === 0) await d.onboardingTemplates.put(genericTemplate());
}

export async function saveOnboardingTemplate(tpl: OnboardingTemplate, d: CarnetDB = defaultDb) {
  await d.transaction('rw', d.onboardingTemplates, async () => {
    if (tpl.isDefault) {
      for (const other of await d.onboardingTemplates.toArray()) {
        if (other.id !== tpl.id && other.isDefault) await d.onboardingTemplates.put({ ...other, isDefault: false, updatedAt: now() });
      }
    }
    await d.onboardingTemplates.put({ ...tpl, updatedAt: now() });
  });
}

export async function deleteOnboardingTemplate(id: string, d: CarnetDB = defaultDb) {
  if (id === DEFAULT_TEMPLATE_ID && (await d.onboardingTemplates.count()) === 1) return;
  await d.onboardingTemplates.delete(id);
}

/** Démarre le parcours d'une recrue : tâches datées + points de suivi planifiés. */
export async function startOnboarding(collaboratorId: string, templateId: string, arrivalDate: DateISO, d: CarnetDB = defaultDb): Promise<string> {
  const tpl = await d.onboardingTemplates.get(templateId);
  if (!tpl) throw new Error('Modèle introuvable');
  const { onboarding, meetings } = instantiateOnboarding(tpl, collaboratorId, arrivalDate, { onboarding: newId(), newId });
  await d.transaction('rw', d.onboardings, d.meetings, d.collaborators, async () => {
    await d.onboardings.add(onboarding);
    await d.meetings.bulkAdd(meetings);
    const c = await d.collaborators.get(collaboratorId);
    if (c && c.arrivalDate !== arrivalDate) await d.collaborators.put({ ...c, arrivalDate, updatedAt: now() });
  });
  return onboarding.id;
}

async function patchOnboarding(id: string, fn: (o: Onboarding) => Onboarding, d: CarnetDB) {
  await d.transaction('rw', d.onboardings, async () => {
    const o = await d.onboardings.get(id);
    if (o) await d.onboardings.put({ ...fn(o), updatedAt: now() });
  });
}

export async function toggleOnboardingTask(id: string, taskId: string, d: CarnetDB = defaultDb) {
  await patchOnboarding(id, (o) => ({
    ...o,
    tasks: o.tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (t.done) {
        const { doneAt: _d, ...rest } = t;
        return { ...rest, done: false };
      }
      return { ...t, done: true, doneAt: now() };
    }),
  }), d);
}

export async function saveOnboardingTask(id: string, task: OnboardingTask, d: CarnetDB = defaultDb) {
  await patchOnboarding(id, (o) => ({
    ...o,
    tasks: o.tasks.some((t) => t.id === task.id) ? o.tasks.map((t) => (t.id === task.id ? task : t)) : [...o.tasks, task],
  }), d);
}

export async function deleteOnboardingTask(id: string, taskId: string, d: CarnetDB = defaultDb) {
  await patchOnboarding(id, (o) => ({ ...o, tasks: o.tasks.filter((t) => t.id !== taskId) }), d);
}

export async function updateOnboarding(id: string, patch: Partial<Pick<Onboarding, 'trialEndDate'>>, d: CarnetDB = defaultDb) {
  await patchOnboarding(id, (o) => ({ ...o, ...patch }), d);
}

export async function setOnboardingCompleted(id: string, completed: boolean, d: CarnetDB = defaultDb) {
  await patchOnboarding(id, (o) => {
    const { completedAt: _c, ...rest } = o;
    return completed ? { ...rest, completedAt: now() } : rest;
  }, d);
}

/** Supprime un parcours et ses points de suivi encore planifiés (les points effectués restent). */
export async function deleteOnboarding(id: string, d: CarnetDB = defaultDb) {
  await d.transaction('rw', d.onboardings, d.meetings, async () => {
    const o = await d.onboardings.get(id);
    if (!o) return;
    await d.meetings.where('collaboratorId').equals(o.collaboratorId).filter((m) => m.kind === 'onboarding' && m.status === 'planned').delete();
    await d.onboardings.delete(id);
  });
}
