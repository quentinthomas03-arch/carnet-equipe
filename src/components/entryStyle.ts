import type { EntryType } from '../db/types';

/** Couleur d'étiquette par type d'entrée (classes Tailwind du design système). */
export const TYPE_TONE: Record<EntryType, string> = {
  topic: 'bg-surface-2 text-ink',
  myCommitment: 'bg-accent-soft text-accent-soft-ink',
  theirCommitment: 'bg-surface-2 text-ink',
  success: 'bg-ok-soft text-ok',
  alert: 'bg-warn-soft text-warn',
};

/** Libellé de l'action « traiter » selon le type. */
export const RESOLVE_LABEL: Record<EntryType, string> = {
  topic: 'Abordé',
  myCommitment: 'Fait',
  theirCommitment: 'Fait',
  success: 'Félicité',
  alert: 'Traité',
};
