/**
 * Migrations des fichiers d'export.
 *
 * Un fichier exporté porte `schemaVersion`. À l'import, on applique dans l'ordre
 * toutes les migrations depuis cette version jusqu'à SCHEMA_VERSION, pour qu'une
 * vieille sauvegarde reste toujours restaurable.
 *
 * Exemple pour une future version 2 :
 *   MIGRATIONS[2] = (data) => ({
 *     ...data,
 *     entries: data.entries.map((e) => ({ ...e, tags: [] })),
 *   });
 */

export const SCHEMA_VERSION = 1;

type RawData = Record<string, unknown[]>;
type Migration = (data: RawData) => RawData;

/** MIGRATIONS[n] transforme des données de la version n-1 vers la version n. */
export const MIGRATIONS: Record<number, Migration> = {};

export function migrateData(data: RawData, fromVersion: number, migrations = MIGRATIONS, target = SCHEMA_VERSION): RawData {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error(`Version de schéma invalide : ${fromVersion}`);
  }
  if (fromVersion > target) {
    throw new Error(
      `Ce fichier vient d'une version plus récente de l'appli (schéma ${fromVersion} > ${target}). Mets l'appli à jour avant d'importer.`,
    );
  }
  let current = data;
  for (let v = fromVersion + 1; v <= target; v++) {
    const migrate = migrations[v];
    if (!migrate) throw new Error(`Migration manquante vers la version ${v}`);
    current = migrate(current);
  }
  return current;
}
