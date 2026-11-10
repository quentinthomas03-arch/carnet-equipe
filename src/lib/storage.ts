/**
 * Stockage persistant et détection du mode « installé ».
 *
 * Sur iPhone, Safari peut effacer les données d'un site peu visité ; une PWA ajoutée à
 * l'écran d'accueil en est protégée en pratique, et `navigator.storage.persist()` demande
 * explicitement au navigateur de ne pas effacer la base en cas de manque de place.
 * Aucune de ces protections n'est absolue : l'export régulier reste la vraie sauvegarde.
 */

export interface StorageStatus {
  /** L'appli est lancée depuis l'icône de l'écran d'accueil. */
  standalone: boolean;
  /** Le navigateur a accordé le stockage persistant (null = API indisponible). */
  persisted: boolean | null;
  usageBytes?: number;
  quotaBytes?: number;
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const status: StorageStatus = { standalone: isStandalone(), persisted: null };
  try {
    if (navigator.storage?.persisted) status.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      status.usageBytes = e.usage;
      status.quotaBytes = e.quota;
    }
  } catch {
    /* API indisponible : on garde les valeurs par défaut */
  }
  return status;
}

export function formatBytes(n?: number): string {
  if (n === undefined) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}
