/**
 * Règles sur les entrées (à aborder, engagements, réussites, alertes).
 */
import type { DateISO, Entry, EntryType } from '../db/types';
import { addDaysISO, daysBetween } from './dates';

export const ENTRY_TYPES: EntryType[] = ['topic', 'myCommitment', 'theirCommitment', 'success', 'alert'];

export const ENTRY_LABELS: Record<EntryType, string> = {
  topic: 'À aborder',
  myCommitment: 'Mon engagement',
  theirCommitment: 'Son engagement',
  success: 'Réussite',
  alert: "Point d'alerte",
};

/** Libellé court pour les listes. */
export const ENTRY_SHORT: Record<EntryType, string> = {
  topic: 'Sujet',
  myCommitment: 'Moi',
  theirCommitment: 'Lui/elle',
  success: 'Réussite',
  alert: 'Alerte',
};

export const isCommitment = (t: EntryType) => t === 'myCommitment' || t === 'theirCommitment';

/** Une entrée est « en attente » tant qu'elle n'est ni traitée ni abandonnée. */
export const isPending = (e: Entry) => e.status === 'open' || e.status === 'postponed';

export type DueState = 'none' | 'late' | 'today' | 'soon' | 'later';

/** État d'échéance d'une entrée en attente. « soon » = dans les 7 prochains jours. */
export function dueState(e: Pick<Entry, 'dueDate' | 'status'>, today: DateISO): DueState {
  if (!e.dueDate || !(e.status === 'open' || e.status === 'postponed')) return 'none';
  const d = daysBetween(today, e.dueDate);
  if (d < 0) return 'late';
  if (d === 0) return 'today';
  if (d <= 7) return 'soon';
  return 'later';
}

/** Statut d'un engagement tel qu'affiché : à faire / fait / en retard. */
export function commitmentStatus(e: Entry, today: DateISO): 'todo' | 'done' | 'late' | 'dropped' {
  if (e.status === 'done') return 'done';
  if (e.status === 'dropped') return 'dropped';
  return dueState(e, today) === 'late' ? 'late' : 'todo';
}

export function daysLate(e: Entry, today: DateISO): number {
  return e.dueDate ? Math.max(0, daysBetween(e.dueDate, today)) : 0;
}

/** Raccourcis d'échéance proposés dans la saisie rapide. */
export function dueShortcuts(today: DateISO): { label: string; date: DateISO }[] {
  const d = new Date(`${today}T12:00:00`);
  const dow = d.getDay(); // 0 = dimanche
  const toFriday = ((5 - dow + 7) % 7) || 7;
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const eom = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
  return [
    { label: 'Demain', date: addDaysISO(today, 1) },
    { label: 'Vendredi', date: addDaysISO(today, toFriday) },
    { label: '1 semaine', date: addDaysISO(today, 7) },
    { label: 'Fin du mois', date: eom === today ? addDaysISO(today, 30) : eom },
  ];
}
