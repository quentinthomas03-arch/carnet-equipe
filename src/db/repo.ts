/**
 * Opérations d'écriture sur la base. Toutes mettent à jour `updatedAt`
 * (indispensable pour la fusion lors d'un import).
 */
import { db as defaultDb, type CarnetDB } from './db';
import type { Collaborator, DateISO, Entry, EntryType, Meeting } from './types';
import { planDebrief, type DebriefInput } from '../domain/meetingPrep';

export const newId = () => crypto.randomUUID();
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
  await d.transaction('rw', d.meetings, d.entries, d.collaborators, async () => {
    const meeting: Meeting = {
      id: meetingId,
      createdAt: t,
      updatedAt: t,
      collaboratorId: input.collaboratorId,
      kind: 'regular',
      date: input.date,
      status: 'done',
      decisions: input.decisions.trim(),
      note: input.note.trim(),
      ...(input.workload ? { workload: input.workload } : {}),
      coveredEntryIds: plan.resolve,
      postponedEntryIds: plan.postpone,
    };
    await d.meetings.add(meeting);
    for (const id of plan.resolve) await d.entries.update(id, { status: 'done', resolvedAt: t, meetingId, updatedAt: t });
    for (const id of plan.postpone) {
      const e = await d.entries.get(id);
      if (e) await d.entries.put({ ...e, status: 'open', postponeCount: e.postponeCount + 1, updatedAt: t });
    }
    const fresh = input.newCommitments.filter((c) => c.text.trim());
    await d.entries.bulkAdd(
      fresh.map((c) => ({
        id: newId(), createdAt: t, updatedAt: t, collaboratorId: input.collaboratorId, type: c.type, text: c.text.trim(),
        ...(c.dueDate ? { dueDate: c.dueDate } : {}), status: 'open' as const, postponeCount: 0, meetingId,
      })),
    );
    const col = await d.collaborators.get(input.collaboratorId);
    if (col) {
      const { nextMeetingDate: _n, ...rest } = col;
      await d.collaborators.put(input.nextMeetingDate ? { ...rest, nextMeetingDate: input.nextMeetingDate, updatedAt: t } : { ...rest, updatedAt: t });
    }
  });
  return meetingId;
}

export async function updateMeeting(id: string, patch: Partial<Pick<Meeting, 'date' | 'decisions' | 'note' | 'workload'>>, d: CarnetDB = defaultDb) {
  await d.meetings.update(id, { ...patch, updatedAt: now() });
}

/** Supprime un point de l'historique (les entrées traitées restent traitées). */
export async function deleteMeeting(id: string, d: CarnetDB = defaultDb) {
  await d.meetings.delete(id);
}
