/**
 * Opérations d'écriture sur la base. Toutes mettent à jour `updatedAt`
 * (indispensable pour la fusion lors d'un import).
 */
import { db as defaultDb, type CarnetDB } from './db';
import type { Collaborator, DateISO, Entry, EntryType } from './types';

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
