/**
 * Partage d'un fichier via le menu de partage iOS (Enregistrer dans Fichiers, AirDrop, Mail…).
 *
 * Safari n'autorise `navigator.share` que juste après un tap : le fichier doit donc être
 * préparé AVANT (premier tap), puis partagé au second tap, sans attente intermédiaire.
 */
export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export function makeFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

export async function shareOrDownload(file: File, title: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // Autre erreur : on retombe sur le téléchargement.
    }
  }
  download(file);
  return 'downloaded';
}

export function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
