import { describe, expect, it } from 'vitest';
import { buildExport, checkImport, ImportError, mergeSnapshots, stableStringify } from './backup';
import { richSnapshot, collaborator, entry } from '../test/fixtures';
import { emptySnapshot } from '../db/types';
import { migrateData, SCHEMA_VERSION } from '../db/migrations';

describe('stableStringify', () => {
  it("ne dépend pas de l'ordre des clés", () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }));
  });
  it('ignore les clés undefined', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe('export → import (aller-retour)', () => {
  it('restitue exactement les mêmes données', async () => {
    const data = richSnapshot();
    const file = await buildExport(data, '1.0.0', new Date('2026-03-01T10:00:00Z'));
    const text = JSON.stringify(file, null, 2);
    const check = await checkImport(text);
    expect(check.data).toEqual(data);
    expect(check.counts.entries).toBe(3);
    expect(check.file.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('accepte une base vide', async () => {
    const file = await buildExport(emptySnapshot(), '1.0.0');
    await expect(checkImport(JSON.stringify(file))).resolves.toMatchObject({ ok: true });
  });

  it('refuse un fichier modifié (empreinte)', async () => {
    const file = await buildExport(richSnapshot(), '1.0.0');
    file.data.entries[0].text = 'texte trafiqué';
    await expect(checkImport(JSON.stringify(file))).rejects.toThrow(/Empreinte/);
  });

  it('refuse un fichier tronqué', async () => {
    const text = JSON.stringify(await buildExport(richSnapshot(), '1.0.0'));
    await expect(checkImport(text.slice(0, text.length - 40))).rejects.toBeInstanceOf(ImportError);
  });

  it("refuse un fichier qui n'est pas une sauvegarde", async () => {
    await expect(checkImport('{"hello":"world"}')).rejects.toThrow(/pas une sauvegarde/);
  });

  it('refuse un fichier venant d’une version plus récente', async () => {
    const file = await buildExport(richSnapshot(), '1.0.0');
    const { sha256Hex } = await import('./backup');
    const future = { ...file, schemaVersion: SCHEMA_VERSION + 1 };
    future.checksum = await sha256Hex(stableStringify({ schemaVersion: future.schemaVersion, data: future.data }));
    await expect(checkImport(JSON.stringify(future))).rejects.toThrow(/plus récente/);
  });

  it('refuse une référence orpheline', async () => {
    const data = richSnapshot();
    data.entries.push(entry({ id: 'e9', collaboratorId: 'inconnu' }));
    const file = await buildExport(data, '1.0.0');
    await expect(checkImport(JSON.stringify(file))).rejects.toThrow(/orpheline/);
  });
});

describe('migrations', () => {
  it('applique les migrations dans l’ordre', () => {
    const migrations = {
      2: (d: Record<string, unknown[]>) => ({ ...d, entries: d.entries.map((e) => ({ ...(e as object), v2: true })) }),
      3: (d: Record<string, unknown[]>) => ({ ...d, entries: d.entries.map((e) => ({ ...(e as object), v3: true })) }),
    };
    const out = migrateData({ entries: [{ id: 'x' }] }, 1, migrations, 3);
    expect(out.entries[0]).toEqual({ id: 'x', v2: true, v3: true });
  });
  it('signale une migration manquante', () => {
    expect(() => migrateData({}, 1, {}, 2)).toThrow(/manquante/);
  });
});

describe('fusion', () => {
  it('ajoute les nouveaux, garde la version la plus récente, ne supprime rien', () => {
    const local = emptySnapshot();
    local.collaborators = [collaborator({ id: 'c1', firstName: 'Ancien', updatedAt: '2026-01-01T00:00:00Z' }), collaborator({ id: 'c3' })];
    const incoming = emptySnapshot();
    incoming.collaborators = [collaborator({ id: 'c1', firstName: 'Nouveau', updatedAt: '2026-02-01T00:00:00Z' }), collaborator({ id: 'c2' })];
    const { data, report } = mergeSnapshots(local, incoming);
    expect(data.collaborators.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(data.collaborators.find((c) => c.id === 'c1')!.firstName).toBe('Nouveau');
    expect(report).toEqual({ added: 1, updated: 1, unchanged: 0 });
  });

  it('garde la version locale si elle est plus récente', () => {
    const local = emptySnapshot();
    local.entries = [entry({ text: 'local', updatedAt: '2026-03-01T00:00:00Z' })];
    const incoming = emptySnapshot();
    incoming.entries = [entry({ text: 'ancien', updatedAt: '2026-01-01T00:00:00Z' })];
    const { data, report } = mergeSnapshots(local, incoming);
    expect(data.entries[0].text).toBe('local');
    expect(report.unchanged).toBe(1);
  });
});
