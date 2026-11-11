/**
 * Utilitaires de dates calendrier (AAAA-MM-JJ), sans fuseau horaire.
 * On travaille en heure locale du téléphone : « aujourd'hui » = la date affichée sur l'iPhone.
 */
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateISO } from '../db/types';

export function toDateISO(d: Date): DateISO {
  return format(d, 'yyyy-MM-dd');
}

export function todayISO(now = new Date()): DateISO {
  return toDateISO(now);
}

export function parseDate(d: DateISO): Date {
  return parseISO(d);
}

/** Décale un samedi ou un dimanche au lundi suivant (jours ouvrés). */
export function toWeekday(d: DateISO): DateISO {
  const day = parseISO(d).getDay();
  return day === 6 ? addDaysISO(d, 2) : day === 0 ? addDaysISO(d, 1) : d;
}

export function addDaysISO(d: DateISO, days: number): DateISO {
  return toDateISO(addDays(parseISO(d), days));
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function daysBetween(from: DateISO, to: DateISO): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

/** « 12 nov. » ou « 12 nov. 2025 » si l'année diffère de l'année en cours. */
export function formatShort(d: DateISO, now = new Date()): string {
  const date = parseISO(d);
  return format(date, date.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy', { locale: fr });
}

/** « mardi 10 novembre » */
export function formatLong(d: DateISO): string {
  return format(parseISO(d), 'EEEE d MMMM', { locale: fr });
}
