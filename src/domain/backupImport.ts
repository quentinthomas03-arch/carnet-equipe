/**
 * Vérification d'un fichier de sauvegarde à l'import (format, empreinte, effectifs, migration,
 * structure, références). Module séparé : la bibliothèque de validation (zod) n'est chargée
 * qu'au moment d'un import, pas au démarrage de l'appli.
 */
import { z } from 'zod';
import { emptySnapshot, type Snapshot, type TableName } from '../db/types';
import { migrateData } from '../db/migrations';
import { countRecords, EXPORT_FORMAT, sha256Hex, stableStringify } from './backup';

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

