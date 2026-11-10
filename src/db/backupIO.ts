/**
 * Pont entre la base IndexedDB et le format de sauvegarde (domain/backup.ts).
 */
import { db, type CarnetDB } from './db';
import { emptySnapshot, TABLE_NAMES, type Snapshot } from './types';
import { LOCAL_ONLY_SETTINGS, SETTING } from './settings';
import { buildExport, mergeSnapshots, type ExportFile, type MergeReport } from '../domain/backup';

const tables = (d: CarnetDB) => TABLE_NAMES.map((t) => d.table(t));

/** Lit toute la base (hors réglages propres à l'appareil). */
export async function readSnapshot(d: CarnetDB = db): Promise<Snapshot> {
  const snap = emptySnapshot() as unknown as Record<string, unknown[]>;
  await d.transaction('r', tables(d), async () => {
    for (const t of TABLE_NAMES) snap[t] = await d.table(t).toArray();
  });
  const s = snap as unknown as Snapshot;
  s.settings = s.settings.filter((x) => !LOCAL_ONLY_SETTINGS.includes(x.key));
  return s;
}

export async function hasAnyData(d: CarnetDB = db): Promise<boolean> {
  return (await d.collaborators.count()) > 0 || (await d.entries.count()) > 0;
}

export async function createExport(d: CarnetDB = db): Promise<ExportFile> {
  return buildExport(await readSnapshot(d), __APP_VERSION__);
}

export async function markBackupDone(d: CarnetDB = db): Promise<void> {
  await d.settings.put({ key: SETTING.lastBackupAt, value: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

/** Remplace tout le contenu par `data` (les réglages propres à l'appareil sont conservés). */
export async function replaceAll(data: Snapshot, d: CarnetDB = db): Promise<void> {
  await d.transaction('rw', tables(d), async () => {
    for (const t of TABLE_NAMES) {
      if (t === 'settings') {
        await d.settings.where('key').noneOf(LOCAL_ONLY_SETTINGS).delete();
        await d.settings.bulkPut(data.settings.filter((x) => !LOCAL_ONLY_SETTINGS.includes(x.key)));
      } else {
        await d.table(t).clear();
        await d.table(t).bulkPut(data[t] as unknown[]);
      }
    }
  });
}

/** Fusionne `data` avec le contenu actuel (la version la plus récente de chaque élément gagne). */
export async function mergeAll(data: Snapshot, d: CarnetDB = db): Promise<MergeReport> {
  const incoming = { ...data, settings: data.settings.filter((x) => !LOCAL_ONLY_SETTINGS.includes(x.key)) };
  const local = await readSnapshot(d);
  const { data: merged, report } = mergeSnapshots(local, incoming);
  await d.transaction('rw', tables(d), async () => {
    for (const t of TABLE_NAMES) await d.table(t).bulkPut(merged[t] as unknown[]);
  });
  return report;
}
