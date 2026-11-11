import { beforeEach, describe, expect, it } from 'vitest';
import { CarnetDB } from './db';
import { createExport, mergeAll, readSnapshot, replaceAll } from './backupIO';
import { checkImport } from '../domain/backupImport';
import { richSnapshot, collaborator } from '../test/fixtures';
import { SETTING } from './settings';

let n = 0;
let d: CarnetDB;
beforeEach(() => {
  d = new CarnetDB(`test-${n++}`);
});

describe('sauvegarde IndexedDB', () => {
  it('aller-retour complet base → fichier → nouvelle base, sans perte', async () => {
    await replaceAll(richSnapshot(), d);
    const text = JSON.stringify(await createExport(d));

    const other = new CarnetDB(`test-${n++}`);
    const check = await checkImport(text);
    await replaceAll(check.data, other);
    expect(await readSnapshot(other)).toEqual(await readSnapshot(d));
  });

  it("n'exporte pas les réglages propres à l'appareil et les conserve au remplacement", async () => {
    await d.settings.put({ key: SETTING.lastBackupAt, value: '2026-01-01T00:00:00Z', updatedAt: 'x' });
    const snap = await readSnapshot(d);
    expect(snap.settings.find((s) => s.key === SETTING.lastBackupAt)).toBeUndefined();
    await replaceAll(richSnapshot(), d);
    expect((await d.settings.get(SETTING.lastBackupAt))?.value).toBe('2026-01-01T00:00:00Z');
  });

  it('fusionne sans écraser les éléments locaux', async () => {
    await replaceAll(richSnapshot(), d);
    const incoming = richSnapshot();
    incoming.collaborators = [collaborator({ id: 'c9', firstName: 'Léa' })];
    const report = await mergeAll(incoming, d);
    expect(report.added).toBe(1);
    expect(await d.collaborators.count()).toBe(3);
  });
});
