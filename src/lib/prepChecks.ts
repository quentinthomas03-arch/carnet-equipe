/**
 * Cases cochées pendant un point : gardées sur l'appareil (localStorage) pour ne rien perdre
 * si l'appli est fermée en plein entretien. Effacées après le débrief.
 */
const key = (collaboratorId: string) => `carnet:prep:${collaboratorId}`;

export function loadChecks(collaboratorId: string): string[] {
  try {
    const raw = localStorage.getItem(key(collaboratorId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveChecks(collaboratorId: string, ids: string[]): void {
  try {
    localStorage.setItem(key(collaboratorId), JSON.stringify(ids));
  } catch {
    /* stockage indisponible : les cases restent en mémoire */
  }
}

export function clearChecks(collaboratorId: string): void {
  try {
    localStorage.removeItem(key(collaboratorId));
  } catch {
    /* rien à faire */
  }
}
