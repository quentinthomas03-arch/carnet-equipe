/**
 * Sauvegarde : format du fichier d'export, vérification d'intégrité, fusion.
 *
 * Ce module est « pur » (aucun accès à la base) pour être testé facilement.
 * La lecture/écriture dans IndexedDB est dans db/backupIO.ts.
 */
import { z } from 'zod';
import { emptySnapshot, TABLE_NAMES, type Snapshot, type TableName } from '../db/types';
import { migrateData, SCHEMA_VERSION } from '../db/migrations';

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

function countRecords(data: Snapshot): Record<TableName, number> {
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

// --- Validation à l'import -------------------------------------------------

const record = z.object({ id: z.string().min(1), createdAt: z.string(), updatedAt: z.string() }).passthrough();
const settingRecord = z.object({ key: z.string().min(1), updatedAt: z.string() }).passthrough();

const collaborator = record.extend({
  firstName: z.string(),
  cadenceDays: z.number().int().positive(),
});
const entry = record.extend({
  collaboratorId: z.string().min(1),
  type: z.enum(['topic', 'myCommitment', 'theirCommitment', 'success', 'alert']),
  text: z.string(),
  status: z.enum(['open', 'done', 'postponed', 'dropped']),
});
const withCollaborator = record.extend({ collaboratorId: z.string().min(1) });

const snapshotSchema = z.object({
  collaborators: z.array(collaborator),
  entries: z.array(entry),
  meetings: z.array(withCollaborator),
  objectives: z.array(withCollaborator),
  skills: z.array(withCollaborator),
  developmentPlans: z.array(withCollaborator),
  onboardingTemplates: z.array(record),
  onboardings: z.array(withCollaborator),
  objectiveTemplates: z.array(record),
  settings: z.array(settingRecord),
});

const headerSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string(),
  counts: z.record(z.number()).optional(),
  checksum: z.string().length(64),
  data: z.record(z.array(z.unknown())),
});

export interface ImportCheck {
  ok: true;
  file: { exportedAt: string; schemaVersion: number; appVersion?: string };
  /** Données migrées vers le schéma courant et validées. */
  data: Snapshot;
  counts: Record<TableName, number>;
}

export class ImportError extends Error {}

/**
 * Lit et vérifie un fichier d'export :
 * format reconnu → empreinte intacte → nombre d'enregistrements cohérent →
 * migration vers le schéma courant → validation de la structure → références cohérentes.
 */
export async function checkImport(text: string): Promise<ImportCheck> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError("Ce fichier n'est pas un JSON lisible (fichier abîmé ou mauvais fichier).");
  }
  const header = headerSchema.safeParse(raw);
  if (!header.success) {
    throw new ImportError("Ce fichier n'est pas une sauvegarde du Carnet d'équipe.");
  }
  const h = header.data;

  const expected = await sha256Hex(stableStringify({ schemaVersion: h.schemaVersion, data: h.data }));
  if (expected !== h.checksum) {
    throw new ImportError('Empreinte invalide : le fichier a été modifié ou tronqué. Import annulé, rien n’a changé.');
  }
  if (h.counts) {
    for (const [table, n] of Object.entries(h.counts)) {
      const actual = (h.data[table] ?? []).length;
      if (actual !== n) throw new ImportError(`Nombre d'enregistrements incohérent pour « ${table} ».`);
    }
  }

  // Tables absentes (fichier ancien) → tableaux vides, puis migration.
  const filled = { ...emptySnapshot(), ...h.data } as Record<string, unknown[]>;
  const migrated = migrateData(filled, h.schemaVersion);

  const parsed = snapshotSchema.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ImportError(`Structure invalide (${issue.path.join('.')} : ${issue.message}).`);
  }
  const data = parsed.data as unknown as Snapshot;

  // Chaque élément doit pointer vers un collaborateur existant (ou l'équipe).
  const ids = new Set(data.collaborators.map((c) => c.id));
  ids.add('team');
  for (const t of ['entries', 'meetings', 'objectives', 'skills', 'developmentPlans', 'onboardings'] as const) {
    for (const r of data[t]) {
      if (!ids.has(r.collaboratorId)) {
        throw new ImportError(`Référence orpheline dans « ${t} » : collaborateur introuvable.`);
      }
    }
  }

  return {
    ok: true,
    file: { exportedAt: h.exportedAt, schemaVersion: h.schemaVersion, appVersion: h.appVersion },
    data,
    counts: countRecords(data),
  };
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
