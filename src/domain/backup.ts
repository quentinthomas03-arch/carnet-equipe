/**
 * Sauvegarde : format du fichier d'export, vérification d'intégrité, fusion.
 *
 * Ce module est « pur » (aucun accès à la base) pour être testé facilement.
 * La lecture/écriture dans IndexedDB est dans db/backupIO.ts.
 */
import { emptySnapshot, TABLE_NAMES, type Snapshot, type TableName } from '../db/types';
import { SCHEMA_VERSION } from '../db/migrations';

export const EXPORT_FORMAT = 'carnet-equipe';

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  /** Nombre d'enregistrements par table (lisible par un humain, vérifié à l'import). */
  counts: Record<TableName, number>;
  /** Empreinte SHA-256 de { schemaVersion, data } : détecte un fichier tronqué ou modifié. */
  checksum: string;
  data: Snapshot;
}

/** JSON.stringify avec clés triées : même contenu → même texte → même empreinte. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function countRecords(data: Snapshot): Record<TableName, number> {
  return Object.fromEntries(TABLE_NAMES.map((t) => [t, data[t].length])) as Record<TableName, number>;
}

export async function buildExport(data: Snapshot, appVersion: string, now = new Date()): Promise<ExportFile> {
  const checksum = await sha256Hex(stableStringify({ schemaVersion: SCHEMA_VERSION, data }));
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    counts: countRecords(data),
    checksum,
    data,
  };
}

export function exportFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `carnet-equipe-${d}.json`;
}

// --- Fusion ----------------------------------------------------------------

export interface MergeReport {
  added: number;
  updated: number;
  unchanged: number;
}

function keyOf(table: TableName, r: Record<string, unknown>): string {
  return String(table === 'settings' ? r.key : r.id);
}

/**
 * Fusionne `incoming` dans `local` : les nouveaux enregistrements sont ajoutés,
 * ceux qui existent des deux côtés gardent la version la plus récemment modifiée.
 * Rien n'est supprimé (une suppression faite sur un autre appareil n'est pas propagée).
 */
export function mergeSnapshots(local: Snapshot, incoming: Snapshot): { data: Snapshot; report: MergeReport } {
  const report: MergeReport = { added: 0, updated: 0, unchanged: 0 };
  const out = emptySnapshot() as unknown as Record<TableName, Record<string, unknown>[]>;
  for (const table of TABLE_NAMES) {
    const map = new Map<string, Record<string, unknown>>();
    for (const r of local[table] as unknown as Record<string, unknown>[]) map.set(keyOf(table, r), r);
    for (const r of incoming[table] as unknown as Record<string, unknown>[]) {
      const k = keyOf(table, r);
      const existing = map.get(k);
      if (!existing) {
        map.set(k, r);
        report.added++;
      } else if (String(r.updatedAt) > String(existing.updatedAt)) {
        map.set(k, r);
        report.updated++;
      } else {
        report.unchanged++;
      }
    }
    out[table] = [...map.values()];
  }
  return { data: out as unknown as Snapshot, report };
}
