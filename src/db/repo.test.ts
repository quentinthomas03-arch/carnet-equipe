import { beforeEach, describe, expect, it } from 'vitest';
import { CarnetDB } from './db';
import { createCollaborator, createEntries, postponeEntry, reopenEntry, resolveEntry, setArchived, updateEntry } from './repo';

let n = 0;
let d: CarnetDB;
beforeEach(() => {
  d = new CarnetDB(`repo-${n++}`);
});

const base = { firstName: 'Camille', lastName: 'Roux', role: '', site: 'Metz', activity: 'Bruit', cadenceDays: 30, color: 'teal' };

describe('saisie et suivi des entrées', () => {
  it('crée une copie indépendante par collaborateur', async () => {
    const ids = await createEntries({ collaboratorIds: ['c1', 'c2', 'team'], type: 'topic', text: '  Nouveau process  ' }, d);
    expect(ids).toHaveLength(3);
    const all = await d.entries.toArray();
    expect(new Set(all.map((e) => e.collaboratorId))).toEqual(new Set(['c1', 'c2', 'team']));
    expect(all.every((e) => e.text === 'Nouveau process' && e.status === 'open')).toBe(true);
    await resolveEntry(ids[0], d);
    expect((await d.entries.get(ids[1]))!.status).toBe('open');
  });

  it('refuse un texte vide', async () => {
    await expect(createEntries({ collaboratorIds: ['c1'], type: 'topic', text: '   ' }, d)).rejects.toThrow();
  });

  it('reporter garde le sujet en attente et compte les reports', async () => {
    const [id] = await createEntries({ collaboratorIds: ['c1'], type: 'topic', text: 'x' }, d);
    await postponeEntry(id, d);
    await postponeEntry(id, d);
    expect(await d.entries.get(id)).toMatchObject({ status: 'open', postponeCount: 2 });
  });

  it('marquer traité puis rouvrir', async () => {
    const [id] = await createEntries({ collaboratorIds: ['c1'], type: 'myCommitment', text: 'x', dueDate: '2026-11-20' }, d);
    await resolveEntry(id, d);
    expect((await d.entries.get(id))!.resolvedAt).toBeDefined();
    await reopenEntry(id, d);
    const e = (await d.entries.get(id))!;
    expect(e.status).toBe('open');
    expect(e.resolvedAt).toBeUndefined();
  });

  it('déplacer vers un autre collaborateur et retirer l’échéance', async () => {
    const [id] = await createEntries({ collaboratorIds: ['c1'], type: 'myCommitment', text: 'x', dueDate: '2026-11-20' }, d);
    const before = (await d.entries.get(id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await updateEntry(id, { collaboratorId: 'c2', dueDate: undefined }, d);
    const e = (await d.entries.get(id))!;
    expect(e.collaboratorId).toBe('c2');
    expect(e.dueDate).toBeUndefined();
    expect(e.updatedAt > before).toBe(true);
  });
});

describe('collaborateurs', () => {
  it('archive et réactive sans rien supprimer', async () => {
    const id = await createCollaborator(base, d);
    await createEntries({ collaboratorIds: [id], type: 'topic', text: 'x' }, d);
    await setArchived(id, true, d);
    expect((await d.collaborators.get(id))!.archivedAt).toBeDefined();
    await setArchived(id, false, d);
    expect((await d.collaborators.get(id))!.archivedAt).toBeUndefined();
    expect(await d.entries.count()).toBe(1);
  });
});
